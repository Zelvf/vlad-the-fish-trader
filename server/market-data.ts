import { SYMBOLS } from '../shared/catalog.js';
import type { Quote } from '../shared/types.js';
import type { Store } from './store.js';

interface TwelveDataResponse {
  status?: string;
  message?: string;
  close?: string;
  previous_close?: string;
  last_quote_at?: number;
  last_update_at?: number;
  timestamp?: number;
  is_market_open?: boolean;
}

export async function refreshTwelveData(store: Store, apiKey: string): Promise<{ updated: number; errors: string[] }> {
  const results = await Promise.allSettled(SYMBOLS.map(async ({ symbol }) => {
    const url = new URL('https://api.twelvedata.com/quote');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', apiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
    const body = await response.json() as TwelveDataResponse;
    if (body.status === 'error') throw new Error(`${symbol}: ${body.message || 'provider error'}`);
    const price = Number(body.close);
    const previousClose = Number(body.previous_close);
    const timestamp = Number(body.last_quote_at || body.last_update_at || body.timestamp);
    if (!(price > 0) || !(previousClose > 0) || !(timestamp > 0)) throw new Error(`${symbol}: incomplete quote`);
    const quote: Quote = {
      symbol, price, previousClose,
      observedAt: new Date(timestamp * 1000).toISOString(),
      source: 'twelvedata', marketOpen: body.is_market_open === true,
    };
    store.upsertQuote(quote);
    return quote;
  }));
  const errors: string[] = [];
  let updated = 0;
  results.forEach((result) => {
    if (result.status === 'fulfilled') updated++;
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  });
  if (updated > 0) store.recordEquity();
  return { updated, errors };
}
