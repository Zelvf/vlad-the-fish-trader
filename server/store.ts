import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SYMBOLS, isSymbol, type SymbolCode, type TradeSide } from '../shared/catalog.js';
import type { Activity, AppMode, EquityPoint, Position, Quote, Snapshot, Trade } from '../shared/types.js';
import type { SignalEngine } from './signal-engine.js';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const demoQuotes = [
  { symbol: 'SPY', price: 586.34, previousClose: 583.86 },
  { symbol: 'NVDA', price: 131.40, previousClose: 129.72 },
  { symbol: 'TSLA', price: 267.52, previousClose: 271.08 },
  { symbol: 'AAPL', price: 222.80, previousClose: 221.09 },
  { symbol: 'GOOGL', price: 173.46, previousClose: 172.62 },
  { symbol: 'MSFT', price: 435.31, previousClose: 433.42 },
] as const;

function newYorkDay(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export class Store {
  readonly db: DatabaseSync;

  constructor(file: string, private readonly mode: AppMode, private readonly initialCash: number) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS quotes (
        symbol TEXT PRIMARY KEY, price REAL NOT NULL, previous_close REAL NOT NULL,
        observed_at TEXT NOT NULL, source TEXT NOT NULL, market_open INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS positions (
        symbol TEXT PRIMARY KEY, shares REAL NOT NULL, average_cost REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT NOT NULL, side TEXT NOT NULL,
        shares REAL NOT NULL, price REAL NOT NULL, notional REAL NOT NULL,
        executed_at TEXT NOT NULL, source TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL,
        message TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS equity (
        id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL,
        value REAL NOT NULL, benchmark_value REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(executed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_equity_time ON equity(at DESC);
    `);
    const existingMode = this.setting('mode');
    if (existingMode && existingMode !== mode) {
      this.db.close();
      throw new Error(`Database is a ${existingMode} ledger; use a separate DATABASE_PATH for ${mode} mode.`);
    }
    if (!existingMode) {
      this.setSetting('mode', mode);
      this.setSetting('initial_cash', String(initialCash));
      this.setSetting('cash', String(initialCash));
      this.setSetting('created_at', new Date().toISOString());
      if (mode === 'demo') this.seedDemo();
      else this.addActivity('system', 'Paper portfolio created. Waiting for market quotes and Vlad observations.');
    }
  }

  close(): void { this.db.close(); }

  private setting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  private setSetting(key: string, value: string): void {
    this.db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
  }

  private seedDemo(): void {
    const now = Date.now();
    demoQuotes.forEach((quote) => this.upsertQuote({ ...quote, observedAt: new Date(now).toISOString(), source: 'scenario', marketOpen: true }));
    const fixtures: Array<[SymbolCode, TradeSide, number, number, number]> = [
      ['SPY', 'BUY', 500, 572.10, 48],
      ['NVDA', 'BUY', 500, 127.20, 33],
      ['AAPL', 'BUY', 500, 215.40, 18],
      ['SPY', 'SELL', 250, 582.90, 7],
    ];
    for (const [symbol, side, amount, price, hoursAgo] of fixtures) {
      const at = new Date(now - hoursAgo * 3_600_000).toISOString();
      this.recordTrade(symbol, side, price, amount, 'sample', at);
    }
    // Explicit preview history; it is never exported as live trading evidence.
    const today = new Date(now).toISOString();
    const current = this.portfolioValue();
    const points = [
      [48, this.initialCash, this.initialCash], [42, this.initialCash + 4, this.initialCash + 2],
      [36, this.initialCash - 9, this.initialCash - 5], [30, this.initialCash + 12, this.initialCash + 10],
      [24, this.initialCash + 23, this.initialCash + 15], [18, this.initialCash + 17, this.initialCash + 21],
      [12, this.initialCash + 35, this.initialCash + 24], [6, current - 12, this.initialCash + 30],
      [0, current, this.benchmarkValue()],
    ];
    this.db.prepare('DELETE FROM equity').run();
    for (const [hoursAgo, value, benchmarkValue] of points) {
      const at = hoursAgo === 0 ? today : new Date(now - hoursAgo * 3_600_000).toISOString();
      this.db.prepare('INSERT INTO equity(at,value,benchmark_value) VALUES (?,?,?)').run(at, round2(value), round2(benchmarkValue));
    }
    this.addActivity('system', 'Sample paper session loaded. Camera observations are not connected.');
  }

  upsertQuote(quote: Quote): void {
    this.db.prepare(`
      INSERT INTO quotes(symbol,price,previous_close,observed_at,source,market_open)
      VALUES (?,?,?,?,?,?) ON CONFLICT(symbol) DO UPDATE SET
        price=excluded.price, previous_close=excluded.previous_close,
        observed_at=excluded.observed_at, source=excluded.source, market_open=excluded.market_open
    `).run(quote.symbol, quote.price, quote.previousClose, quote.observedAt, quote.source, quote.marketOpen ? 1 : 0);
    if (quote.symbol === 'SPY' && !this.setting('benchmark_price')) this.setSetting('benchmark_price', String(quote.price));
  }

  updateScenarioQuotes(now = Date.now()): void {
    if (this.mode !== 'demo') return;
    const elapsed = (now - new Date(this.setting('created_at') || now).getTime()) / 60_000;
    demoQuotes.forEach((quote, index) => {
      const motion = Math.sin(elapsed / 11 + index * 1.37) * 0.004 + Math.sin(elapsed / 27 + index * 0.81) * 0.002;
      this.upsertQuote({ ...quote, price: round2(quote.price * (1 + motion)), observedAt: new Date(now).toISOString(), source: 'scenario', marketOpen: true });
    });
    this.recordEquity(new Date(now).toISOString());
  }

  quotes(): Quote[] {
    const rows = this.db.prepare('SELECT * FROM quotes').all() as Array<Record<string, unknown>>;
    return SYMBOLS.flatMap(({ symbol }) => {
      const row = rows.find((item) => item.symbol === symbol);
      return row ? [{
        symbol, price: Number(row.price), previousClose: Number(row.previous_close),
        observedAt: String(row.observed_at), source: row.source === 'twelvedata' ? 'twelvedata' as const : 'scenario' as const,
        marketOpen: Boolean(row.market_open),
      }] : [];
    });
  }

  quote(symbol: SymbolCode): Quote | null { return this.quotes().find((item) => item.symbol === symbol) ?? null; }
  cash(): number { return Number(this.setting('cash') || this.initialCash); }

  positions(): Position[] {
    const rows = this.db.prepare('SELECT * FROM positions WHERE shares > 0.000001').all() as Array<Record<string, unknown>>;
    const quotes = this.quotes();
    return rows.flatMap((row) => {
      const symbol = String(row.symbol);
      if (!isSymbol(symbol)) return [];
      const quote = quotes.find((item) => item.symbol === symbol);
      const shares = Number(row.shares);
      const averageCost = Number(row.average_cost);
      const price = quote?.price ?? averageCost;
      return [{ symbol, shares, averageCost, marketValue: round2(shares * price),
        unrealizedPnl: round2(shares * (price - averageCost)),
        dayChangePercent: quote?.previousClose ? (price / quote.previousClose - 1) * 100 : 0 }];
    });
  }

  portfolioValue(): number { return round2(this.cash() + this.positions().reduce((sum, position) => sum + position.marketValue, 0)); }

  benchmarkValue(): number {
    const base = Number(this.setting('benchmark_price') || 0);
    const price = this.quote('SPY')?.price;
    const initialCash = Number(this.setting('initial_cash') || this.initialCash);
    return base > 0 && price ? round2(initialCash * price / base) : initialCash;
  }

  recordTrade(symbol: SymbolCode, side: TradeSide, price: number, requestedNotional: number, source: Trade['source'], at = new Date().toISOString()): Trade | null {
    if (!(price > 0) || !(requestedNotional > 0)) return null;
    const row = this.db.prepare('SELECT shares, average_cost FROM positions WHERE symbol = ?').get(symbol) as { shares: number; average_cost: number } | undefined;
    const held = Number(row?.shares || 0);
    const cash = this.cash();
    const allowed = side === 'BUY' ? Math.min(requestedNotional, cash) : Math.min(requestedNotional, held * price);
    if (allowed < 1) return null;
    const shares = Math.min(side === 'SELL' ? held : Infinity, Math.floor((allowed / price) * 1_000_000) / 1_000_000);
    if (!(shares > 0)) return null;
    const notional = round2(shares * price);
    const nextCash = round2(cash + (side === 'BUY' ? -notional : notional));
    const nextShares = side === 'BUY' ? held + shares : Math.max(0, held - shares);
    const averageCost = side === 'BUY' ? (held * Number(row?.average_cost || 0) + notional) / nextShares : Number(row?.average_cost || 0);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.setSetting('cash', String(nextCash));
      this.db.prepare('INSERT INTO positions(symbol,shares,average_cost) VALUES (?,?,?) ON CONFLICT(symbol) DO UPDATE SET shares=excluded.shares, average_cost=excluded.average_cost')
        .run(symbol, nextShares, averageCost);
      const result = this.db.prepare('INSERT INTO trades(symbol,side,shares,price,notional,executed_at,source) VALUES (?,?,?,?,?,?,?)')
        .run(symbol, side, shares, price, notional, at, source);
      this.db.exec('COMMIT');
      this.recordEquity(at);
      return { id: Number(result.lastInsertRowid), symbol, side, shares, price, notional, executedAt: at, source };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  addActivity(kind: Activity['kind'], message: string, at = new Date().toISOString()): void {
    this.db.prepare('INSERT INTO activity(kind,message,created_at) VALUES (?,?,?)').run(kind, message, at);
  }

  recordEquity(at = new Date().toISOString()): void {
    this.db.prepare('INSERT INTO equity(at,value,benchmark_value) VALUES (?,?,?)')
      .run(at, this.portfolioValue(), this.benchmarkValue());
    this.db.prepare('DELETE FROM equity WHERE id NOT IN (SELECT id FROM equity ORDER BY id DESC LIMIT 2000)').run();
  }

  trades(limit = 50): Trade[] {
    return (this.db.prepare('SELECT * FROM trades ORDER BY id DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>).flatMap((row) => {
      const symbol = String(row.symbol);
      if (!isSymbol(symbol)) return [];
      return [{ id: Number(row.id), symbol, side: String(row.side) as TradeSide,
        shares: Number(row.shares), price: Number(row.price), notional: Number(row.notional),
        executedAt: String(row.executed_at), source: String(row.source) as Trade['source'] }];
    });
  }

  activity(limit = 20): Activity[] {
    return (this.db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>)
      .map((row) => ({ id: Number(row.id), kind: String(row.kind) as Activity['kind'], message: String(row.message), createdAt: String(row.created_at) }));
  }

  equity(limit = 400): EquityPoint[] {
    return (this.db.prepare('SELECT * FROM (SELECT * FROM equity ORDER BY id DESC LIMIT ?) ORDER BY id ASC').all(limit) as Array<Record<string, unknown>>)
      .map((row) => ({ at: String(row.at), value: Number(row.value), benchmarkValue: Number(row.benchmark_value) }));
  }

  snapshot(signal: SignalEngine, settings: { youtubeVideoId: string | null; dwellMs: number; cooldownMs: number; orderNotional: number }): Snapshot {
    const now = new Date();
    const positions = this.positions();
    const quotes = this.quotes();
    const portfolioValue = round2(this.cash() + positions.reduce((sum, position) => sum + position.marketValue, 0));
    const initialCash = Number(this.setting('initial_cash') || this.initialCash);
    const points = this.equity();
    const today = newYorkDay(now.toISOString());
    const firstToday = points.find((point) => newYorkDay(point.at) === today);
    const baseToday = firstToday?.value ?? portfolioValue;
    const todayPnl = round2(portfolioValue - baseToday);
    const benchmarkValue = this.benchmarkValue();
    const times = quotes.map((quote) => quote.observedAt).sort();
    return {
      mode: this.mode,
      pricingLabel: this.mode === 'demo' ? 'Scenario prices · sample session' : quotes.length ? 'Reference market quotes · paper orders' : 'Reference prices not connected',
      generatedAt: now.toISOString(), youtubeVideoId: settings.youtubeVideoId,
      initialCash, cash: this.cash(), portfolioValue,
      totalPnl: round2(portfolioValue - initialCash),
      totalPnlPercent: (portfolioValue / initialCash - 1) * 100,
      todayPnl, todayPnlPercent: baseToday ? todayPnl / baseToday * 100 : 0,
      benchmarkPnlPercent: (benchmarkValue / initialCash - 1) * 100,
      tradesCount: Number((this.db.prepare('SELECT COUNT(*) AS count FROM trades').get() as { count: number }).count),
      positions, quotes, trades: this.trades(), activity: this.activity(), equity: points,
      signal: signal.state(),
      rules: { dwellMs: settings.dwellMs, cooldownMs: settings.cooldownMs, orderNotional: settings.orderNotional },
      lastQuoteAt: times.at(-1) ?? null,
    };
  }
}
