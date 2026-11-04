import type { SymbolCode, TradeSide, ZoneCode } from './catalog.js';
import type { SiteSettings, TradingRules } from './admin.js';

export type AppMode = 'demo' | 'live';
export type QuoteSource = 'generated' | 'coingecko';

export interface Quote {
  symbol: SymbolCode;
  price: number;
  price24hAgo: number | null;
  observedAt: string;
  source: QuoteSource;
}

export interface Trade {
  id: number;
  symbol: SymbolCode;
  side: TradeSide;
  units: number;
  price: number;
  notional: number;
  executedAt: string;
  source: 'camera' | 'generated' | 'admin';
}

export interface Activity {
  id: number;
  kind: 'selection' | 'trade' | 'skip' | 'system';
  message: string;
  createdAt: string;
}

export interface Position {
  symbol: SymbolCode;
  units: number;
  marketValue: number;
  averageCost: number;
  unrealizedPnl: number;
  change24hPercent: number | null;
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
  site: SiteSettings;
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
  rules: TradingRules;
  lastQuoteAt: string | null;
}
