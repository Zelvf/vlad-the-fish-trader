import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Store } from './store.js';
import { SignalEngine } from './signal-engine.js';

test('tiny-price coin fills preserve units, cash, and restart state', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vlad-ledger-'));
  const file = path.join(directory, 'ledger.sqlite');
  let openStore: Store | null = null;
  try {
    const store = new Store(file, 'live', 10_000);
    openStore = store;
    store.upsertQuote({ symbol: 'PEPE', price: 0.000005, price24hAgo: 0.0000048,
      observedAt: new Date().toISOString(), source: 'coingecko' });
    const buy = store.recordTrade('PEPE', 'BUY', 0.000005, 500, 'camera');
    assert.ok(buy && Math.abs(buy.units - 100_000_000) < 0.001);
    assert.equal(store.cash(), 9_500);
    assert.ok(Math.abs(store.positions()[0].units - 100_000_000) < 0.001);
    store.upsertQuote({ symbol: 'PEPE', price: 0.0000051, price24hAgo: 0.000005,
      observedAt: new Date().toISOString(), source: 'coingecko' });
    assert.equal(store.positions()[0].marketValue, 510);
    const sell = store.recordTrade('PEPE', 'SELL', 0.0000051, 5_000, 'camera');
    assert.ok(sell && Math.abs(sell.units - 100_000_000) < 0.001);
    assert.equal(store.cash(), 10_010);
    assert.equal(store.positions().length, 0);
    assert.equal(store.recordTrade('PEPE', 'SELL', 0.0000051, 500, 'camera'), null);
    assert.equal(store.snapshot(new SignalEngine(5_000, 30_000), { youtubeVideoId: null, dwellMs: 5_000, cooldownMs: 30_000, orderNotional: 500 }).totalPnl, 10);
    store.close();
    openStore = null;
    const reopened = new Store(file, 'live', 10_000);
    openStore = reopened;
    assert.equal(reopened.cash(), 10_010);
    assert.equal(reopened.trades().length, 2);
    reopened.close();
    openStore = null;
    assert.throws(() => new Store(file, 'demo', 10_000), /separate DATABASE_PATH/);
    const legacy = new DatabaseSync(file);
    legacy.prepare("UPDATE settings SET value = 'stocks-v1' WHERE key = 'asset_universe'").run();
    legacy.close();
    assert.throws(() => new Store(file, 'live', 10_000), /fresh DATABASE_PATH/);
  } finally {
    openStore?.close();
    for (const name of ['ledger.sqlite-wal', 'ledger.sqlite-shm', 'ledger.sqlite']) {
      const target = path.join(directory, name);
      fs.rmSync(target, { force: true, maxRetries: 10, retryDelay: 100 });
    }
    fs.rmdirSync(directory);
  }
});
