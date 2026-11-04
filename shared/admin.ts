import { isSymbol, type SymbolCode, type TradeSide } from './catalog.js';

export interface SiteSettings {
  heroLineOne: string;
  heroLineTwo: string;
  liveTitle: string;
  liveNote: string;
  youtubeVideoId: string | null;
}

export interface TradingRules {
  dwellMs: number;
  cooldownMs: number;
  orderNotional: number;
}

export const DEFAULT_SITE: SiteSettings = {
  heroLineOne: 'One fish. Six meme coins.',
  heroLineTwo: 'Zero financial education.',
  liveTitle: 'Vlad will be here.',
  liveNote: 'The YouTube Live stream will appear here when its video ID is ready.',
  youtubeVideoId: null,
};

export const DEFAULT_RULES: TradingRules = { dwellMs: 5_000, cooldownMs: 30_000, orderNotional: 500 };

function cleanText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const result = value.trim().replace(/\s+/g, ' ');
  if (!result || result.length > max || /[\x00-\x1f\x7f]/.test(result)) {
    throw new Error(`${label} must be 1–${max} characters.`);
  }
  return result;
}

export function parseYoutubeId(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('YouTube video ID must be text.');
  const input = value.trim();
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      id = url.searchParams.get('v') || /^\/(?:live|embed)\/([\w-]+)/.exec(url.pathname)?.[1] || null;
    }
    if (id && /^[\w-]{11}$/.test(id)) return id;
  } catch { /* The message below covers malformed URLs. */ }
  throw new Error('Enter an 11-character YouTube video ID or a YouTube watch URL.');
}

export function validateSite(value: unknown): SiteSettings {
  if (!value || typeof value !== 'object') throw new Error('Site settings are required.');
  const input = value as Record<string, unknown>;
  return {
    heroLineOne: cleanText(input.heroLineOne, 'First headline line', 80),
    heroLineTwo: cleanText(input.heroLineTwo, 'Second headline line', 80),
    liveTitle: cleanText(input.liveTitle, 'Stream placeholder title', 80),
    liveNote: cleanText(input.liveNote, 'Stream placeholder note', 180),
    youtubeVideoId: parseYoutubeId(input.youtubeVideoId),
  };
}

export function validateRules(value: unknown): TradingRules {
  if (!value || typeof value !== 'object') throw new Error('Trading rules are required.');
  const input = value as Record<string, unknown>;
  const dwellMs = Number(input.dwellMs);
  const cooldownMs = Number(input.cooldownMs);
  const orderNotional = Number(input.orderNotional);
  if (!Number.isInteger(dwellMs) || dwellMs < 1_000 || dwellMs > 30_000) throw new Error('Hold time must be 1–30 seconds.');
  if (!Number.isInteger(cooldownMs) || cooldownMs < 1_000 || cooldownMs > 300_000) throw new Error('Cooldown must be 1–300 seconds.');
  if (!Number.isFinite(orderNotional) || orderNotional < 1 || orderNotional > 10_000 || Math.round(orderNotional * 100) !== orderNotional * 100) {
    throw new Error('Trade amount must be $1–$10,000 in cents.');
  }
  return { dwellMs, cooldownMs, orderNotional };
}

export function validateQuote(value: unknown): { symbol: SymbolCode; price: number } {
  if (!value || typeof value !== 'object') throw new Error('A coin and price are required.');
  const input = value as Record<string, unknown>;
  if (typeof input.symbol !== 'string' || !isSymbol(input.symbol)) throw new Error('Choose a listed meme coin.');
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) throw new Error('Price must be greater than zero and at most $1,000,000.');
  return { symbol: input.symbol, price };
}

export function validateAdminTrade(value: unknown): { symbol: SymbolCode; side: TradeSide; notional: number } {
  if (!value || typeof value !== 'object') throw new Error('Trade details are required.');
  const input = value as Record<string, unknown>;
  if (typeof input.symbol !== 'string' || !isSymbol(input.symbol)) throw new Error('Choose a listed meme coin.');
  if (input.side !== 'BUY' && input.side !== 'SELL') throw new Error('Choose BUY or SELL.');
  const notional = Number(input.notional);
  if (!Number.isFinite(notional) || notional < 1 || notional > 10_000 || Math.round(notional * 100) !== notional * 100) {
    throw new Error('Trade amount must be $1–$10,000 in cents.');
  }
  return { symbol: input.symbol, side: input.side, notional };
}
