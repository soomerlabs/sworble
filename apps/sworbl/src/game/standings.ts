// STANDINGS STUB — direct port of the fossil's lbStub (index.html:4762):
// deterministic day-seeded field (same engine hash + mulberry32 stream, same
// name pool, same score curve) so the podium is stable across renders and
// matches what the web build would show. Swapped for Supabase when it lands.
import engine from '@sworbl/engine';

export interface LbEntry {
  name: string;
  score: number;
  solved: boolean;
}

const POOL = [
  'ORDA', 'MILO', 'JUNO', 'PIXL', 'NOVA', 'ZEKE', 'FINN', 'REMY', 'ODIE', 'WREN',
  'QUILL', 'TOVA', 'KAII', 'BIRD', 'SAGE', 'ELIO', 'MARLO', 'POPPY', 'DASH', 'LUMA',
  'OTTO', 'MAVE', 'CLEO', 'IGGY', 'ROON', 'VESP', 'BODE', 'NELL',
];

// DEV: "LB FIELD" knob (web settings > DEVELOPER port) — truncates the stub
// field to eyeball empty/partial standings states. Session-persistent in dev
// storage; release builds always get the full field.
// __DEV__ is a bundler global — absent under the Node test runner
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const DEV_LB_KEY = 'sworbl_rn_dev_lb';
export type LbFieldMode = 'full' | '2' | '1' | '0';

let lbModeMem: LbFieldMode | null = null; // memory-first (see dev-flags.ts)

export function getLbFieldMode(): LbFieldMode {
  if (!IS_DEV) return 'full';
  if (lbModeMem === null) {
    const v = engine.store.getJSON(DEV_LB_KEY, 'full');
    lbModeMem = v === '0' || v === '1' || v === '2' ? v : 'full';
  }
  return lbModeMem;
}

export function setLbFieldMode(m: LbFieldMode): void {
  if (!IS_DEV) return;
  lbModeMem = m;
  engine.store.setJSON(DEV_LB_KEY, m);
}

function capField(entries: LbEntry[]): LbEntry[] {
  const m = getLbFieldMode();
  return m === 'full' ? entries : entries.slice(0, parseInt(m, 10));
}

export function standingsStub(dayKey: string): LbEntry[] {
  const seed = engine.core.hashSeed('lb' + dayKey);
  const rnd = engine.core.mulberry32(seed >>> 0);
  const pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  const n = Math.min(pool.length, 16 + Math.floor(rnd() * 12));
  const entries: LbEntry[] = [];
  for (let i = 0; i < n; i++) {
    entries.push({
      name: pool[i],
      score: Math.round(1200 + Math.pow(rnd(), 1.7) * 3200),
      solved: rnd() < 0.6,
    });
  }
  return capField(entries.sort((a, b) => b.score - a.score));
}

// ALL-TIME stub board — one stable seeded field (not day-keyed) with
// season-scale scores; replaced by the real aggregate when Supabase lands
export function standingsAllTime(): LbEntry[] {
  const rnd = engine.core.mulberry32(engine.core.hashSeed('lbAllTime') >>> 0);
  const pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  const n = Math.min(pool.length, 18 + Math.floor(rnd() * 8));
  const entries: LbEntry[] = [];
  for (let i = 0; i < n; i++) {
    entries.push({
      name: pool[i],
      score: Math.round(12000 + Math.pow(rnd(), 1.5) * 38000),
      solved: true,
    });
  }
  return entries.sort((a, b) => b.score - a.score);
}

// your rank in the field (1-based); ties break in your favor
export function rankFor(entries: LbEntry[], myScore: number): number {
  return entries.filter((e) => e.score > myScore).length + 1;
}
