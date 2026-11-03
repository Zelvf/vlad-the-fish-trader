import path from 'node:path';

try { process.loadEnvFile('.env'); } catch { /* Environment variables may be supplied by the host. */ }

const positive = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mode = process.env.APP_MODE === 'live' ? 'live' : 'demo';
const marketProvider = process.env.MARKET_DATA_PROVIDER === 'coingecko' ? 'coingecko' : 'none';
const youtubeId = process.env.YOUTUBE_LIVE_VIDEO_ID?.trim() || null;
const quotePollMs = Math.max(300_000, positive('QUOTE_POLL_MS', 300_000));

export const config = {
  mode,
  port: positive('PORT', 8787),
  host: process.env.HOST?.trim() || '127.0.0.1',
  databasePath: path.resolve(process.env.DATABASE_PATH || './data/vlad-memecoins.sqlite'),
  youtubeVideoId: youtubeId && /^[\w-]{11}$/.test(youtubeId) ? youtubeId : null,
  ingestToken: process.env.INGEST_TOKEN?.trim() || null,
  marketProvider,
  coinGeckoKey: process.env.COINGECKO_DEMO_API_KEY?.trim() || null,
  quotePollMs,
  startingCash: positive('STARTING_CASH', 10_000),
  orderNotional: positive('ORDER_NOTIONAL', 500),
  dwellMs: positive('DWELL_MS', 5000),
  cooldownMs: positive('TRADE_COOLDOWN_MS', 30_000),
  maxQuoteAgeMs: Math.max(quotePollMs + 60_000, positive('MAX_QUOTE_AGE_MS', 600_000)),
} as const;
