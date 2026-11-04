import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Eye, EyeOff, LockKeyhole, LogOut, RefreshCw } from 'lucide-react';
import { DEFAULT_RULES, DEFAULT_SITE, type SiteSettings } from '../shared/admin';
import { SYMBOLS, type SymbolCode, type TradeSide } from '../shared/catalog';
import type { Snapshot } from '../shared/types';
import './admin.css';

type Section = 'overview' | 'site' | 'simulation' | 'ledger';
interface AdminData {
  configured: boolean;
  authenticated: boolean;
  storage: string;
  snapshot: Snapshot;
  revision?: number;
  quoteOverrides?: Partial<Record<SymbolCode, number>>;
}

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const priceMoney = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: value < .0001 ? 10 : value < 1 ? 6 : 2,
}).format(value);
const stamp = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

async function adminRequest(method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<AdminData | { ok: true }> {
  const response = await fetch('/api/admin', {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as AdminData & { error?: string; ok?: true };
  if (!response.ok) throw Object.assign(new Error(result.error || (response.status === 401 ? 'Sign in to continue.' : 'Request failed.')), {
    status: response.status, configured: result.configured,
  });
  return result;
}

function Mark() {
  return <svg width="29" height="29" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M4 20c8-9 17-11 25-5l8-8v26l-8-8C21 31 12 29 4 20Z" fill="currentColor" /><circle cx="12" cy="19" r="1.7" fill="#08090b" /></svg>;
}

export default function Admin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState<'loading' | 'login' | 'ready' | 'unconfigured'>('loading');
  const [section, setSection] = useState<Section>('overview');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE);
  const [dwell, setDwell] = useState(String(DEFAULT_RULES.dwellMs / 1000));
  const [cooldown, setCooldown] = useState(String(DEFAULT_RULES.cooldownMs / 1000));
  const [amount, setAmount] = useState(String(DEFAULT_RULES.orderNotional));
  const [prices, setPrices] = useState<Partial<Record<SymbolCode, string>>>({});
  const [tradeSymbol, setTradeSymbol] = useState<SymbolCode>('DOGE');
  const [tradeSide, setTradeSide] = useState<TradeSide>('BUY');
  const [tradeAmount, setTradeAmount] = useState('500');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const result = await adminRequest('GET') as AdminData;
      if (!result.authenticated) { setStatus('login'); return; }
      setData(result);
      setSite(result.snapshot.site);
      setDwell(String(result.snapshot.rules.dwellMs / 1000));
      setCooldown(String(result.snapshot.rules.cooldownMs / 1000));
      setAmount(String(result.snapshot.rules.orderNotional));
      setPrices(Object.fromEntries(result.snapshot.quotes.map((quote) => [quote.symbol, String(quote.price)])));
      setStatus('ready');
    } catch (failure) {
      const issue = failure as Error & { status?: number; configured?: boolean };
      if (issue.status === 401) setStatus('login');
      else if (issue.configured === false) setStatus('unconfigured');
      else { setStatus('login'); setError(issue.message); }
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await adminRequest('POST', { action: 'login', password });
      setPassword('');
      await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  async function save(action: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await adminRequest('POST', { action, ...payload });
      await refresh();
      setMessage(success);
    } catch (failure) {
      const issue = failure as Error & { status?: number };
      if (issue.status === 401) setStatus('login');
      setError(issue.message);
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await adminRequest('POST', { action: 'logout' }); }
    finally { setData(null); setStatus('login'); setBusy(false); setMessage(''); }
  }

  if (status === 'loading') return <div className="admin-loading"><Mark /><span>Opening the control room</span></div>;
  if (status === 'unconfigured') return <div className="admin-gate"><a className="admin-gate-brand" href="/"><Mark /><strong>VLAD.</strong></a><div className="admin-gate-main"><span className="admin-kicker">Control room / Setup needed</span><h1>Admin access<br />is not configured.</h1><p>Set <code>ADMIN_PASSWORD</code> and a random <code>ADMIN_SESSION_SECRET</code> of at least 32 characters on the server, then redeploy.</p><a href="/" className="admin-text-link">Return to public site <ArrowUpRight size={18} /></a></div></div>;
  if (status === 'login') return <div className="admin-gate"><a className="admin-gate-brand" href="/"><Mark /><strong>VLAD.</strong></a><div className="admin-gate-main"><span className="admin-kicker">Private / Control room</span><h1>Behind<br />the glass.</h1><p>Sign in to manage the public site and its portfolio.</p><form onSubmit={signIn} className="admin-login-form"><input type="hidden" name="username" autoComplete="username" value="admin" /><label htmlFor="admin-password">Admin password</label><div className="admin-password-wrap"><LockKeyhole size={19} /><input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{error && <p className="admin-error" role="alert">{error}</p>}<button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Checking…' : 'Enter control room'}<ArrowDownRight size={19} /></button></form><a href="/" className="admin-text-link">View the public site <ArrowUpRight size={18} /></a></div><div className="admin-gate-side"><span>V / 01</span><div className="admin-gate-watermark">VLAD<span>.</span></div><p>No real money or orders are involved.<br />The public record labels admin entries.</p></div></div>;

  const snapshot = data!.snapshot;
  const sections: Array<[Section, string]> = [['overview', 'Overview'], ['site', 'Site & stream'], ['simulation', 'Rules'], ['ledger', 'Trade ledger']];
  return <div className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="/"><Mark /><strong>VLAD.</strong><small>Control room</small></a><nav aria-label="Admin sections">{sections.map(([key, label], index) => <button type="button" key={key} className={section === key ? 'active' : ''} onClick={() => { setSection(key); setMessage(''); setError(''); }}><span>{String(index + 1).padStart(2, '0')}</span>{label}<ArrowUpRight size={16} /></button>)}</nav><div className="admin-sidebar-foot"><span className="admin-sidebar-state"><i /> Connected to {data!.storage}</span><a href="/" target="_blank" rel="noreferrer">Open public site <ArrowUpRight size={16} /></a><button type="button" onClick={() => void signOut()} disabled={busy}>Sign out <LogOut size={16} /></button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><span>Vlad the Fish Trader / {sections.find(([key]) => key === section)?.[1]}</span><div><span className="admin-access-label">Private controls</span><button type="button" aria-label="Refresh admin data" title="Refresh admin data" onClick={() => void refresh()}><RefreshCw size={17} /></button></div></header><div className="admin-content">
      {message && <div className="admin-flash success" role="status"><Check size={18} />{message}</div>}
      {error && <div className="admin-flash error" role="alert">{error}</div>}
      {section === 'overview' && <><div className="admin-heading"><span className="admin-kicker">01 / Overview</span><h1>The state<br />of the tank.</h1><p>Changes saved here appear on the public site. {data!.storage === 'SQLite ledger' ? 'Camera observations can update this ledger when a tracker is connected.' : 'The camera tracker runs on a separate service.'}</p></div><div className="admin-overview-value"><span>Portfolio value</span><strong>{money(snapshot.portfolioValue)}</strong><small>{snapshot.totalPnl >= 0 ? '+' : ''}{money(snapshot.totalPnl)} since the $10,000 starting balance</small></div><div className="admin-stat-row"><div><span>Cash balance</span><strong>{money(snapshot.cash)}</strong></div><div><span>Trades</span><strong>{snapshot.tradesCount}</strong></div><div><span>Stream</span><strong>{snapshot.youtubeVideoId ? 'Configured' : 'Pending'}</strong></div></div><div className="admin-overview-links"><button onClick={() => setSection('site')}>Edit site & stream <ArrowUpRight size={18} /></button><button onClick={() => setSection('ledger')}>Manage trade ledger <ArrowUpRight size={18} /></button></div></>}
      {section === 'site' && <><div className="admin-heading"><span className="admin-kicker">02 / Site & stream</span><h1>What visitors<br />will see.</h1><p>Change the opening lines and the video placeholder. Add Vlad’s YouTube Live watch URL or video ID when the stream is ready. The no-real-money notice stays visible.</p></div><form className="admin-form" onSubmit={(event) => { event.preventDefault(); void save('saveSite', { site }, 'Site settings saved. The public page will update on its next refresh.'); }}><div className="admin-form-grid"><label>First headline line<input value={site.heroLineOne} maxLength={80} onChange={(event) => setSite({ ...site, heroLineOne: event.target.value })} required /></label><label>Second headline line<input value={site.heroLineTwo} maxLength={80} onChange={(event) => setSite({ ...site, heroLineTwo: event.target.value })} required /></label><label>Stream placeholder title<input value={site.liveTitle} maxLength={80} onChange={(event) => setSite({ ...site, liveTitle: event.target.value })} required /></label><label>Stream placeholder note<textarea rows={3} value={site.liveNote} maxLength={180} onChange={(event) => setSite({ ...site, liveNote: event.target.value })} required /></label></div><div className="admin-form-divider" /><label>YouTube Live video ID or URL<input value={site.youtubeVideoId || ''} onChange={(event) => setSite({ ...site, youtubeVideoId: event.target.value })} placeholder="Paste a YouTube Live watch URL when available" /><small>Leave blank to keep the temporary visual. Only YouTube video IDs are accepted.</small></label><div className="admin-form-actions"><button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save site settings'}<ArrowUpRight size={18} /></button></div></form></>}
      {section === 'simulation' && <><div className="admin-heading"><span className="admin-kicker">03 / Rules</span><h1>Set the<br />rules.</h1><p>Set the zone hold time, cooldown, and trade amount. On this site they update the displayed method; the camera tracker runs on a separate server.</p></div><form className="admin-form" onSubmit={(event) => { event.preventDefault(); void save('saveRules', { rules: { dwellMs: Number(dwell) * 1000, cooldownMs: Number(cooldown) * 1000, orderNotional: Number(amount) } }, 'Rules saved.'); }}><div className="admin-rule-grid"><label><span>Hold time</span><div><input type="number" min="1" max="30" step="1" value={dwell} onChange={(event) => setDwell(event.target.value)} required /><em>seconds</em></div><small>Time needed in a coin or action zone.</small></label><label><span>Cooldown</span><div><input type="number" min="1" max="300" step="1" value={cooldown} onChange={(event) => setCooldown(event.target.value)} required /><em>seconds</em></div><small>Wait after a trade is recorded.</small></label><label><span>Trade amount</span><div><input type="number" min="1" max="10000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /><em>USD</em></div><small>Amount recorded for each camera signal.</small></label></div><div className="admin-form-actions"><button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save rules'}<ArrowUpRight size={18} /></button></div></form></>}
      {section === 'ledger' && <><div className="admin-heading"><span className="admin-kicker">04 / Trade ledger</span><h1>Edit the<br />ledger.</h1><p>Prices and manual trades are stored in the site's database. All entries are fictional; adding one does not place an order. Manual trades are labelled “Admin” in the public history, never presented as Vlad’s camera decisions.</p></div><div className="admin-ledger-summary"><span>Cash balance <strong>{money(snapshot.cash)}</strong></span><span>Portfolio value <strong>{money(snapshot.portfolioValue)}</strong></span></div><section className="admin-ledger-section"><div className="admin-section-head"><h2>Prices</h2><p>You set these prices. They are not live market quotes.</p></div><div className="admin-price-table">{SYMBOLS.map((coin) => <form key={coin.symbol} onSubmit={(event) => { event.preventDefault(); void save('saveQuote', { quote: { symbol: coin.symbol, price: Number(prices[coin.symbol]) } }, `${coin.symbol} price saved.`); }}><div className="admin-coin"><strong>{coin.symbol}</strong><span>{coin.name}</span></div><label><span className="sr-only">{coin.symbol} price in USD</span><span>$</span><input type="number" min="0.0000000001" max="1000000" step="any" value={prices[coin.symbol] || ''} onChange={(event) => setPrices({ ...prices, [coin.symbol]: event.target.value })} required /></label><button type="submit" disabled={busy}>Save <ArrowUpRight size={16} /></button></form>)}</div></section><section className="admin-ledger-section"><div className="admin-section-head"><h2>Add a trade</h2><p>Uses the displayed price. The entry is permanent and marked as an admin action.</p></div><form className="admin-trade-form" onSubmit={(event) => { event.preventDefault(); void save('addTrade', { trade: { symbol: tradeSymbol, side: tradeSide, notional: Number(tradeAmount) } }, `${tradeSide} ${tradeSymbol} trade recorded.`); }}><label>Coin<select value={tradeSymbol} onChange={(event) => setTradeSymbol(event.target.value as SymbolCode)}>{SYMBOLS.map((coin) => <option key={coin.symbol} value={coin.symbol}>{coin.symbol} / {coin.name}</option>)}</select></label><label>Side<select value={tradeSide} onChange={(event) => setTradeSide(event.target.value as TradeSide)}><option value="BUY">BUY</option><option value="SELL">SELL</option></select></label><label>Amount (USD)<input type="number" min="1" max="10000" step="0.01" value={tradeAmount} onChange={(event) => setTradeAmount(event.target.value)} required /></label><button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Recording…' : 'Add trade'}<ArrowUpRight size={18} /></button></form><div className="admin-trade-reference">Current {tradeSymbol} price: {priceMoney(snapshot.quotes.find((quote) => quote.symbol === tradeSymbol)?.price || 0)}</div></section><section className="admin-ledger-section"><div className="admin-section-head"><h2>Recent entries</h2><p>Latest first, including the generated history.</p></div><div className="admin-trade-list">{snapshot.trades.slice(0, 10).map((trade) => <div key={trade.id}><span className={trade.side === 'BUY' ? 'buy' : 'sell'}>{trade.side}</span><strong>{trade.symbol}</strong><span>{money(trade.notional)}</span><small>{trade.source === 'generated' ? 'Generated' : trade.source === 'admin' ? 'Admin' : 'Camera'} / {stamp(trade.executedAt)}</small></div>)}</div></section></>}
    </div></main>
  </div>;
}
