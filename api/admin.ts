import { validateAdminTrade, validateQuote, validateRules, validateSite } from '../shared/admin.js';
import { adminConfigured, clearSessionCookie, clientKey, originAllowed, passwordMatches, sessionCookie, sessionValid } from '../server/admin-auth.js';
import {
  buildPreviewSnapshot, clearFailedLogins, loadPreviewData, loginLocked, previewTradePrice,
  recordFailedLogin, savePreviewQuote, savePreviewRules, savePreviewSite, savePreviewTrade,
} from '../server/preview-db.js';

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

export default {
  async fetch(request: Request): Promise<Response> {
    const secure = new URL(request.url).protocol === 'https:';
    if (!adminConfigured()) return json({ error: 'Admin access is not configured on this deployment.', configured: false }, 503);
    if (request.method === 'GET') {
      if (!sessionValid(request.headers.get('cookie'), secure)) return json({ authenticated: false, configured: true });
      try {
        const data = await loadPreviewData();
        return json({ authenticated: true, configured: true, storage: 'Neon database',
          revision: data.revision, quoteOverrides: data.quoteOverrides, snapshot: buildPreviewSnapshot(data) });
      } catch (error) { console.error('Admin read failed:', error); return json({ error: 'The admin database is unavailable.' }, 503); }
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
    if (!originAllowed(request.headers.get('origin'), request.headers.get('host'))) return json({ error: 'Request origin is not allowed.' }, 403);
    if (Number(request.headers.get('content-length') || 0) > 16_384) return json({ error: 'Request is too large.' }, 413);
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return json({ error: 'Send a JSON request.' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'Send a JSON object.' }, 400);

    if (body.action === 'login') {
      const address = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown';
      const key = clientKey(address.split(',')[0].trim());
      try {
        if (await loginLocked(key)) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
        if (!passwordMatches(body.password)) {
          await recordFailedLogin(key);
          return json({ error: 'Incorrect password.' }, 401);
        }
        await clearFailedLogins(key);
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(secure) });
      } catch (error) { console.error('Admin login failed:', error); return json({ error: 'Admin login is temporarily unavailable.' }, 503); }
    }
    if (body.action === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(secure) });
    if (!sessionValid(request.headers.get('cookie'), secure)) return json({ error: 'Sign in to make changes.' }, 401);

    try {
      if (body.action === 'saveSite') {
        let site;
        try { site = validateSite(body.site); } catch (error) { return json({ error: (error as Error).message }, 400); }
        await savePreviewSite(site);
        return json({ ok: true });
      }
      if (body.action === 'saveRules') {
        let rules;
        try { rules = validateRules(body.rules); } catch (error) { return json({ error: (error as Error).message }, 400); }
        await savePreviewRules(rules);
        return json({ ok: true });
      }
      if (body.action === 'saveQuote') {
        let quote;
        try { quote = validateQuote(body.quote); } catch (error) { return json({ error: (error as Error).message }, 400); }
        await savePreviewQuote(quote.symbol, quote.price);
        return json({ ok: true });
      }
      if (body.action === 'addTrade') {
        let trade;
        try { trade = validateAdminTrade(body.trade); } catch (error) { return json({ error: (error as Error).message }, 400); }
        const data = await loadPreviewData();
        const price = previewTradePrice(data, trade.symbol, trade.side, trade.notional);
        if (price === null) return json({ error: 'The account lacks enough cash or coin units for this entry.' }, 400);
        if (!await savePreviewTrade({ ...trade, price, revision: data.revision })) {
          return json({ error: 'The portfolio changed while saving. Refresh and try again.' }, 409);
        }
        return json({ ok: true });
      }
      return json({ error: 'Unknown admin action.' }, 400);
    } catch (error) { console.error('Admin write failed:', error); return json({ error: 'The change could not be saved.' }, 503); }
  },
};
