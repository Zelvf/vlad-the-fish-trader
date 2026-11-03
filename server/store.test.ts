import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from './store.js';
import { SignalEngine } from './signal-engine.js';

test('paper fills update cash and shares, limit sells, and survive restart', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vlad-ledger-'));
  const file = path.join(directory, 'ledger.sqlite');
  try {
    const store = new Store(file, 'live', 10_000);
    store.upsertQuote({ symbol: 'SPY', price: 500, previousClose: 498,
      observedAt: new Date().toISOString(), source: 'twelvedata', marketOpen: true });
    const buy = store.recordTrade('SPY', 'BUY', 500, 500, 'camera');
    assert.equal(buy?.shares, 1);
    assert.equal(store.cash(), 9_500);
    assert.equal(store.positions()[0].shares, 1);
    const sell = store.recordTrade('SPY', 'SELL', 510, 5_000, 'camera');
    assert.equal(sell?.shares, 1);
    assert.equal(store.cash(), 10_010);
    assert.equal(store.positions().length, 0);
    assert.equal(store.recordTrade('SPY', 'SELL', 510, 500, 'camera'), null);
    assert.equal(store.snapshot(new SignalEngine(5_000, 30_000), { youtubeVideoId: null, dwellMs: 5_000, cooldownMs: 30_000, orderNotional: 500 }).totalPnl, 10);
    store.close();
    const reopened = new Store(file, 'live', 10_000);
    assert.equal(reopened.cash(), 10_010);
    assert.equal(reopened.trades().length, 2);
    reopened.close();
    assert.throws(() => new Store(file, 'demo', 10_000), /separate DATABASE_PATH/);
  } finally {
    for (const name of ['ledger.sqlite-wal', 'ledger.sqlite-shm', 'ledger.sqlite']) {
      const target = path.join(directory, name);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    fs.rmdirSync(directory);
  }
});
