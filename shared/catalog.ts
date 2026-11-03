export const SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', group: 'Index' },
  { symbol: 'NVDA', name: 'NVIDIA', group: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla', group: 'Automotive' },
  { symbol: 'AAPL', name: 'Apple', group: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet', group: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft', group: 'Technology' },
] as const;

export type SymbolCode = (typeof SYMBOLS)[number]['symbol'];
export type ZoneCode = SymbolCode | 'BUY' | 'SELL';
export type TradeSide = 'BUY' | 'SELL';

export function isSymbol(value: string): value is SymbolCode {
  return SYMBOLS.some((item) => item.symbol === value);
}

/** Top 72%: six stock selections. Bottom 28%: buy or sell. */
export function zoneAt(x: number, y: number): ZoneCode {
  if (y >= 0.72) return x < 0.5 ? 'BUY' : 'SELL';
  const column = Math.min(2, Math.floor(x * 3));
  const row = y < 0.36 ? 0 : 1;
  return SYMBOLS[row * 3 + column].symbol;
}
