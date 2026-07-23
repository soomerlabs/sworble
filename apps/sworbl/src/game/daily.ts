// The DAILY DEAL — the exact recipe the web app's newGame runs (pinned by the
// engine's round-lifecycle test): parseEntry → two-pass clue seed → letter queue.
// Determinism contract: same dayKey → byte-identical board on every client.
import engine from '@sworbl/engine';
import { COLS, ROWS, CLUE_COUNT, TileT } from './types';
import { tileColorFor } from './palette';

// content ships with the repo (root dailies.json — same file the frozen web app
// and the authoring pipeline use; Metro resolves across the workspace)
const dailies = require('../../../../dailies.json');

export interface DailyDeal {
  dayKey: string;
  sworb: string;
  definition: string;
  clues: string[]; // the 6 realized clue words actually stamped on this board
  tiles: TileT[];
  nextLetter: () => string; // deterministic finite-bag refill dealer
  getQueueIdx: () => number; // dealer position — persisted so a resumed run
  setQueueIdx: (i: number) => void; // continues the SAME letter stream
}

let nextId = 1;

export function dealDaily(now = new Date()): DailyDeal | null {
  const dayKey = engine.core.dayKey(now);
  const entry = engine.daily.parseEntry(dailies, dayKey);
  if (!entry) return null;

  // two-pass clue seed, seeded from the day (web newGame's exact call)
  const rngFactory = () => engine.core.mulberry32(engine.core.hashSeed(dayKey + '|sworb'));
  const cand = engine.seed.seedClueLettersTwoPass({
    clues: entry.themeWords,
    cols: COLS,
    rows: ROWS,
    rngFactory,
    target: CLUE_COUNT,
  });

  // deterministic letter queue: fills the non-clue cells at deal time, then
  // feeds refills for the whole round (FRIENDLY on-ramp + 3 full bags)
  const qr = engine.core.mulberry32(engine.core.hashSeed(dayKey) ^ 0x51ac1e);
  const queue: string[] = engine.core
    .shuffledBag(engine.core.FRIENDLY, qr)
    .concat(
      engine.core.shuffledBag(engine.core.BAG, qr),
      engine.core.shuffledBag(engine.core.BAG, qr),
      engine.core.shuffledBag(engine.core.BAG, qr)
    );
  let qi = 0;
  const nextLetter = () => queue[qi++ % queue.length];

  // the FULL 5×6 board: stamped clue letters where the two-pass seed placed
  // them, queue letters everywhere else (the web newGame's fill step — its
  // omission shipped an 18-tile board; pinned by tests/daily.test.ts)
  const tiles: TileT[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const letter: string = cand.letters[row + ',' + col] ?? nextLetter();
      const id = nextId++;
      tiles.push({ id, letter, col, row, ci: tileColorFor(letter, id), spawnDrop: 0, bornAt: Date.now() });
    }
  }

  return {
    dayKey,
    sworb: entry.sworb,
    definition: entry.definition || '',
    clues: cand.realized,
    tiles,
    nextLetter,
    getQueueIdx: () => qi,
    setQueueIdx: (i: number) => {
      qi = i;
    },
  };
}

export function makeTile(letter: string, col: number, row: number, spawnDrop: number): TileT {
  const id = nextId++;
  return { id, letter, col, row, ci: tileColorFor(letter, id), spawnDrop, bornAt: Date.now() };
}

// a restored run carries tile ids from a previous process — the fresh counter
// must clear them or new refills collide with restored ids (React keys, trace identity)
export function bumpNextId(minExclusive: number): void {
  if (nextId <= minExclusive) nextId = minExclusive + 1;
}

// airborne window for a spawned tile (GameTile: spawnDrop*40ms stagger + spring)
export function landsInMs(t: TileT): number {
  return t.spawnDrop ? t.spawnDrop * 40 + 380 : 0;
}

// collapse columns and rain in refills from the queue — returns NEW arrays;
// `added` is the incoming rain (the only tiles a clue re-stamp may touch)
export function settle(
  tiles: TileT[],
  nextLetter: () => string
): { tiles: TileT[]; added: TileT[] } {
  const out: TileT[] = [];
  const added: TileT[] = [];
  for (let c = 0; c < COLS; c++) {
    const colTiles = tiles.filter((t) => t.col === c).sort((a, b) => b.row - a.row);
    let row = ROWS - 1;
    for (const t of colTiles) {
      out.push(t.row === row ? t : { ...t, row });
      row--;
    }
    let drop = 1;
    while (row >= 0) {
      const nt = makeTile(nextLetter(), c, row, drop);
      out.push(nt);
      added.push(nt);
      row--;
      drop++;
    }
  }
  return { tiles: out, added };
}

// RE-STAMP (web _placeCluesInRefill, ported): as the board refills, place any
// un-found clue that play has BROKEN into the incoming tiles — never touching
// settled tiles. Deterministic per (day, refill position); re-stamped tiles are
// recolored to their letter's own family (no color "tell"). A clue that doesn't
// fit this refill is restored on a later one. Returns the tiles array with the
// changes applied (new objects — no mutation).
export function restampBroken(args: {
  deal: DailyDeal;
  tiles: TileT[]; // post-settle full board
  added: TileT[]; // this refill's incoming tiles
  unfound: string[]; // clues minus found minus playedThisRun (the roundWords guard)
}): TileT[] {
  const { deal, tiles, added, unfound } = args;
  if (!unfound.length || !added.length) return tiles;
  const addedIds = new Set(added.map((t) => t.id));
  const survivors = tiles.filter((t) => !addedIds.has(t.id));
  const isFindable = (w: string) =>
    !!engine.solver.findWord(survivors, { word: w, expand: engine.core.expandLetter, diag: true });
  const rng = engine.core.mulberry32(
    (engine.core.hashSeed(deal.dayKey + '|refill') ^ (deal.getQueueIdx() * 2654435761)) >>> 0
  );
  const changes: { r: number; c: number; letter: string }[] = engine.seed.reseedBroken({
    tiles: added,
    unfound,
    isFindable,
    rng,
    reserve: new Set(),
  });
  if (!changes.length) return tiles;
  const byCell = new Map(changes.map((ch) => [ch.r + ',' + ch.c, ch.letter]));
  return tiles.map((t) => {
    if (!addedIds.has(t.id)) return t;
    const letter = byCell.get(t.row + ',' + t.col);
    if (!letter) return t;
    return { ...t, letter, ci: tileColorFor(letter, t.id) };
  });
}
