import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RULES, DEFAULT_SITE } from '../shared/admin.js';
import { buildPreviewSnapshot, previewTradePrice, type PreviewData } from './preview-db.js';

test('database-backed account replays admin trades and generated price edits with distinct sources', () => {
  const base: PreviewData = { site: { ...DEFAULT_SITE, heroLineOne: 'A test headline.' }, rules: DEFAULT_RULES,
    quoteOverrides: { DOGE: 0.2 }, adminTrades: [], revision: 0 };
  assert.equal(previewTradePrice(base, 'SHIB', 'SELL', 100), null);
  assert.equal(previewTradePrice(base, 'DOGE', 'BUY', 100), 0.2);
  const state: PreviewData = { ...base, adminTrades: [{ id: 1, symbol: 'DOGE', side: 'BUY', price: 0.2,
    notional: 100, executedAt: new Date().toISOString() }] };
  const snapshot = buildPreviewSnapshot(state);
  assert.equal(snapshot.site.heroLineOne, 'A test headline.');
  assert.equal(snapshot.quotes.find((quote) => quote.symbol === 'DOGE')?.price, 0.2);
  assert.equal(snapshot.quotes.find((quote) => quote.symbol === 'DOGE')?.source, 'generated');
  assert.equal(snapshot.trades[0]?.source, 'admin');
  assert.ok(snapshot.trades.some((trade) => trade.source === 'generated'));
  assert.equal(snapshot.tradesCount, 5);
  assert.equal(snapshot.cash, 8_650);
  assert.equal(snapshot.equity.at(-1)?.value, snapshot.portfolioValue);
  assert.match(snapshot.pricingLabel, /Generated prices/);
});
