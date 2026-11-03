import { isSymbol, zoneAt, type SymbolCode, type TradeSide, type ZoneCode } from '../shared/catalog.js';
import type { Signal } from '../shared/types.js';

export interface Observation { x: number; y: number; confidence: number; observedAt?: string }
export interface Decision { symbol: SymbolCode; side: TradeSide }

export class SignalEngine {
  private latest: (Observation & { receivedAt: number }) | null = null;
  private candidate: ZoneCode | null = null;
  private candidateSince = 0;
  private candidateFired = false;
  private selected: SymbolCode | null = null;
  private selectedAt = 0;
  private cooldownUntil = 0;

  constructor(private readonly dwellMs: number, private readonly cooldownMs: number) {}

  ingest(observation: Observation, now = Date.now()): { selection?: SymbolCode; decision?: Decision } {
    if (this.latest && now - this.latest.receivedAt > 10_000) {
      this.candidate = null;
      this.selected = null;
    }
    this.latest = { ...observation, receivedAt: now };
    if (observation.confidence < 0.55) {
      this.candidate = null;
      return {};
    }
    if (this.selected && now - this.selectedAt > 120_000) this.selected = null;
    const zone = zoneAt(observation.x, observation.y);
    if (zone !== this.candidate) {
      this.candidate = zone;
      this.candidateSince = now;
      this.candidateFired = false;
    }
    if (now < this.cooldownUntil || this.candidateFired || now - this.candidateSince < this.dwellMs) return {};
    this.candidateFired = true;
    if (isSymbol(zone)) {
      this.selected = zone;
      this.selectedAt = now;
      return { selection: zone };
    }
    if (this.selected) {
      const decision = { symbol: this.selected, side: zone };
      this.selected = null;
      this.cooldownUntil = now + this.cooldownMs;
      return { decision };
    }
    return {};
  }

  state(now = Date.now()): Signal {
    const connected = this.latest !== null && now - this.latest.receivedAt <= 10_000;
    if (!connected) { this.candidate = null; this.selected = null; }
    const observed = connected ? this.latest : null;
    const zone = observed && observed.confidence >= 0.55 ? zoneAt(observed.x, observed.y) : null;
    const cooldownRemainingMs = Math.max(0, this.cooldownUntil - now);
    const stage = cooldownRemainingMs > 0 ? 'cooldown' : this.selected ? 'action' : zone ? 'selecting' : 'waiting';
    return {
      cameraConnected: connected,
      x: observed?.x ?? null,
      y: observed?.y ?? null,
      confidence: observed?.confidence ?? null,
      zone,
      dwellProgress: zone === this.candidate && !this.candidateFired && cooldownRemainingMs === 0
        ? Math.min(1, Math.max(0, (now - this.candidateSince) / this.dwellMs)) : 0,
      selectedSymbol: this.selected,
      stage,
      lastSeenAt: this.latest ? new Date(this.latest.receivedAt).toISOString() : null,
      cooldownRemainingMs,
    };
  }
}
