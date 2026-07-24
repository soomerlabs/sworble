// DAILY STORM BOARDS (owner ruling: fresh boards beat rotation — "won't
// people get bored of that?"). Three NEW seeds mint every local day, pure
// day-key derivation: no authoring, no server, no repeats, and each seed's
// leaderboard persists as history after its day passes. Names come off a
// curated storm list, picked by seed hash — flavor, not intel.
import engine from '@sworbl/engine';

// storm codenames — enough that same-day triples never collide
const NAMES = [
  'skyfall', 'undertow', 'whiteout', 'squall', 'derecho', 'monsoon',
  'tempest', 'cyclone', 'haboob', 'chinook', 'mistral', 'sirocco',
  'nor-easter', 'gale', 'microburst', 'thunderhead', 'waterspout',
  'blizzard', 'downburst', 'supercell',
];

export interface StormBoard {
  seed: string;
  name: string;
}

// three boards per day: seed = s-YYYYMMDD-a/b/c (fits the server's
// ^[a-z0-9-]{3,24}$ law); names dealt without same-day duplicates
export function dailyStormBoards(now: Date = new Date()): StormBoard[] {
  const dk = engine.core.dayKey(now).replace(/-/g, '');
  const rng = engine.core.mulberry32(engine.core.hashSeed('storms|' + dk));
  const pool = [...NAMES];
  return ['a', 'b', 'c'].map((slot) => {
    const i = Math.floor(rng() * pool.length);
    const name = pool.splice(i, 1)[0] ?? 'storm';
    return { seed: `s-${dk}-${slot}`, name };
  });
}

// the name for any storm seed (deep links, the storm screen's title) —
// today's boards resolve to their dealt names; foreign seeds show as-is
export function stormName(seed: string, now: Date = new Date()): string {
  const hit = dailyStormBoards(now).find((b) => b.seed === seed);
  return hit?.name ?? seed;
}
