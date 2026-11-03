import type { SymbolCode, TradeSide, ZoneCode } from './catalog.js';

export type AppMode = 'demo' | 'live';
export type QuoteSource = 'scenario' | 'twelvedata';

export interface Quote {
  symbol: SymbolCode;
  price: number;
  previousClose: number;
  observedAt: string;
  source: QuoteSource;
  marketOpen: boolean;
}

export interface Trade {
  id: number;
  symbol: SymbolCode;
  side: TradeSide;
  shares: number;
  price: number;
  notional: number;
  executedAt: string;
  source: 'camera' | 'sample';
}

export interface Activity {
  id: number;
  kind: 'selection' | 'trade' | 'skip' | 'system';
  message: string;
  createdAt: string;
}

export interface Position {
  symbol: SymbolCode;
  shares: number;
  marketValue: number;
  averageCost: number;
  unrealizedPnl: number;
  dayChangePercent: number;
}

export interface EquityPoint {
  at: string;
  value: number;
  benchmarkValue: number;
}

export interface Signal {
  cameraConnected: boolean;
  x: number | null;
  y: number | null;
  confidence: number | null;
  zone: ZoneCode | null;
  dwellProgress: number;
  selectedSymbol: SymbolCode | null;
  stage: 'waiting' | 'selecting' | 'action' | 'cooldown';
  lastSeenAt: string | null;
  cooldownRemainingMs: number;
}

export interface Snapshot {
  mode: AppMode;
  pricingLabel: string;
  generatedAt: string;
  youtubeVideoId: string | null;
  initialCash: number;
  cash: number;
  portfolioValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  benchmarkPnlPercent: number;
  tradesCount: number;
  positions: Position[];
  quotes: Quote[];
  trades: Trade[];
  activity: Activity[];
  equity: EquityPoint[];
  signal: Signal;
  rules: { dwellMs: number; cooldownMs: number; orderNotional: number };
  lastQuoteAt: string | null;
}
