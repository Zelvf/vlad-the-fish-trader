import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowDownRight, ArrowUpRight, ChevronDown, ExternalLink, Menu, X } from 'lucide-react';
import type { EquityPoint, Snapshot, Trade } from '../shared/types';
import { BENCHMARK_SYMBOL, SYMBOLS, type ZoneCode } from '../shared/catalog';

gsap.registerPlugin(ScrollTrigger);
const WaterField = lazy(() => import('./WaterField'));

const money = (value: number, digits = 2) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value);
const priceMoney = (value: number) => money(value, value >= 1 ? 2 : value >= .01 ? 4 : value >= .0001 ? 6 : value >= .000001 ? 8 : 10);
const signedMoney = (value: number) => `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`;
const signedPercent = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}%`;
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
    const fetchSnapshot = () => fetch('/api/snapshot')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Snapshot>;
      })
      .then((snapshot) => { if (active) { setData(snapshot); setConnection('connected'); } })
      .catch(() => { if (active) setConnection('offline'); });
    void fetchSnapshot();
    if (import.meta.env.MODE === 'vercel') {
      const timer = window.setInterval(() => { void fetchSnapshot(); }, 60_000);
      return () => { active = false; window.clearInterval(timer); };
    }
    const events = new EventSource('/api/stream');
    events.addEventListener('snapshot', (event) => {
      if (!active) return;
      try { setData(JSON.parse((event as MessageEvent).data) as Snapshot); setConnection('connected'); }
      catch { /* A later complete snapshot will replace this packet. */ }
    });
    events.onerror = () => { if (active) setConnection('offline'); };
    return () => { active = false; events.close(); };
  }, []);
  return { data, connection };
}

function BrandMark({ size = 26 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M4 20c8-9 17-11 25-5l8-8v26l-8-8C21 31 12 29 4 20Z" fill="currentColor" />
    <path d="M14 18c4-4 9-5 14-3M13 23c5 4 10 4 15 2" stroke="#08090b" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="19" r="1.7" fill="#08090b" />
  </svg>;
}

function RevealTitle({ lines }: { lines: string[] }) {
  return <h2 className="reveal-title" aria-label={lines.join(' ')}>{lines.map((line) => <span className="reveal-line" key={line}><span aria-hidden="true">{line}</span></span>)}</h2>;
}

function Header({ data }: { data: Snapshot | null }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open]);
  useEffect(() => {
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = gsap.from('.menu-panel a', { y: 38, opacity: 0, duration: .6, stagger: .055, ease: 'power3.out' });
    return () => { animation.kill(); };
  }, [open]);
  const close = () => setOpen(false);
  return <header className="site-header">
    <a className="wordmark" href="#top" onClick={close} aria-label="Vlad the Fish Trader, back to top"><BrandMark /><span>VLAD<span className="wordmark-period">.</span></span></a>
    <div className="header-controls">
      <a className="header-live" href="#live"><span className={data?.youtubeVideoId ? 'status-dot is-ready' : 'status-dot'} />{data?.youtubeVideoId ? 'Watch Vlad' : 'Feed pending'}<ArrowDownRight size={14} /></a>
      <button className="menu-trigger" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}><span>{open ? 'Close' : 'Menu'}</span>{open ? <X size={17} /> : <Menu size={17} />}</button>
    </div>
    {open && <nav className="menu-panel" id="site-menu" aria-label="Main navigation">
      <span className="menu-caption">Explore the experiment</span>
      <a href="#live" onClick={close}>Live tank <span>01</span></a>
      <a href="#portfolio" onClick={close}>Portfolio <span>02</span></a>
      <a href="#tank-map" onClick={close}>Decision map <span>03</span></a>
      <a href="#journal" onClick={close}>Trade history <span>04</span></a>
      <a href="#how-it-works" onClick={close}>How it works <span>05</span></a>
      <p>Every trade on this site is simulated.</p>
    </nav>}
  </header>;
}

function Hero({ data, connection }: { data: Snapshot | null; connection: string }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  useEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.set(['.hero-scene-one', '.hero-scene-two'], { autoAlpha: 0, y: 55 });
      gsap.set('.hero-progress-fill', { scaleY: 0 });
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-name span', { yPercent: 105, duration: 1.25 }, 0.1)
        .from('.hero-name i', { opacity: 0, scale: 0.4, duration: 0.7 }, 0.68)
        .from('.hero-strap > *', { y: 24, opacity: 0, duration: 0.75, stagger: 0.12 }, 0.6)
        .from('.hero-topnote', { opacity: 0, duration: 0.8 }, 0.8);
      gsap.timeline({ scrollTrigger: {
        trigger: root.current,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 760 ? 1.65 : 2.25))}`,
        pin: true,
        scrub: .8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { progress.current = self.progress; },
      } })
        .to('.hero-name', { yPercent: 55, opacity: 0, duration: .78, ease: 'power2.in' }, 0)
        .to('.hero-strap', { y: 50, opacity: 0, duration: .65 }, 0)
        .to('.hero-sighting', { opacity: .18, duration: .5 }, .25)
        .to('.hero-scene-one', { autoAlpha: 1, y: 0, duration: .65, ease: 'power3.out' }, .5)
        .to('.hero-scene-one', { autoAlpha: 0, y: -55, duration: .5, ease: 'power2.in' }, 1.32)
        .to('.hero-scene-two', { autoAlpha: 1, y: 0, duration: .62, ease: 'power3.out' }, 1.6)
        .to('.hero-visual', { scale: 1.18, yPercent: -8, duration: 2.35, ease: 'none' }, 0)
        .to('.hero-progress-fill', { scaleY: 1, duration: 2.35, ease: 'none' }, 0);
    }, root);
    return () => context.revert();
  }, []);
  return <section className="hero" id="top" ref={root}>
    <div className="hero-visual"><Suspense fallback={null}><WaterField progress={progress} /></Suspense></div>
    <div className="hero-scrim" aria-hidden="true" />
    <div className="hero-topnote page-width"><span>Robinhood-listed meme coins. Simulated trades.</span><span>{connection === 'offline' ? 'Ledger offline' : data?.mode === 'demo' ? 'Sample preview' : 'Paper portfolio'}</span></div>
    <div className="hero-sighting" aria-hidden="true"><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span></div>
    <div className="hero-title-block">
      <h1 className="hero-name" aria-label="Vlad"><span>VLAD</span><i>.</i></h1>
      <div className="hero-strap page-width"><p>{data?.site.heroLineOne || 'One fish. Six meme coins.'}<br />{data?.site.heroLineTwo || 'Zero financial education.'}</p><a href="#premise">Scroll to explore <ArrowDown size={18} /></a></div>
    </div>
    <div className="hero-scene-copy hero-scene-one" aria-hidden="true"><span>Movement becomes a decision</span><p>THE FISH<br />MAKES THE CALL.</p><small>One tank. Eight zones.</small></div>
    <div className="hero-scene-copy hero-scene-two" aria-hidden="true"><span>Every choice leaves a trace</span><p>THE LEDGER<br />TELLS THE STORY.</p><small>Virtual money. Visible rules.</small></div>
    <div className="hero-progress" aria-hidden="true"><span>01</span><i><b className="hero-progress-fill" /></i><span>03</span></div>
    <div className="hero-disclosure page-width"><span className="status-dot" />Paper trading only. No real money moves here.</div>
  </section>;
}

function Premise() {
  return <section className="premise-section light-section" id="premise"><div className="page-width">
    <div className="chapter-label"><span>01 / The premise</span><span>Meet the fund manager</span></div>
    <div className="premise-grid"><RevealTitle lines={['The internet has', 'met its smallest', 'meme coin trader.']} /><div className="premise-copy"><p>Vlad is a fish. His movements choose from six meme coins listed on Robinhood, then pick BUY or SELL for a virtual portfolio.</p><p>Every decision is visible. Every fill is simulated. The ledger starts with $10,000 that exists only on this website. This project is independent of Robinhood.</p><a className="text-link" href="#live">Watch the tank <ArrowDownRight size={20} /></a></div></div>
  </div></section>;
}

function LiveStage({ data }: { data: Snapshot | null }) {
  const streamReady = Boolean(data?.youtubeVideoId);
  const selected = data?.signal.selectedSymbol || data?.trades[0]?.symbol;
  return <section className="live-section dark-section" id="live"><div className="page-width">
    <div className="chapter-label"><span>02 / The live tank</span><span>Vlad's world, uninterrupted</span></div>
    <div className="chapter-heading"><RevealTitle lines={['Watch the', 'decision happen.']} /><p>The video is the public view of the tank. A separate local camera tracker turns Vlad's location into a paper-trading signal.</p></div>
    <div className="live-grid"><div className="live-player"><div className="live-player-bar"><span><span className={streamReady ? 'status-dot is-ready' : 'status-dot'} />Vlad cam</span><span>{streamReady ? 'YouTube player configured' : 'Awaiting YouTube Live'}</span></div><div className="live-media reveal-media">
      {streamReady ? <iframe src={`https://www.youtube-nocookie.com/embed/${data!.youtubeVideoId}?playsinline=1&rel=0`} title="Vlad the Fish Trader live tank stream" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <><img src="/vlad-placeholder.png" alt="Generated temporary aquarium image; Vlad's stream has not been connected" /><div className="live-placeholder"><span>Temporary visual</span><strong>{data?.site.liveTitle || 'Vlad will be here.'}</strong><p>{data?.site.liveNote || 'The YouTube Live stream will appear here when its video ID is ready.'}</p></div></>}
    </div><div className="live-player-caption"><span>{streamReady ? 'Broadcast source / YouTube Live' : 'Broadcast source / pending'}</span><span>Stream and tracker are separate</span></div></div>
    <aside className="live-readout"><span className="aside-label">{data?.signal.cameraConnected ? 'Current pick' : 'Last paper pick'}</span><strong className="current-pick">{selected || '--'}</strong><p>{data?.signal.cameraConnected ? data.signal.selectedSymbol ? 'Selected. Vlad is choosing BUY or SELL.' : 'The tracker is watching Vlad choose.' : 'Camera tracking is waiting to connect.'}</p><div className="live-status-row"><span>Camera tracker</span><strong>{data?.signal.cameraConnected ? 'Connected' : 'Offline'}</strong></div><div className="live-status-row"><span>Paper orders</span><strong>{data?.tradesCount ?? 0} recorded</strong></div><div className="live-status-row"><span>Reference prices</span><strong>{data?.mode === 'demo' ? 'Scenario data' : data?.quotes.length ? 'CoinGecko' : 'Unavailable'}</strong></div><a className="text-link" href="#tank-map">See the tank map <ArrowDownRight size={19} /></a></aside></div>
  </div></section>;
}

function QuoteStrip({ data }: { data: Snapshot | null }) {
  return <div className="quote-strip" aria-label="Tank watchlist"><div className="quote-strip-inner page-width"><span className="quote-strip-label">Tank watchlist</span><div className="quote-list">{data?.quotes.length ? data.quotes.map((quote) => {
    const change = quote.price24hAgo ? (quote.price / quote.price24hAgo - 1) * 100 : null;
    return <span className="quote-entry" key={quote.symbol}><strong>{quote.symbol}</strong><span>{priceMoney(quote.price)}</span><em className={change === null ? '' : change >= 0 ? 'positive' : 'negative'}>{change === null ? '24h --' : `${signedPercent(change)} 24h`}</em></span>;
  }) : <span className="quote-empty">Reference prices are not connected</span>}</div><span className="quote-source">{data?.mode === 'demo' ? 'Scenario prices' : data?.lastQuoteAt ? <><a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">CoinGecko</a> · {relativeTime(data.lastQuoteAt)}</> : 'Quotes offline'}</span></div></div>;
}

type Range = '1D' | '7D' | 'ALL';
function pathFor(points: EquityPoint[], key: 'value' | 'benchmarkValue', minimum: number, maximum: number) {
  if (!points.length) return '';
  return points.map((point, index) => `${index ? 'L' : 'M'} ${(index / Math.max(1, points.length - 1)) * 940 + 30} ${30 + 240 - ((point[key] - minimum) / Math.max(1, maximum - minimum)) * 240}`).join(' ');
}

function PerformanceChart({ data }: { data: Snapshot | null }) {
  const [range, setRange] = useState<Range>('ALL');
  const [hover, setHover] = useState<number | null>(null);
  const chartRoot = useRef<HTMLDivElement>(null);
  const all = data?.equity || [];
  const points = useMemo(() => {
    const cutoff = Date.now() - (range === '1D' ? 86_400_000 : range === '7D' ? 7 * 86_400_000 : Infinity);
    const filtered = all.filter((point) => Date.parse(point.at) >= cutoff);
    return filtered.length > 1 ? filtered : all;
  }, [all, range]);
  const values = points.flatMap((point) => [point.value, point.benchmarkValue]);
  const minimum = values.length ? Math.min(...values) - 10 : 9_950;
  const maximum = values.length ? Math.max(...values) + 10 : 10_050;
  const active = hover === null ? points.at(-1) : points[hover];
  const x = hover === null ? 0 : (hover / Math.max(1, points.length - 1)) * 940 + 30;
  useEffect(() => {
    if (!chartRoot.current || points.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      const path = chartRoot.current!.querySelector<SVGPathElement>('.chart-vlad-path');
      const area = chartRoot.current!.querySelector<SVGPathElement>('.chart-area');
      if (!path || !area) return;
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.set(area, { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: chartRoot.current, start: 'top 82%', once: true } })
        .to(path, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out' }, 0)
        .to(area, { opacity: 1, duration: .9, ease: 'power2.out' }, .5);
    }, chartRoot);
    return () => context.revert();
  }, [range, points.length]);
  return <div className="performance-chart-block" ref={chartRoot}><div className="chart-heading"><div><span>Performance over time</span><strong>{data ? money(active?.value ?? data.portfolioValue) : '--'}</strong></div><div className="range-controls" aria-label="Chart time range">{(['1D', '7D', 'ALL'] as const).map((option) => <button type="button" key={option} className={range === option ? 'selected' : ''} aria-pressed={range === option} onClick={() => { setRange(option); setHover(null); }}>{option === 'ALL' ? 'All' : option}</button>)}</div></div>
    <div className="chart-canvas"><div className="chart-y-axis"><span>{money(maximum, 0)}</span><span>{money((minimum + maximum) / 2, 0)}</span><span>{money(minimum, 0)}</span></div><svg viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Line chart comparing Vlad's paper portfolio to a DOGE buy-and-hold benchmark" onPointerMove={(event) => { if (!points.length) return; const box = event.currentTarget.getBoundingClientRect(); setHover(Math.min(points.length - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (points.length - 1))))); }} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id="vlad-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef8a65" stopOpacity=".2" /><stop offset="100%" stopColor="#ef8a65" stopOpacity="0" /></linearGradient></defs>
      {[30, 150, 270].map((y) => <line className="chart-gridline" key={y} x1="30" y1={y} x2="970" y2={y} />)}
      {points.length > 1 && <><path className="chart-area" d={`${pathFor(points, 'value', minimum, maximum)} L 970 270 L 30 270 Z`} fill="url(#vlad-chart-fill)" /><path d={pathFor(points, 'benchmarkValue', minimum, maximum)} className="chart-benchmark-path" /><path d={pathFor(points, 'value', minimum, maximum)} className="chart-vlad-path" />{hover !== null && active && <><line className="chart-cursor" x1={x} x2={x} y1="30" y2="270" /><circle className="chart-point" cx={x} cy={30 + 240 - ((active.value - minimum) / Math.max(1, maximum - minimum)) * 240} r="6" /></>}</>}
    </svg></div><div className="chart-foot"><div><span><i className="legend-vlad" />Vlad</span><span><i className="legend-benchmark" />DOGE benchmark</span></div><span>{active ? time(active.at) : 'Waiting for data'} / {data?.mode === 'demo' ? 'Sample history' : 'CoinGecko reference prices'}</span></div></div>;
}

function Holdings({ data }: { data: Snapshot | null }) {
  return <div className="holdings-block"><div className="subsection-heading"><h3>Inside the portfolio</h3><span>Invested value {data ? money(data.portfolioValue - data.cash) : '--'}</span></div><div className="table-scroll"><table className="holdings-table"><thead><tr><th>Coin</th><th>Units</th><th>Market value</th><th>Unrealized P&L</th><th>24h move</th></tr></thead><tbody>{data?.positions.length ? data.positions.map((position) => <tr key={position.symbol}><td><strong>{position.symbol}</strong><small>{SYMBOLS.find((item) => item.symbol === position.symbol)?.name}</small></td><td>{number(position.units, 6)}</td><td>{money(position.marketValue)}</td><td className={position.unrealizedPnl >= 0 ? 'positive' : 'negative'}>{signedMoney(position.unrealizedPnl)}</td><td className={position.change24hPercent === null ? '' : position.change24hPercent >= 0 ? 'positive' : 'negative'}>{position.change24hPercent === null ? '--' : signedPercent(position.change24hPercent)}</td></tr>) : <tr><td colSpan={5} className="empty-table">No positions yet. Vlad's first completed buy will appear here.</td></tr>}</tbody></table></div></div>;
}

function Portfolio({ data }: { data: Snapshot | null }) {
  const lastPick = data?.signal.selectedSymbol || data?.trades[0]?.symbol;
  return <section className="portfolio-section light-section" id="portfolio"><div className="page-width"><div className="chapter-label"><span>03 / The paper portfolio</span><span>{data?.pricingLabel || 'Connecting to the ledger'}</span></div><div className="chapter-heading portfolio-heading"><RevealTitle lines={['The numbers', 'behind the swim.']} /><p>Vlad began with {money(data?.initialCash || 10000, 0)} of virtual cash. His portfolio and a DOGE buy-and-hold benchmark begin at the same value.</p></div>
    <div className="portfolio-value-block"><span>Portfolio value</span><strong>{data ? money(data.portfolioValue) : '--'}</strong><p className={(data?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}>{data ? `${signedMoney(data.totalPnl)} (${signedPercent(data.totalPnlPercent)}) since inception` : 'Waiting for the ledger'}</p></div>
    <div className="portfolio-metrics"><div><span>Today's P&L</span><strong className={(data?.todayPnl || 0) >= 0 ? 'positive' : 'negative'}>{data ? signedMoney(data.todayPnl) : '--'}</strong><small>UTC calendar day</small></div><div><span>Virtual cash</span><strong>{data ? money(data.cash) : '--'}</strong><small>Available for paper orders</small></div><div><span>{data?.signal.cameraConnected ? 'Current pick' : 'Last paper pick'}</span><strong>{lastPick || '--'}</strong><small>{data?.signal.cameraConnected ? 'Vlad is choosing' : 'Tracker awaiting Vlad'}</small></div><div><span>Paper trades</span><strong>{data?.tradesCount ?? '--'}</strong><small>Recorded in the ledger</small></div></div>
    <PerformanceChart data={data} />
    <div className="benchmark-block"><div><span>Head to head</span><h3>Vlad vs. DOGE.</h3><p>Both begin at {money(data?.initialCash || 10000, 0)} in virtual value. DOGE represents a paper buy-and-hold alternative.</p></div><div className="benchmark-scores"><div><span>Vlad</span><strong className={(data?.totalPnlPercent || 0) >= 0 ? 'positive' : 'negative'}>{data ? signedPercent(data.totalPnlPercent) : '--'}</strong></div><div><span>{BENCHMARK_SYMBOL}</span><strong className={(data?.benchmarkPnlPercent || 0) >= 0 ? 'positive' : 'negative'}>{data ? signedPercent(data.benchmarkPnlPercent) : '--'}</strong></div></div></div>
    <Holdings data={data} />
  </div></section>;
}

const zones: Array<{ label: ZoneCode; x: number; y: number; w: number; h: number }> = [
  ...SYMBOLS.map(({ symbol }, index) => ({ label: symbol, x: (index % 3) * 100 / 3, y: Math.floor(index / 3) * 36, w: 100 / 3, h: 36 })),
  { label: 'BUY', x: 0, y: 72, w: 50, h: 28 }, { label: 'SELL', x: 50, y: 72, w: 50, h: 28 },
];

function TankDecision({ data }: { data: Snapshot | null }) {
  const signal = data?.signal;
  const stage = !signal?.cameraConnected ? 'Waiting for Vlad' : signal.stage === 'cooldown' ? 'Trade cooldown' : signal.selectedSymbol ? `${signal.selectedSymbol} selected` : signal.zone ? `In ${signal.zone}` : 'Looking for Vlad';
  return <section className="decision-section dark-section" id="tank-map"><div className="page-width"><div className="chapter-label"><span>04 / The decision map</span><span>Eight zones. One fish.</span></div><div className="chapter-heading"><RevealTitle lines={['Every swim', 'has a consequence.']} /><p>Six zones select a meme coin. Two zones choose a side. Vlad must stay in each long enough for the camera tracker to confirm the move.</p></div><div className="decision-grid"><div className="tank-map reveal-media" role="img" aria-label="Tank map with six meme-coin zones above BUY and SELL zones"><div className="tank-map-texture" />{zones.map((zone) => <div key={zone.label} className={`tank-zone ${zone.label === 'BUY' || zone.label === 'SELL' ? 'action-zone' : ''} ${signal?.zone === zone.label ? 'active' : ''} ${signal?.selectedSymbol === zone.label ? 'armed' : ''}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}><span>{zone.label}</span></div>)}{signal?.cameraConnected && signal.x !== null && signal.y !== null && <span className="fish-marker" style={{ left: `${signal.x * 100}%`, top: `${signal.y * 100}%` }}><BrandMark size={22} /></span>}</div><div className="decision-readout"><span className="aside-label">Tracker state</span><strong>{stage}</strong><p>{!signal?.cameraConnected ? 'Connect Vlad\'s local camera feed to show his position and dwell progress here.' : signal.selectedSymbol ? 'A completed stay in BUY or SELL can create a paper trade.' : 'A completed stay in a meme-coin zone locks Vlad\'s pick.'}</p><div className="dwell-heading"><span>Dwell progress</span><strong>{Math.round((signal?.dwellProgress || 0) * 100)}%</strong></div><div className="dwell-track"><span style={{ width: `${(signal?.dwellProgress || 0) * 100}%` }} /></div><div className="decision-rules"><div><span>Hold time</span><strong>{(data?.rules.dwellMs || 5000) / 1000}s</strong></div><div><span>Cooldown</span><strong>{(data?.rules.cooldownMs || 30000) / 1000}s</strong></div><div><span>Paper order</span><strong>{money(data?.rules.orderNotional || 500, 0)}</strong></div></div></div></div><p className="decision-footnote">The YouTube player shows the broadcast. Trading signals arrive from a separate camera tracker, so stream delay cannot change an order.</p></div></section>;
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
      gsap.fromTo('.trade-row:first-child', { backgroundColor: 'rgba(239,138,101,.22)' }, { backgroundColor: 'transparent', duration: 2.2 });
    }
    newestRef.current = newest;
  }, [newest]);
  return <section className="journal-section dark-section" id="journal"><div className="page-width"><div className="chapter-label"><span>05 / The public record</span><span>Recent decisions, in public</span></div><div className="chapter-heading"><h2>Every move<br />on the record.</h2><p>Recent paper trades, selections, and skipped signals are visible. Sample and admin entries are labelled.</p></div><div className="journal-grid"><div className="trade-history"><div className="subsection-heading"><h3>Trade history</h3><div className="trade-filters" aria-label="Filter trades">{(['ALL', 'BUY', 'SELL'] as const).map((option) => <button type="button" key={option} className={filter === option ? 'selected' : ''} aria-pressed={filter === option} onClick={() => { setFilter(option); setExpanded(false); }}>{option === 'ALL' ? 'All' : option === 'BUY' ? 'Buys' : 'Sells'}</button>)}</div></div><div className="trade-list">{shown.length ? shown.map((trade: Trade) => <div className="trade-row" key={trade.id}><span className={`trade-direction ${trade.side.toLowerCase()}`}>{trade.side === 'BUY' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}</span><div className="trade-name"><strong>{trade.side === 'BUY' ? 'Bought' : 'Sold'} {trade.symbol}</strong><span>{number(trade.units, 6)} units at {priceMoney(trade.price)} / {trade.source === 'sample' ? 'Sample' : trade.source === 'admin' ? 'Admin' : 'Camera'}</span></div><div className="trade-value"><strong>{money(trade.notional)}</strong><time>{relativeTime(trade.executedAt)}</time></div></div>) : <div className="trade-empty">No recent {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}paper trades in this view.</div>}</div>{trades.length > 5 && <button className="show-more" type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer trades' : `Show ${trades.length} recent trades`}<ChevronDown size={17} className={expanded ? 'rotated' : ''} /></button>}</div><aside className="signal-log"><div className="subsection-heading"><h3>Signal log</h3><span>Latest first</span></div>{data?.activity.length ? data.activity.slice(0, 6).map((entry) => <div className="signal-entry" key={entry.id}><span className={`signal-mark ${entry.kind}`} /><p>{entry.message}</p><time>{relativeTime(entry.createdAt)}</time></div>) : <p className="trade-empty">The first signal will appear here.</p>}</aside></div><div className="journal-disclosure">Every dollar and coin unit here is virtual. Camera trades require a connected tracker; the default preview contains sample activity. Reference prices are not Robinhood execution prices. This view shows the latest 50 trades; the ledger retains the full history.</div></div></section>;
}

function HowItWorks({ data }: { data: Snapshot | null }) {
  const steps = [
    ['The camera watches', 'A local tracker measures Vlad\'s position. The YouTube Live player broadcasts the tank to viewers.'],
    ['Vlad picks a meme coin', `A ${((data?.rules.dwellMs || 5000) / 1000).toFixed(0)}-second stay in a coin zone selects ${SYMBOLS.map((asset) => asset.symbol).join(', ')}.`],
    ['Vlad chooses a side', 'Another timed stay in BUY or SELL confirms the action. A cooldown prevents repeat orders from one lingering swim.'],
    ['The ledger records it', `A fresh ${data?.mode === 'demo' ? 'scenario' : 'CoinGecko reference'} price fills a virtual ${money(data?.rules.orderNotional || 500, 0)} order when cash or coin units allow it.`],
  ];
  return <section className="method-section light-section" id="how-it-works"><div className="page-width"><div className="chapter-label"><span>06 / The method</span><span>A fish, with rules</span></div><div className="chapter-heading"><h2>How a swim<br />becomes a signal.</h2><p>Two deliberate stays make the fish's choice inspectable and limit accidental orders.</p></div><div className="method-list">{steps.map(([title, description], index) => <div className="method-step" key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p><ArrowDownRight size={24} /></div>)}</div><div className="method-note" id="methodology"><p>Low-confidence tracking, stale or unavailable prices, and insufficient virtual funds cause a visible skip.</p><a className="text-link" href="https://github.com/Zelvf/vlad-the-fish-trader/blob/main/docs/METHODOLOGY.md" target="_blank" rel="noreferrer">Read the full methodology <ArrowUpRight size={20} /></a></div></div></section>;
}

function Sources() {
  const links = [
    ['Michael Reeves', 'The original goldfish-trading film that sparked the idea.', 'https://www.youtube.com/watch?v=USKD3vPD6ZA'],
    ['Robinhood coin availability', 'The U.S. listing reference for the six-coin tank; availability can vary by region.', 'https://robinhood.com/us/en/support/articles/coin-availability/'],
    ['YouTube player', 'The public live video embed used when Vlad\'s stream is ready.', 'https://developers.google.com/youtube/player_parameters'],
    ['CoinGecko API', 'Independent USD reference prices for optional live paper fills.', 'https://docs.coingecko.com/reference/simple-price'],
    ['Motion reference', 'The supplied repo list that led to GSAP and Three.js on this site.', 'https://x.com/flxrnc/status/2117318336837017846'],
    ['Visual reference', 'Lusion\'s About page informed the scale, pacing, and monochrome direction.', 'https://lusion.co/about/'],
  ];
  return <section className="sources-section light-section" id="sources"><div className="page-width"><div className="chapter-label"><span>07 / Field notes</span><span>Sources and references</span></div><div className="sources-grid"><div><h2>A fish story<br />with receipts.</h2><p>This project takes the spectacle of fish-driven trading and makes its money, prices, decisions, and limits visible.</p><a className="text-link" href="https://github.com/Zelvf/vlad-the-fish-trader/blob/main/docs/SOURCES.md" target="_blank" rel="noreferrer">View the complete source list <ArrowUpRight size={20} /></a></div><div className="sources-list">{links.map(([title, description, url], index) => <a href={url} target="_blank" rel="noreferrer" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><small>{description}</small></div><ExternalLink size={19} /></a>)}</div></div></div></section>;
}

function Footer({ data }: { data: Snapshot | null }) {
  return <footer className="site-footer"><div className="page-width"><div className="footer-top"><span>{data?.site.heroLineOne || 'One fish. Six meme coins.'} {data?.site.heroLineTwo || 'Zero financial education.'}</span><a href="#top">Back to top <ArrowUpRight size={19} /></a></div><div className="footer-title" aria-hidden="true">VLAD<span>.</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Vlad the Fish Trader</span><span>Paper trading / {data?.mode === 'demo' ? 'sample preview' : 'reference prices'} / independent of Robinhood</span><a href="/admin">Control room</a></div></div></footer>;
}

function useSectionMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      document.querySelectorAll<HTMLElement>('.reveal-title').forEach((heading) => {
        gsap.fromTo(heading.querySelectorAll('.reveal-line > span'), { yPercent: 105 }, { yPercent: 0, duration: 1.05, stagger: .13, ease: 'power4.out', scrollTrigger: { trigger: heading, start: 'top 87%', once: true } });
      });
      document.querySelectorAll<HTMLElement>('.journal-section .chapter-heading h2, .method-section .chapter-heading h2, .sources-grid h2').forEach((heading) => {
        gsap.fromTo(heading, { y: 55, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: heading, start: 'top 86%', once: true } });
      });
      document.querySelectorAll<HTMLElement>('.reveal-media').forEach((element) => {
        gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.25, ease: 'power3.inOut', scrollTrigger: { trigger: element, start: 'top 86%', once: true } });
      });
      gsap.fromTo('.footer-title', { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.site-footer', start: 'top 80%', once: true } });
    });
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(refresh); context.revert(); };
  }, []);
}

export default function App() {
  const { data, connection } = useSnapshot();
  useSectionMotion();
  return <><Header data={data} /><main><Hero data={data} connection={connection} /><Premise /><LiveStage data={data} /><QuoteStrip data={data} /><Portfolio data={data} /><TankDecision data={data} /><TradeHistory data={data} /><HowItWorks data={data} /><Sources /></main><Footer data={data} /></>;
}
