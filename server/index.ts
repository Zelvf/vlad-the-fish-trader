import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { Store } from './store.js';
import { SignalEngine, type Observation } from './signal-engine.js';
import { refreshTwelveData } from './market-data.js';

const app = express();
const store = new Store(config.databasePath, config.mode, config.startingCash);
const signal = new SignalEngine(config.dwellMs, config.cooldownMs);
const clients = new Set<express.Response>();
const snapshot = () => store.snapshot(signal, config);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function broadcast(): void {
  if (clients.size === 0) return;
  const packet = `event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`;
  for (const response of clients) response.write(packet);
}

function tokenMatches(value: string | undefined): boolean {
  if (!config.ingestToken || !value?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(value.slice(7));
  const expected = Buffer.from(config.ingestToken);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, mode: config.mode, timestamp: new Date().toISOString(),
    cameraConnected: signal.state().cameraConnected, quoteCount: store.quotes().length,
    streamConfigured: Boolean(config.youtubeVideoId) });
});

app.get('/api/snapshot', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json(snapshot());
});

app.get('/api/stream', (request, response) => {
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();
  response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
  clients.add(response);
  request.on('close', () => clients.delete(response));
});

app.post('/api/ingest/observation', (request, response) => {
  if (!config.ingestToken) {
    response.status(503).json({ error: 'Observation ingest is disabled. Set INGEST_TOKEN.' });
    return;
  }
  if (!tokenMatches(request.header('authorization'))) {
    response.status(401).json({ error: 'Invalid ingest token.' });
    return;
  }
  const body = request.body as Partial<Observation> | null;
  const x = body?.x;
  const y = body?.y;
  const confidence = body?.confidence;
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1 ||
    typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1 ||
    typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    response.status(400).json({ error: 'x, y and confidence must be numbers from 0 to 1.' });
    return;
  }
  if (body?.observedAt) {
    const distance = Date.now() - Date.parse(body.observedAt);
    if (!Number.isFinite(distance) || distance > 10_000 || distance < -5_000) {
      response.status(400).json({ error: 'Observation timestamp is outside the allowed window.' });
      return;
    }
  }
  const event = signal.ingest({ x, y, confidence, observedAt: body?.observedAt });
  if (event.selection) store.addActivity('selection', `Vlad selected ${event.selection}. Waiting for an action zone.`);
  if (event.decision) {
    const { symbol, side } = event.decision;
    const quote = store.quote(symbol);
    const quoteAge = quote ? Date.now() - Date.parse(quote.observedAt) : Infinity;
    let reason: string | null = null;
    if (!quote) reason = 'no price is available';
    else if (quoteAge > config.maxQuoteAgeMs || quoteAge < -5_000) reason = 'the price is stale';
    else if (config.mode === 'live' && !quote.marketOpen) reason = 'the market is closed';
    if (reason) store.addActivity('skip', `${side} ${symbol} skipped: ${reason}.`);
    else {
      const trade = store.recordTrade(symbol, side, quote!.price, config.orderNotional, 'camera');
      if (trade) store.addActivity('trade', `Vlad ${side === 'BUY' ? 'bought' : 'sold'} ${symbol} for $${trade.notional.toFixed(2)} in the paper portfolio.`);
      else store.addActivity('skip', `${side} ${symbol} skipped: insufficient ${side === 'BUY' ? 'virtual cash' : 'shares'}.`);
    }
  }
  broadcast();
  response.json({ accepted: true, signal: signal.state(), event });
});

const clientDir = path.resolve('dist/client');
app.use('/docs', express.static(path.resolve('docs'), { index: false, extensions: ['md'] }));
if (fs.existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir, { maxAge: '1h', index: false }));
  app.get('/{*path}', (_request, response) => response.sendFile(path.join(clientDir, 'index.html')));
}

const server = app.listen(config.port, config.host, () => {
  console.log(`Vlad paper-trading server: http://${config.host}:${config.port} (${config.mode})`);
  if (!config.ingestToken) console.log('Observation ingest disabled until INGEST_TOKEN is set.');
  if (!config.youtubeVideoId) console.log('YouTube Live video ID not configured; site displays a temporary still.');
});

const publishTimer = setInterval(broadcast, 1000);
let quoteRefreshRunning = false;
async function refreshQuotes(): Promise<void> {
  if (quoteRefreshRunning) return;
  quoteRefreshRunning = true;
  try {
    if (config.mode === 'demo') store.updateScenarioQuotes();
    else if (config.marketProvider === 'twelvedata' && config.twelveDataKey) {
      const result = await refreshTwelveData(store, config.twelveDataKey);
      if (result.errors.length) console.warn(`Quote refresh: ${result.updated} updated; ${result.errors.join('; ')}`);
    }
    broadcast();
  } catch (error) { console.error('Quote refresh failed:', error); }
  finally { quoteRefreshRunning = false; }
}
void refreshQuotes();
const quoteTimer = setInterval(() => { void refreshQuotes(); }, config.quotePollMs);

function shutdown(): void {
  clearInterval(publishTimer);
  clearInterval(quoteTimer);
  for (const response of clients) response.end();
  server.close(() => { store.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
