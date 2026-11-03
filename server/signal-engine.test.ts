import assert from 'node:assert/strict';
import test from 'node:test';
import { SignalEngine } from './signal-engine.js';

test('selection and action each require a full dwell, then cannot repeat without exit', () => {
  const engine = new SignalEngine(5_000, 30_000);
  const nvda = { x: 0.5, y: 0.2, confidence: 0.9 };
  const buy = { x: 0.2, y: 0.9, confidence: 0.9 };
  assert.deepEqual(engine.ingest(nvda, 1_000), {});
  assert.deepEqual(engine.ingest(nvda, 5_999), {});
  assert.deepEqual(engine.ingest(nvda, 6_000), { selection: 'NVDA' });
  assert.deepEqual(engine.ingest(buy, 7_000), {});
  assert.deepEqual(engine.ingest(buy, 12_000), { decision: { symbol: 'NVDA', side: 'BUY' } });
  assert.deepEqual(engine.ingest(buy, 13_000), {});
  assert.equal(engine.state(13_000).stage, 'cooldown');
  assert.deepEqual(engine.ingest(nvda, 20_000), {});
  assert.deepEqual(engine.ingest(nvda, 29_000), {});
  assert.deepEqual(engine.ingest(nvda, 38_000), {});
  assert.deepEqual(engine.ingest(nvda, 41_999), {});
  assert.deepEqual(engine.ingest(nvda, 42_000), { selection: 'NVDA' });
});

test('low-confidence observations break dwell and selections expire', () => {
  const engine = new SignalEngine(5_000, 30_000);
  const spy = { x: 0.1, y: 0.2, confidence: 0.8 };
  const sell = { x: 0.8, y: 0.9, confidence: 0.8 };
  engine.ingest(spy, 1_000);
  engine.ingest({ ...spy, confidence: 0.1 }, 5_000);
  assert.deepEqual(engine.ingest(spy, 6_000), {});
  assert.deepEqual(engine.ingest(spy, 11_000), { selection: 'SPY' });
  engine.ingest(sell, 132_000);
  assert.deepEqual(engine.ingest(sell, 137_000), {});
  assert.equal(engine.state(137_000).selectedSymbol, null);
});

test('a camera gap clears an armed stock before a later action', () => {
  const engine = new SignalEngine(5_000, 30_000);
  const spy = { x: 0.1, y: 0.2, confidence: 0.9 };
  const buy = { x: 0.1, y: 0.9, confidence: 0.9 };
  engine.ingest(spy, 1_000);
  engine.ingest(spy, 6_000);
  assert.equal(engine.state(16_001).selectedSymbol, null);
  engine.ingest(buy, 17_000);
  assert.deepEqual(engine.ingest(buy, 22_000), {});
});
