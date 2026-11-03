export const SYMBOLS = [
  { symbol: 'DOGE', name: 'Dogecoin', group: 'Meme coin', coingeckoId: 'dogecoin' },
  { symbol: 'SHIB', name: 'Shiba Inu', group: 'Meme coin', coingeckoId: 'shiba-inu' },
  { symbol: 'PEPE', name: 'Pepecoin', group: 'Meme coin', coingeckoId: 'pepe' },
  { symbol: 'BONK', name: 'Bonk', group: 'Meme coin', coingeckoId: 'bonk' },
  { symbol: 'WIF', name: 'Dogwifhat', group: 'Meme coin', coingeckoId: 'dogwifcoin' },
  { symbol: 'TRUMP', name: 'Official Trump', group: 'Meme coin', coingeckoId: 'official-trump' },
] as const;

export const BENCHMARK_SYMBOL = 'DOGE' as const;
export const ASSET_UNIVERSE = 'robinhood-memecoins-v1' as const;

export type SymbolCode = (typeof SYMBOLS)[number]['symbol'];
export type ZoneCode = SymbolCode | 'BUY' | 'SELL';
export type TradeSide = 'BUY' | 'SELL';

export function isSymbol(value: string): value is SymbolCode {
  return SYMBOLS.some((item) => item.symbol === value);
}

/** Top 72%: six meme-coin selections. Bottom 28%: buy or sell. */
export function zoneAt(x: number, y: number): ZoneCode {
  if (y >= 0.72) return x < 0.5 ? 'BUY' : 'SELL';
  const column = Math.min(2, Math.floor(x * 3));
  const row = y < 0.36 ? 0 : 1;
  return SYMBOLS[row * 3 + column].symbol;
}
