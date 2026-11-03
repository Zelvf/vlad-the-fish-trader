import { neon } from '@neondatabase/serverless';
import { DEFAULT_RULES, DEFAULT_SITE, validateRules, validateSite, type SiteSettings, type TradingRules } from '../shared/admin.js';
import { SYMBOLS, type SymbolCode, type TradeSide } from '../shared/catalog.js';
import type { Snapshot } from '../shared/types.js';
import { SignalEngine } from './signal-engine.js';
import { Store } from './store.js';

interface AdminTradeRow {
  id: number;
  symbol: SymbolCode;
  side: TradeSide;
  price: number;
  notional: number;
  executedAt: string;
}

export interface PreviewData {
  site: SiteSettings;
  rules: TradingRules;
  quoteOverrides: Partial<Record<SymbolCode, number>>;
  adminTrades: AdminTradeRow[];
  revision: number;
}

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  return neon(process.env.DATABASE_URL);
}

let schemaReady: Promise<void> | null = null;
export function ensurePreviewSchema(): Promise<void> {
  if (!schemaReady) schemaReady = (async () => {
    const sql = db();
    await sql`CREATE TABLE IF NOT EXISTS preview_settings (
      id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 0
    )`;
    await sql`CREATE TABLE IF NOT EXISTS preview_quotes (
      symbol text PRIMARY KEY, price double precision NOT NULL CHECK (price > 0), updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS preview_trades (
      id bigserial PRIMARY KEY, symbol text NOT NULL, side text NOT NULL,
      price double precision NOT NULL CHECK (price > 0), notional double precision NOT NULL CHECK (notional > 0),
      executed_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS admin_login_attempts (
      client_key text PRIMARY KEY, failures integer NOT NULL,
      window_started timestamptz NOT NULL, locked_until timestamptz
    )`;
    await sql`INSERT INTO preview_settings (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING`;
  })().catch((error: unknown) => { schemaReady = null; throw error; });
  return schemaReady;
}

export async function loadPreviewData(): Promise<PreviewData> {
  await ensurePreviewSchema();
  const sql = db();
  const [settings, quotes, trades] = await Promise.all([
    sql`SELECT data, revision FROM preview_settings WHERE id = 1`,
    sql`SELECT symbol, price FROM preview_quotes`,
    sql`SELECT id, symbol, side, price, notional, executed_at FROM preview_trades ORDER BY id ASC`,
  ]);
  const row = settings[0] as { data: Record<string, unknown>; revision: string | number };
  let site = DEFAULT_SITE;
  let rules = DEFAULT_RULES;
  try { if (row.data.site) site = validateSite(row.data.site); } catch { /* Ignore invalid stored content. */ }
  try { if (row.data.rules) rules = validateRules(row.data.rules); } catch { /* Ignore invalid stored rules. */ }
  const quoteOverrides: PreviewData['quoteOverrides'] = {};
  for (const quote of quotes as Array<{ symbol: string; price: number }>) {
    const symbol = SYMBOLS.find((entry) => entry.symbol === quote.symbol)?.symbol;
    if (symbol && Number(quote.price) > 0) quoteOverrides[symbol] = Number(quote.price);
  }
  const adminTrades: AdminTradeRow[] = (trades as Array<Record<string, unknown>>).flatMap((trade) => {
    const symbol = SYMBOLS.find((entry) => entry.symbol === trade.symbol)?.symbol;
    if (!symbol || (trade.side !== 'BUY' && trade.side !== 'SELL')) return [];
    return [{ id: Number(trade.id), symbol, side: trade.side,
      price: Number(trade.price), notional: Number(trade.notional),
      executedAt: new Date(String(trade.executed_at)).toISOString() }];
  });
  return { site, rules, quoteOverrides, adminTrades, revision: Number(row.revision) };
}

function openPreviewStore(data: PreviewData): Store {
  const store = new Store(':memory:', 'demo', 10_000);
  try {
    const now = new Date().toISOString();
    for (const [symbol, price] of Object.entries(data.quoteOverrides)) {
      const quote = store.quote(symbol as SymbolCode);
      if (quote && price && price > 0) store.upsertQuote({ ...quote, price, observedAt: now, source: 'scenario' });
    }
    for (const trade of data.adminTrades) {
      const filled = store.recordTrade(trade.symbol, trade.side, trade.price, trade.notional, 'admin', trade.executedAt);
      if (filled) store.addActivity('trade', `Admin recorded a ${trade.side} ${trade.symbol} paper trade for $${filled.notional.toFixed(2)}.`, trade.executedAt);
    }
    if (data.adminTrades.length) store.recordEquity(now);
    return store;
  } catch (error) { store.close(); throw error; }
}

export function buildPreviewSnapshot(data: PreviewData): Snapshot {
  const store = openPreviewStore(data);
  try {
    const snapshot = store.snapshot(new SignalEngine(data.rules.dwellMs, data.rules.cooldownMs), {
      youtubeVideoId: data.site.youtubeVideoId,
      ...data.rules,
    });
    snapshot.site = data.site;
    snapshot.youtubeVideoId = data.site.youtubeVideoId;
    snapshot.rules = data.rules;
    snapshot.pricingLabel = 'Scenario prices · editable sample session';
    return snapshot;
  } finally {
    store.close();
  }
}

export function previewTradePrice(data: PreviewData, symbol: SymbolCode, side: TradeSide, notional: number): number | null {
  const store = openPreviewStore(data);
  try {
    const price = store.quote(symbol)?.price;
    return price && store.recordTrade(symbol, side, price, notional, 'admin') ? price : null;
  } finally { store.close(); }
}

export async function savePreviewSite(site: SiteSettings): Promise<void> {
  await ensurePreviewSchema();
  const sql = db();
  await sql`UPDATE preview_settings SET data = jsonb_set(data, '{site}', ${JSON.stringify(site)}::jsonb), revision = revision + 1 WHERE id = 1`;
}

export async function savePreviewRules(rules: TradingRules): Promise<void> {
  await ensurePreviewSchema();
  const sql = db();
  await sql`UPDATE preview_settings SET data = jsonb_set(data, '{rules}', ${JSON.stringify(rules)}::jsonb), revision = revision + 1 WHERE id = 1`;
}

export async function savePreviewQuote(symbol: SymbolCode, price: number): Promise<void> {
  await ensurePreviewSchema();
  const sql = db();
  await sql`INSERT INTO preview_quotes (symbol, price, updated_at) VALUES (${symbol}, ${price}, now())
    ON CONFLICT (symbol) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at`;
  await sql`UPDATE preview_settings SET revision = revision + 1 WHERE id = 1`;
}

export async function savePreviewTrade(input: { symbol: SymbolCode; side: TradeSide; price: number; notional: number; revision: number }): Promise<boolean> {
  await ensurePreviewSchema();
  const sql = db();
  const result = await sql`WITH claim AS (
      UPDATE preview_settings SET revision = revision + 1 WHERE id = 1 AND revision = ${input.revision} RETURNING id
    ), inserted AS (
      INSERT INTO preview_trades (symbol, side, price, notional)
      SELECT ${input.symbol}, ${input.side}, ${input.price}, ${input.notional} FROM claim RETURNING id
    ) SELECT id FROM inserted`;
  return result.length === 1;
}

export async function loginLocked(clientKey: string): Promise<boolean> {
  await ensurePreviewSchema();
  const rows = await db()`SELECT locked_until FROM admin_login_attempts WHERE client_key = ${clientKey}`;
  return Boolean(rows[0]?.locked_until && new Date(String(rows[0].locked_until)).getTime() > Date.now());
}

export async function recordFailedLogin(clientKey: string): Promise<void> {
  await ensurePreviewSchema();
  const sql = db();
  await sql`INSERT INTO admin_login_attempts (client_key, failures, window_started, locked_until)
    VALUES (${clientKey}, 1, now(), NULL)
    ON CONFLICT (client_key) DO UPDATE SET
      failures = CASE WHEN admin_login_attempts.window_started < now() - interval '15 minutes' THEN 1 ELSE admin_login_attempts.failures + 1 END,
      window_started = CASE WHEN admin_login_attempts.window_started < now() - interval '15 minutes' THEN now() ELSE admin_login_attempts.window_started END,
      locked_until = CASE WHEN admin_login_attempts.window_started < now() - interval '15 minutes' THEN NULL
        WHEN admin_login_attempts.failures + 1 >= 5 THEN now() + interval '15 minutes' ELSE admin_login_attempts.locked_until END`;
}

export async function clearFailedLogins(clientKey: string): Promise<void> {
  await ensurePreviewSchema();
  await db()`DELETE FROM admin_login_attempts WHERE client_key = ${clientKey}`;
}
