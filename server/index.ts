import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { Store } from './store.js';
import { SignalEngine, type Observation } from './signal-engine.js';
import { refreshCoinGecko } from './market-data.js';
import { validateAdminTrade, validateQuote, validateRules, validateSite } from '../shared/admin.js';
import { adminConfigured, clearSessionCookie, originAllowed, passwordMatches, sessionCookie, sessionValid } from './admin-auth.js';

const app = express();
const store = new Store(config.databasePath, config.mode, config.startingCash);
const initialRules = store.rules(config);
const signal = new SignalEngine(initialRules.dwellMs, initialRules.cooldownMs);
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
    cameraConnected: signal.state().cameraConnected, quoteCount: store.quotes().length, quoteProvider: config.marketProvider,
    streamConfigured: Boolean(store.site(config.youtubeVideoId).youtubeVideoId) });
});

const loginAttempts = new Map<string, { count: number; started: number; lockedUntil: number }>();
const adminSecure = (request: express.Request) => request.secure || request.get('x-forwarded-proto') === 'https';
const adminJson = (response: express.Response, status: number, body: unknown) => {
  response.setHeader('Cache-Control', 'no-store');
  response.status(status).json(body);
};

app.get('/api/admin', (request, response) => {
  if (!adminConfigured()) return adminJson(response, 503, { configured: false, error: 'Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server.' });
  if (!sessionValid(request.get('cookie'), adminSecure(request))) return adminJson(response, 200, { configured: true, authenticated: false });
  return adminJson(response, 200, { configured: true, authenticated: true, storage: 'SQLite ledger', snapshot: snapshot() });
});

app.post('/api/admin', (request, response) => {
  if (!adminConfigured()) return adminJson(response, 503, { configured: false, error: 'Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server.' });
  if (!originAllowed(request.get('origin'), request.get('host'))) return adminJson(response, 403, { error: 'Request origin is not allowed.' });
  const body = request.body as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return adminJson(response, 400, { error: 'Send a JSON object.' });
  const secure = adminSecure(request);
  if (body.action === 'login') {
    const key = request.ip || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (entry && entry.lockedUntil > now) return adminJson(response, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    if (!passwordMatches(body.password)) {
      const count = entry && now - entry.started < 15 * 60_000 ? entry.count + 1 : 1;
      loginAttempts.set(key, { count, started: count === 1 ? now : entry!.started, lockedUntil: count >= 5 ? now + 15 * 60_000 : 0 });
      return adminJson(response, 401, { error: 'Incorrect password.' });
    }
    loginAttempts.delete(key);
    response.setHeader('Set-Cookie', sessionCookie(secure));
    return adminJson(response, 200, { ok: true });
  }
  if (body.action === 'logout') {
    response.setHeader('Set-Cookie', clearSessionCookie(secure));
    return adminJson(response, 200, { ok: true });
  }
  if (!sessionValid(request.get('cookie'), secure)) return adminJson(response, 401, { error: 'Sign in to make changes.' });
  try {
    if (body.action === 'saveSite') {
      store.setSite(validateSite(body.site));
      broadcast();
      return adminJson(response, 200, { ok: true });
    }
    if (body.action === 'saveRules') {
      const rules = validateRules(body.rules);
      store.setRules(rules);
      signal.configure(rules.dwellMs, rules.cooldownMs);
      broadcast();
      return adminJson(response, 200, { ok: true });
    }
    if (body.action === 'saveQuote') {
      if (config.mode !== 'demo') return adminJson(response, 409, { error: 'Manual prices are available in demo mode only.' });
      const { symbol, price } = validateQuote(body.quote);
      store.setScenarioPrice(symbol, price);
      broadcast();
      return adminJson(response, 200, { ok: true });
    }
    if (body.action === 'addTrade') {
      const { symbol, side, notional } = validateAdminTrade(body.trade);
      const quote = store.quote(symbol);
      if (!quote) return adminJson(response, 400, { error: 'No price exists for that coin.' });
      if (config.mode === 'live' && Date.now() - Date.parse(quote.observedAt) > config.maxQuoteAgeMs) {
        return adminJson(response, 400, { error: 'The reference price is stale.' });
      }
      const trade = store.recordTrade(symbol, side, quote.price, notional, 'admin');
      if (!trade) return adminJson(response, 400, { error: 'Insufficient cash or coin units for this entry.' });
      store.addActivity('trade', `Admin recorded a ${side} ${symbol} trade for $${trade.notional.toFixed(2)}.`);
      broadcast();
      return adminJson(response, 200, { ok: true });
    }
    return adminJson(response, 400, { error: 'Unknown admin action.' });
  } catch (error) { return adminJson(response, 400, { error: (error as Error).message }); }
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
    if (reason) store.addActivity('skip', `${side} ${symbol} skipped: ${reason}.`);
    else {
      const trade = store.recordTrade(symbol, side, quote!.price, store.rules(config).orderNotional, 'camera');
      if (trade) store.addActivity('trade', `Vlad ${side === 'BUY' ? 'bought' : 'sold'} ${symbol} for $${trade.notional.toFixed(2)} in the account ledger.`);
      else store.addActivity('skip', `${side} ${symbol} skipped: insufficient ${side === 'BUY' ? 'cash balance' : 'coin units'}.`);
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
  console.log(`Vlad trading experiment server: http://${config.host}:${config.port} (${config.mode})`);
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
    else if (config.marketProvider === 'coingecko') {
      const result = await refreshCoinGecko(store, config.coinGeckoKey);
      if (result.errors.length) console.warn(`Quote refresh: ${result.updated} updated; ${result.errors.join('; ')}`);
    }
    broadcast();
  } catch (error) { console.error('Quote refresh failed:', error); }
  finally { quoteRefreshRunning = false; }
}
void refreshQuotes();
const quoteTimer = setInterval(() => { void refreshQuotes(); }, config.mode === 'demo' ? 60_000 : config.quotePollMs);

function shutdown(): void {
  clearInterval(publishTimer);
  clearInterval(quoteTimer);
  for (const response of clients) response.end();
  server.close(() => { store.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
