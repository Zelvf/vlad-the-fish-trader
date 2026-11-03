import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RULES, DEFAULT_SITE, parseYoutubeId, validateRules, validateSite } from '../shared/admin.js';
import { originAllowed, passwordMatches, sessionCookie, sessionValid } from './admin-auth.js';
import { SignalEngine } from './signal-engine.js';
import { Store } from './store.js';

test('site and rule changes persist in the SQLite ledger and public snapshot', () => {
  const store = new Store(':memory:', 'demo', 10_000);
  try {
    const site = validateSite({ ...DEFAULT_SITE, heroLineOne: 'Vlad is on the move.', youtubeVideoId: 'dQw4w9WgXcQ' });
    const rules = validateRules({ dwellMs: 7000, cooldownMs: 45000, orderNotional: 250 });
    store.setSite(site);
    store.setRules(rules);
    const snapshot = store.snapshot(new SignalEngine(rules.dwellMs, rules.cooldownMs), { youtubeVideoId: null, ...DEFAULT_RULES });
    assert.equal(snapshot.site.heroLineOne, 'Vlad is on the move.');
    assert.equal(snapshot.youtubeVideoId, 'dQw4w9WgXcQ');
    assert.deepEqual(snapshot.rules, rules);
    assert.equal(store.recordTrade('DOGE', 'BUY', 0.18, 100, 'admin')?.source, 'admin');
    store.setScenarioPrice('DOGE', 0.2);
    store.updateScenarioQuotes(Date.now() + 60_000);
    assert.equal(store.quote('DOGE')?.price, 0.2);
  } finally { store.close(); }
  assert.equal(parseYoutubeId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.throws(() => parseYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ'), /YouTube/);
  assert.throws(() => validateRules({ dwellMs: 100, cooldownMs: 45000, orderNotional: 250 }), /Hold time/);
});

test('admin session is signed, scoped to the cookie, and origin checked', () => {
  const previousPassword = process.env.ADMIN_PASSWORD;
  const previousSecret = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_PASSWORD = 'test-only-password';
  process.env.ADMIN_SESSION_SECRET = 'test-only-random-session-secret-at-least-32-characters';
  try {
    assert.equal(passwordMatches('test-only-password'), true);
    assert.equal(passwordMatches('wrong'), false);
    const cookie = sessionCookie(true).split(';')[0];
    assert.equal(sessionValid(cookie, true), true);
    assert.equal(sessionValid(cookie.replace('=', '=0'), true), false);
    assert.equal(sessionValid(cookie, false), false);
    assert.equal(originAllowed('https://example.com', 'example.com'), true);
    assert.equal(originAllowed('https://evil.example', 'example.com'), false);
  } finally {
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previousPassword;
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = previousSecret;
  }
});
