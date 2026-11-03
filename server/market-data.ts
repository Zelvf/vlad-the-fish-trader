import { SYMBOLS } from '../shared/catalog.js';
import type { Quote } from '../shared/types.js';
import type { Store } from './store.js';

interface CoinGeckoPrice {
  usd?: number;
  usd_24h_change?: number | null;
  last_updated_at?: number;
}

/** One batched request covers the entire tank. Prices are references, not Robinhood quotes. */
export async function refreshCoinGecko(
  store: Store,
  apiKey: string | null,
  fetcher: typeof fetch = fetch,
): Promise<{ updated: number; errors: string[] }> {
  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', SYMBOLS.map((asset) => asset.coingeckoId).join(','));
  url.searchParams.set('vs_currencies', 'usd');
  url.searchParams.set('include_24hr_change', 'true');
  url.searchParams.set('include_last_updated_at', 'true');
  url.searchParams.set('precision', 'full');
  const response = await fetcher(url, {
    headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
  const body = await response.json() as Record<string, CoinGeckoPrice>;
  const errors: string[] = [];
  let updated = 0;
  for (const { symbol, coingeckoId } of SYMBOLS) {
    const entry = body[coingeckoId];
    const price = Number(entry?.usd);
    const timestamp = Number(entry?.last_updated_at);
    if (!(price > 0) || !Number.isFinite(price) || !(timestamp > 0) || !Number.isFinite(timestamp)) {
      errors.push(`${symbol}: missing price or timestamp`);
      continue;
    }
    const change = entry?.usd_24h_change;
    const price24hAgo = typeof change === 'number' && Number.isFinite(change) && change > -100
      ? price / (1 + change / 100)
      : null;
    const quote: Quote = {
      symbol, price, price24hAgo,
      observedAt: new Date(timestamp * 1000).toISOString(),
      source: 'coingecko',
    };
    store.upsertQuote(quote);
    updated++;
  }
  if (updated > 0) store.recordEquity();
  return { updated, errors };
}
