import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, CircleHelp, Crosshair, ExternalLink, Fish, Menu, Radio, Scan, ShieldCheck, Waves, X } from 'lucide-react';
import type { Snapshot, EquityPoint, Trade } from '../shared/types';
import { SYMBOLS, type ZoneCode } from '../shared/catalog';
const WaterField = lazy(() => import('./WaterField'));

const money = (value: number, digits = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const signedMoney = (value: number) => `${value >= 0 ? '+' : '−'}${money(Math.abs(value))}`;
const signedPercent = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`;
const number = (value: number, digits = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const time = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return time(value);
};

function useSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  useEffect(() => {
    let active = true;
    fetch('/api/snapshot').then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<Snapshot>;
    }).then((snapshot) => { if (active) { setData(snapshot); setConnection('connected'); } })
      .catch(() => { if (active) setConnection('offline'); });
    const events = new EventSource('/api/stream');
    events.addEventListener('snapshot', (event) => {
      if (!active) return;
      try { setData(JSON.parse((event as MessageEvent).data) as Snapshot); setConnection('connected'); }
      catch { /* Wait for the next complete packet. */ }
    });
    events.onerror = () => { if (active) setConnection('offline'); };
    return () => { active = false; events.close(); };
  }, []);
  return { data, connection };
}

function BrandMark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M4 20c8-9 17-11 25-5l8-8v26l-8-8C21 31 12 29 4 20Z" fill="currentColor" />
    <path d="M14 18c4-4 9-5 14-3M13 23c5 4 10 4 15 2" stroke="#082732" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="19" r="1.7" fill="#082732" />
  </svg>;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header">
    <a href="#top" className="brand" aria-label="Vlad the Fish Trader, home"><span className="brand-icon"><BrandMark /></span><span>VLAD<span className="brand-dot">.</span><small>THE FISH TRADER</small></span></a>
    <nav className={menuOpen ? 'site-nav is-open' : 'site-nav'} aria-label="Main navigation">
      <a href="#live" onClick={() => setMenuOpen(false)}>Live tank</a>
      <a href="#portfolio" onClick={() => setMenuOpen(false)}>Portfolio</a>
      <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
      <a href="#journal" onClick={() => setMenuOpen(false)}>Journal</a>
    </nav>
    <a className="header-status" href="#methodology"><span className="status-pulse" />Paper trading only</a>
    <button className="menu-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
  </header>;
}

function SectionHeading({ kicker, title, description, light = false }: { kicker: string; title: string; description?: string; light?: boolean }) {
  return <div className={`section-heading ${light ? 'section-heading-light' : ''}`}><div className="section-kicker"><span className="section-kicker-line" />{kicker}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

function LiveCam({ data }: { data: Snapshot | null }) {
  const live = Boolean(data?.youtubeVideoId);
  return <div className="cam-frame" id="live">
    <div className="cam-topline"><span><Radio size={15} /> Vlad cam</span><span className={live ? 'cam-state configured' : 'cam-state'}><i />{live ? 'YouTube player ready' : 'Awaiting live feed'}</span></div>
    <div className="cam-media">
      {live ? <iframe src={`https://www.youtube-nocookie.com/embed/${data!.youtubeVideoId}?playsinline=1&rel=0`} title="Vlad the Fish Trader live tank stream" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <><img src="/vlad-placeholder.png" alt="Temporary illustration of a goldfish in an aquarium while Vlad's live stream is not connected" /><div className="cam-placeholder-copy"><span className="cam-prelabel">Temporary visual</span><strong>Vlad will be here.</strong><span>Connect the YouTube Live video ID to start the broadcast.</span></div></>}
      <div className="cam-corner tl" /><div className="cam-corner tr" /><div className="cam-corner bl" /><div className="cam-corner br" />
    </div>
    <div className="cam-bottomline"><span><span className="cam-indicator" />{data?.signal.cameraConnected ? 'Tracker connected' : 'Tracker not connected'}</span><span>Feed and trading signals are separate systems</span></div>
  </div>;
}

function Hero({ data, connection }: { data: Snapshot | null; connection: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-word', { yPercent: 115, opacity: 0, duration: 1.05, stagger: 0.11 }, 0.1)
        .from('.hero-support', { y: 18, opacity: 0, duration: 0.75 }, 0.42)
        .from('.hero-actions', { y: 16, opacity: 0, duration: 0.7 }, 0.56)
        .from('.cam-frame', { scale: 0.965, opacity: 0, duration: 1.05 }, 0.32);
    }, root);
    return () => context.revert();
  }, []);
  return <section className="hero" id="top" ref={root}>
    <Suspense fallback={null}><WaterField /></Suspense>
    <div className="hero-halo" aria-hidden="true" />
    <div className="hero-inner page-width">
      <div className="hero-copy">
        <div className="hero-overline"><span className="hero-line" />A real fish. A virtual portfolio.</div>
        <h1><span className="hero-line-wrap"><span className="hero-word">One fish.</span></span><span className="hero-line-wrap"><span className="hero-word">One portfolio.</span></span><span className="hero-line-wrap"><span className="hero-word hero-word-accent">Zero financial</span></span><span className="hero-line-wrap"><span className="hero-word hero-word-accent">education.</span></span></h1>
        <p className="hero-support">Meet Vlad, the fish whose movements choose stocks. Every decision is visible. Every trade is simulated. The market has never had a smaller analyst.</p>
        <div className="hero-actions"><a className="button button-primary" href="#live">Watch the tank <ArrowRight size={18} /></a><a className="button button-secondary" href="#portfolio">Explore the portfolio <ArrowDownRight size={17} /></a></div>
        <div className="hero-footnote"><span className="hero-footnote-icon"><ShieldCheck size={16} /></span><span>{connection === 'offline' ? 'Data connection offline' : data?.mode === 'demo' ? 'Preview mode · sample paper session' : 'Live observations · paper orders only'}<br /><strong>No real money moves on this site.</strong></span></div>
      </div>
      <div className="hero-visual"><LiveCam data={data} /><div className="hero-visual-caption"><span>01 / The observation deck</span><span>Scroll to see what Vlad picked <ArrowDownRight size={15} /></span></div></div>
    </div>
  </section>;
}

function QuoteRibbon({ data }: { data: Snapshot | null }) {
  return <div className="quote-ribbon"><div className="quote-ribbon-inner page-width"><span className="quote-title">The tank watchlist</span><div className="quote-items">{data?.quotes.length ? data.quotes.map((quote) => {
    const change = quote.previousClose ? (quote.price / quote.previousClose - 1) * 100 : 0;
    return <div className="quote-item" key={quote.symbol}><strong>{quote.symbol}</strong><span>{money(quote.price)}</span><em className={change >= 0 ? 'positive' : 'negative'}>{signedPercent(change)}</em></div>;
  }) : <span className="quote-empty">Reference prices are not connected</span>}</div><span className="quote-source">{data?.mode === 'demo' ? 'Scenario prices' : data?.lastQuoteAt ? `Quote as of ${relativeTime(data.lastQuoteAt)}` : 'Quotes offline'}</span></div></div>;
}

function MetricCard({ label, value, detail, trend, featured = false, icon }: { label: string; value: string; detail: string; trend?: number; featured?: boolean; icon?: React.ReactNode }) {
  return <div className={`metric-card ${featured ? 'metric-featured' : ''}`}><div className="metric-head"><span>{label}</span>{icon && <span className="metric-icon">{icon}</span>}</div><div className="metric-value">{value}</div><div className="metric-detail">{typeof trend === 'number' && <span className={trend >= 0 ? 'metric-trend positive' : 'metric-trend negative'}>{trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{signedPercent(trend)}</span>}<span>{detail}</span></div></div>;
}

function Overview({ data }: { data: Snapshot | null }) {
  const lastPick = data?.signal.selectedSymbol || data?.trades[0]?.symbol;
  return <section className="overview page-width" id="portfolio"><div className="overview-heading"><SectionHeading kicker="The paper fund" title="A portfolio with fins." description="A running record of Vlad's simulated positions, measured against the same starting cash placed in SPY." /><span className="data-stamp"><span />{data?.pricingLabel || 'Connecting to the ledger'}{data?.mode === 'live' && data.lastQuoteAt ? ` · as of ${relativeTime(data.lastQuoteAt)}` : ''}</span></div>
    <div className="metric-grid"><MetricCard featured label="Portfolio value" value={data ? money(data.portfolioValue) : '—'} detail={data ? `${signedMoney(data.totalPnl)} since inception` : 'Waiting for the ledger'} trend={data?.totalPnlPercent} icon={<Waves size={21} />} /><MetricCard label="Today’s P&L" value={data ? signedMoney(data.todayPnl) : '—'} detail="New York market day" trend={data?.todayPnlPercent} icon={<Activity size={20} />} /><MetricCard label={data?.signal.cameraConnected ? 'Current pick' : 'Last paper pick'} value={lastPick || '—'} detail={data?.signal.cameraConnected ? data.signal.selectedSymbol ? 'Waiting for buy or sell' : 'Vlad is choosing' : 'Tracker awaiting Vlad'} icon={<Crosshair size={20} />} /><MetricCard label="Virtual cash" value={data ? money(data.cash) : '—'} detail={data ? `${data.tradesCount} paper trades on record` : 'Starting at $10,000'} icon={<ShieldCheck size={20} />} /></div>
  </section>;
}

type Range = '1D' | '7D' | 'ALL';
function pathFor(points: EquityPoint[], key: 'value' | 'benchmarkValue', minimum: number, maximum: number) {
  if (points.length === 0) return '';
  const height = 240;
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${(index / Math.max(1, points.length - 1)) * 940 + 30} ${30 + height - ((point[key] - minimum) / Math.max(1, maximum - minimum)) * height}`).join(' ');
}

function PerformanceChart({ data }: { data: Snapshot | null }) {
  const [range, setRange] = useState<Range>('ALL');
  const [hover, setHover] = useState<number | null>(null);
  const all = data?.equity || [];
  const points = useMemo(() => {
    const cutoff = Date.now() - (range === '1D' ? 86_400_000 : range === '7D' ? 7 * 86_400_000 : Infinity);
    const filtered = all.filter((point) => Date.parse(point.at) >= cutoff);
    return filtered.length > 1 ? filtered : all;
  }, [all, range]);
  const values = points.flatMap((point) => [point.value, point.benchmarkValue]);
  const minimum = values.length ? Math.min(...values) - 10 : 9_950;
  const maximum = values.length ? Math.max(...values) + 10 : 10_050;
  const valuePath = pathFor(points, 'value', minimum, maximum);
  const benchmarkPath = pathFor(points, 'benchmarkValue', minimum, maximum);
  const active = hover === null ? points.at(-1) : points[hover];
  const trend = data?.totalPnlPercent || 0;
  return <div className="performance-panel"><div className="panel-head"><div><span className="panel-kicker">Portfolio performance</span><h3>Vlad versus the index</h3></div><div className="range-controls" aria-label="Chart time range">{(['1D', '7D', 'ALL'] as const).map((option) => <button type="button" key={option} className={range === option ? 'selected' : ''} onClick={() => { setRange(option); setHover(null); }} aria-pressed={range === option}>{option === 'ALL' ? 'All' : option}</button>)}</div></div>
    <div className="chart-summary"><strong>{data ? money(active?.value ?? data.portfolioValue) : '—'}</strong><span className={trend >= 0 ? 'positive' : 'negative'}>{data ? signedPercent(trend) : '—'} all time</span><span className="chart-date">{active ? time(active.at) : 'Waiting for data'}</span></div>
    <div className="chart-wrap"><div className="chart-y-axis"><span>{money(maximum, 0)}</span><span>{money((maximum + minimum) / 2, 0)}</span><span>{money(minimum, 0)}</span></div><svg className="performance-chart" viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Portfolio value chart comparing Vlad and a SPY buy-and-hold benchmark" onPointerMove={(event) => { if (!points.length) return; const box = event.currentTarget.getBoundingClientRect(); setHover(Math.min(points.length - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (points.length - 1))))); }} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34bda8" stopOpacity=".27" /><stop offset="100%" stopColor="#34bda8" stopOpacity="0" /></linearGradient></defs>
      {[30, 150, 270].map((y) => <line key={y} x1="30" y1={y} x2="970" y2={y} className="chart-grid" />)}
      {points.length > 1 && <><path d={`${valuePath} L 970 270 L 30 270 Z`} fill="url(#chartFill)" /><path d={benchmarkPath} fill="none" stroke="#a1aaa7" strokeWidth="2.5" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" /><path d={valuePath} fill="none" stroke="#188d7d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />{hover !== null && active && <><line x1={(hover / Math.max(1, points.length - 1)) * 940 + 30} y1="30" x2={(hover / Math.max(1, points.length - 1)) * 940 + 30} y2="270" className="chart-cursor" /><circle cx={(hover / Math.max(1, points.length - 1)) * 940 + 30} cy={30 + 240 - ((active.value - minimum) / Math.max(1, maximum - minimum)) * 240} r="6" fill="#188d7d" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" /></>}</>}
    </svg></div><div className="chart-footer"><div className="chart-legend"><span><i className="legend-vlad" />Vlad's portfolio</span><span><i className="legend-spy" />SPY benchmark</span></div><span>{data?.mode === 'demo' ? 'Preview history · scenario prices' : 'Paper results · reference quotes'}</span></div></div>;
}

const zones: Array<{ label: ZoneCode; x: number; y: number; w: number; h: number }> = [
  { label: 'SPY', x: 0, y: 0, w: 33.333, h: 36 }, { label: 'NVDA', x: 33.333, y: 0, w: 33.333, h: 36 }, { label: 'TSLA', x: 66.666, y: 0, w: 33.334, h: 36 },
  { label: 'AAPL', x: 0, y: 36, w: 33.333, h: 36 }, { label: 'GOOGL', x: 33.333, y: 36, w: 33.333, h: 36 }, { label: 'MSFT', x: 66.666, y: 36, w: 33.334, h: 36 },
  { label: 'BUY', x: 0, y: 72, w: 50, h: 28 }, { label: 'SELL', x: 50, y: 72, w: 50, h: 28 },
];

function TankMap({ data }: { data: Snapshot | null }) {
  const signal = data?.signal;
  const stage = !signal?.cameraConnected ? 'Tracker waiting' : signal.stage === 'cooldown' ? 'Trade cooldown' : signal.selectedSymbol ? `${signal.selectedSymbol} selected` : signal.zone ? `Vlad is in ${signal.zone}` : 'Searching for Vlad';
  return <div className="tank-panel"><div className="panel-head"><div><span className="panel-kicker">Decision engine</span><h3>The tank is the trading floor.</h3></div><span className={`tracker-badge ${signal?.cameraConnected ? 'connected' : ''}`}><span />{signal?.cameraConnected ? 'Tracking' : 'Offline'}</span></div>
    <div className="tank-layout"><div className="tank-map" role="img" aria-label="Tank map with six stock selection zones above buy and sell action zones">
      <div className="tank-grain" />{zones.map((zone) => <div key={zone.label} className={`tank-zone ${zone.label === 'BUY' || zone.label === 'SELL' ? 'action-zone' : ''} ${signal?.zone === zone.label ? 'active' : ''} ${signal?.selectedSymbol === zone.label ? 'armed' : ''}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}><span>{zone.label}</span></div>)}
      {signal?.cameraConnected && signal.x !== null && signal.y !== null && <span className="fish-marker" style={{ left: `${signal.x * 100}%`, top: `${signal.y * 100}%` }}><Fish size={17} /></span>}
      <span className="tank-axis tank-axis-x">X / tank width</span><span className="tank-axis tank-axis-y">Y / tank depth</span>
    </div><div className="tank-readout"><div className="readout-icon"><Scan size={23} /></div><span className="readout-label">Current signal</span><strong>{stage}</strong><p>{!signal?.cameraConnected ? 'Connect the local camera tracker to see Vlad’s location here.' : signal.selectedSymbol ? 'The next five-second stay in BUY or SELL can create a paper trade.' : 'A five-second stay in a stock zone locks the pick.'}</p><div className="dwell-row"><span>Dwell progress</span><strong>{Math.round((signal?.dwellProgress || 0) * 100)}%</strong></div><div className="progress-track"><span style={{ width: `${(signal?.dwellProgress || 0) * 100}%` }} /></div><div className="readout-meta"><span>Hold <strong>{(data?.rules.dwellMs || 5000) / 1000}s</strong></span><span>Cooldown <strong>{(data?.rules.cooldownMs || 30000) / 1000}s</strong></span></div></div></div>
    <div className="tank-foot">The YouTube player shows the broadcast. Trading signals come from a separate camera tracker, so stream delay cannot change an order.</div>
  </div>;
}

function PerformanceSection({ data }: { data: Snapshot | null }) {
  return <section className="performance-section page-width"><div className="performance-grid"><PerformanceChart data={data} /><div className="race-panel"><div className="race-head"><span className="panel-kicker">Head-to-head</span><h3>Fish vs. benchmark</h3><p>Both start with {money(data?.initialCash || 10000)} in virtual value.</p></div><div className="race-track"><div className="race-row"><div><span className="race-avatar"><BrandMark size={23} /></span><strong>Vlad</strong></div><span className={(data?.totalPnlPercent || 0) >= 0 ? 'positive' : 'negative'}>{data ? signedPercent(data.totalPnlPercent) : '—'}</span></div><div className="race-bar"><span style={{ width: `${Math.min(94, Math.max(16, 50 + (data?.totalPnlPercent || 0) * 8))}%` }} /></div><div className="race-row"><div><span className="race-avatar race-spy">S</span><strong>S&P 500</strong></div><span className={(data?.benchmarkPnlPercent || 0) >= 0 ? 'positive' : 'negative'}>{data ? signedPercent(data.benchmarkPnlPercent) : '—'}</span></div><div className="race-bar race-bar-spy"><span style={{ width: `${Math.min(94, Math.max(16, 50 + (data?.benchmarkPnlPercent || 0) * 8))}%` }} /></div></div><div className="race-verdict"><span>Current lead</span><strong>{data ? Math.abs(data.totalPnlPercent - data.benchmarkPnlPercent) < .005 ? 'Too close to call' : data.totalPnlPercent > data.benchmarkPnlPercent ? 'Vlad, for now.' : 'The index, for now.' : 'Waiting for prices'}</strong><small>A comparison, not a prediction.</small></div></div></div><TankMap data={data} /></section>;
}

function Holdings({ data }: { data: Snapshot | null }) {
  return <section className="holdings-section page-width"><div className="holdings-head"><SectionHeading kicker="Inside the bowl" title="What Vlad owns." description="In a connected session, positions change only after Vlad completes a valid paper signal. Preview holdings are labelled sample data." /><div className="holdings-total"><span>Invested value</span><strong>{data ? money(data.portfolioValue - data.cash) : '—'}</strong></div></div><div className="holdings-table-wrap"><table className="holdings-table"><thead><tr><th>Asset</th><th>Shares</th><th>Market value</th><th>Unrealized P&L</th><th>Day move</th></tr></thead><tbody>{data?.positions.length ? data.positions.map((position) => <tr key={position.symbol}><td><span className="asset-symbol">{position.symbol}</span><span className="asset-name">{SYMBOLS.find((item) => item.symbol === position.symbol)?.name}</span></td><td>{number(position.shares, 4)}</td><td>{money(position.marketValue)}</td><td className={position.unrealizedPnl >= 0 ? 'positive' : 'negative'}>{signedMoney(position.unrealizedPnl)}</td><td className={position.dayChangePercent >= 0 ? 'positive' : 'negative'}>{signedPercent(position.dayChangePercent)}</td></tr>) : <tr><td colSpan={5} className="empty-table">No positions yet. Vlad’s first completed buy will appear here.</td></tr>}</tbody></table></div></section>;
}

function TradeHistory({ data }: { data: Snapshot | null }) {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [expanded, setExpanded] = useState(false);
  const trades = (data?.trades || []).filter((trade) => filter === 'ALL' || trade.side === filter);
  const shown = expanded ? trades : trades.slice(0, 5);
  const newest = data?.trades[0]?.id;
  const newestRef = useRef<number | undefined>(newest);
  useEffect(() => {
    if (newestRef.current && newest && newest !== newestRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo('.trade-row:first-child', { backgroundColor: '#c9f5e7' }, { backgroundColor: 'transparent', duration: 2.4, ease: 'power2.out' });
    }
    newestRef.current = newest;
  }, [newest]);
  return <section className="journal-section" id="journal"><div className="page-width journal-grid"><div className="journal-intro"><SectionHeading kicker="The public record" title="Every fin movement leaves a trace." description="Selections, executed paper trades and skipped signals stay visible, so the story can be checked against the rules." light /><div className="journal-note"><ShieldCheck size={22} /><p>Every dollar and share on this page is virtual. A sample trade is labelled as such; camera trades appear only after a connected tracker sends a valid signal.</p></div></div><div className="journal-content"><div className="trade-panel"><div className="trade-panel-header"><div><span className="panel-kicker">Ledger</span><h3>Trade history</h3></div><div className="trade-filters" aria-label="Filter trades">{(['ALL', 'BUY', 'SELL'] as const).map((option) => <button type="button" key={option} className={filter === option ? 'selected' : ''} aria-pressed={filter === option} onClick={() => { setFilter(option); setExpanded(false); }}>{option === 'ALL' ? 'All' : option === 'BUY' ? 'Buys' : 'Sells'}</button>)}</div></div><div className="trade-list">{shown.length ? shown.map((trade: Trade) => <div className="trade-row" key={trade.id}><span className={`trade-side ${trade.side === 'BUY' ? 'buy' : 'sell'}`}>{trade.side === 'BUY' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}</span><div className="trade-main"><strong>{trade.side === 'BUY' ? 'Bought' : 'Sold'} {trade.symbol}</strong><span>{number(trade.shares, 4)} shares at {money(trade.price)} · {trade.source === 'sample' ? 'Sample' : 'Camera'}</span></div><div className="trade-end"><strong>{money(trade.notional)}</strong><span>{relativeTime(trade.executedAt)}</span></div></div>) : <div className="trade-empty">No {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}paper trades to show yet.</div>}</div>{trades.length > 5 && <button className="trade-more" type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer trades' : `Show all ${trades.length} trades`}<ChevronDown size={17} className={expanded ? 'rotated' : ''} /></button>}</div><div className="activity-panel"><div className="activity-head"><span className="panel-kicker">Signal log</span><span>Latest first</span></div>{data?.activity.length ? data.activity.slice(0, 5).map((entry) => <div className="activity-row" key={entry.id}><span className={`activity-dot ${entry.kind}`} /><p>{entry.message}</p><time>{relativeTime(entry.createdAt)}</time></div>) : <p className="activity-empty">The first signal will appear here.</p>}</div></div></div></section>;
}

function HowItWorks({ data }: { data: Snapshot | null }) {
  return <section className="how-section page-width" id="how-it-works"><SectionHeading kicker="Under the surface" title="How a swim becomes a signal." description="A deliberate two-step rule keeps the fish in charge while limiting accidental repeat trades." /><div className="process-grid"><div className="process-step"><span className="process-icon"><Radio size={24} /></span><span className="process-number">01</span><h3>The camera watches</h3><p>A local tracker observes Vlad’s position in the tank. The YouTube Live player broadcasts the same scene to viewers.</p></div><div className="process-step"><span className="process-icon"><Crosshair size={24} /></span><span className="process-number">02</span><h3>Vlad picks a stock</h3><p>Six tank zones represent SPY, NVDA, TSLA, AAPL, GOOGL and MSFT. A stay of {(data?.rules.dwellMs || 5000) / 1000} seconds selects one.</p></div><div className="process-step"><span className="process-icon"><Waves size={24} /></span><span className="process-number">03</span><h3>Vlad chooses a side</h3><p>He then stays in BUY or SELL for another five seconds. A cooldown stops one lingering swim from repeating the order.</p></div><div className="process-step"><span className="process-icon"><ShieldCheck size={24} /></span><span className="process-number">04</span><h3>The ledger records it</h3><p>A fresh reference price fills a virtual {money(data?.rules.orderNotional || 500, 0)} order when cash or shares allow it. No broker or wallet is connected.</p></div></div><div className="process-callout" id="methodology"><div><CircleHelp size={25} /><strong>Why two steps?</strong></div><p>The fish must select an asset and then an action. Both require a timed stay. Low-confidence tracking, stale prices, closed markets and insufficient virtual funds cause a visible skip, not a trade.</p><a href="/docs/METHODOLOGY.md" target="_blank" rel="noreferrer">Read the full methodology <ArrowRight size={16} /></a></div></section>;
}

function Research() {
  return <section className="research-section"><div className="page-width research-grid"><div><SectionHeading kicker="Field notes" title="A fish story with receipts." description="The project borrows the spectacle of fish-driven trading, then keeps the money, prices and decision rules explicit." /><a className="research-primary" href="https://www.youtube.com/watch?v=USKD3vPD6ZA" target="_blank" rel="noreferrer"><div className="research-cover"><img src="/vlad-placeholder.png" alt="Aquarium scene used as a temporary editorial visual" /><span>Temporary art / Watch the reference <ExternalLink size={17} /></span></div><div className="research-text"><span>Reference film</span><strong>I Gave My Goldfish $50,000 to Trade Stocks</strong><p>Michael Reeves’ video is the creative spark. Vlad’s rules, data and visuals here are independently built.</p></div></a></div><div className="research-links"><div className="research-link-intro"><span>Reading list</span><p>Primary sources behind the public interface and its constraints.</p></div><a href="https://docs.ponsfamily.com/v2" target="_blank" rel="noreferrer"><span>01</span><div><strong>Pons v2 protocol docs</strong><small>Tokenized-stock pairs are a protocol context, not real stock trades on this site.</small></div><ExternalLink size={17} /></a><a href="https://developers.google.com/youtube/player_parameters" target="_blank" rel="noreferrer"><span>02</span><div><strong>YouTube embed documentation</strong><small>How the public live video reaches the site.</small></div><ExternalLink size={17} /></a><a href="https://twelvedata.com/docs/markets/market-state" target="_blank" rel="noreferrer"><span>03</span><div><strong>Twelve Data quote reference</strong><small>Optional server-side market quote adapter for paper fills.</small></div><ExternalLink size={17} /></a><a href="https://x.com/flxrnc/status/2117318336837017846" target="_blank" rel="noreferrer"><span>04</span><div><strong>Motion tooling reference</strong><small>GSAP and Three.js are used for the browser experience.</small></div><ExternalLink size={17} /></a></div></div></section>;
}

function Footer({ data }: { data: Snapshot | null }) {
  return <footer className="site-footer"><div className="page-width footer-main"><div><div className="footer-brand"><BrandMark size={44} /><span>VLAD.</span></div><p>One fish. One portfolio.<br />Zero financial education.</p></div><div className="footer-links"><div><strong>Explore</strong><a href="#live">Live tank</a><a href="#portfolio">Portfolio</a><a href="#journal">Trade history</a></div><div><strong>Understand</strong><a href="#how-it-works">How it works</a><a href="/docs/METHODOLOGY.md" target="_blank" rel="noreferrer">Methodology</a><a href="https://docs.ponsfamily.com/v2" target="_blank" rel="noreferrer">Pons v2 docs</a></div></div></div><div className="footer-bottom page-width"><span>© {new Date().getFullYear()} Vlad the Fish Trader</span><span>Simulated portfolio · {data?.mode === 'demo' ? 'sample preview data' : 'paper orders'} · no financial advice</span><a href="#top">Back to top ↑</a></div></footer>;
}

export default function App() {
  const { data, connection } = useSnapshot();
  return <><Header /><main><Hero data={data} connection={connection} /><QuoteRibbon data={data} /><Overview data={data} /><PerformanceSection data={data} /><Holdings data={data} /><TradeHistory data={data} /><HowItWorks data={data} /><Research /></main><Footer data={data} /></>;
}
