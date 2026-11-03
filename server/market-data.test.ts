import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SYMBOLS } from '../shared/catalog.js';
import { refreshCoinGecko } from './market-data.js';
import { Store } from './store.js';

test('one CoinGecko request preserves micro-prices and 24-hour reference changes', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vlad-prices-'));
  const file = path.join(directory, 'ledger.sqlite');
  const store = new Store(file, 'live', 10_000);
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = Object.fromEntries(SYMBOLS.map(({ coingeckoId }, index) => [coingeckoId, {
      usd: index === 2 ? 0.0000052 : index + 1,
      usd_24h_change: 4,
      last_updated_at: timestamp,
    }]));
    let calls = 0;
    const fetcher: typeof fetch = async (input, init) => {
      calls++;
      const url = new URL(input.toString());
      assert.equal(url.pathname, '/api/v3/simple/price');
      assert.equal(url.searchParams.get('ids'), SYMBOLS.map((asset) => asset.coingeckoId).join(','));
      assert.equal(url.searchParams.get('precision'), 'full');
      assert.equal(new Headers(init?.headers).get('x-cg-demo-api-key'), 'test-key');
      return new Response(JSON.stringify(body), { status: 200 });
    };
    assert.deepEqual(await refreshCoinGecko(store, 'test-key', fetcher), { updated: 6, errors: [] });
    assert.equal(calls, 1);
    assert.equal(store.quote('PEPE')?.price, 0.0000052);
    assert.ok(Math.abs((store.quote('PEPE')?.price24hAgo || 0) - 0.000005) < 1e-12);
    assert.equal(store.quote('PEPE')?.source, 'coingecko');
    assert.equal(store.equity().length, 1);
  } finally {
    store.close();
    for (const name of ['ledger.sqlite-wal', 'ledger.sqlite-shm', 'ledger.sqlite']) {
      const target = path.join(directory, name);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    fs.rmdirSync(directory);
  }
});
