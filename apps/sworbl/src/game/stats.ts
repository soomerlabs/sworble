// LIFETIME STATS — the profile screen's data (handoff 4a: best/avg/games/
// words found, YOUR BEST word, the 9-week play-history grid). One JSON blob,
// appended exactly once per finished day (idempotent by day key). Purely
// device-local until Supabase; recorded going forward from install.
import engine from '@sworbl/engine';
import { type BestWord } from '@/game/persist';

const STATS_KEY = 'sworbl_rn_stats';

export interface Stats {
  games: number;
  total: number; // sum of daily scores (avg = total/games)
  best: number;
  bestWord: BestWord | null;
  words: number; // total words spelled across all days
  firstDay: string | null; // "since jul '26"
  topWords: BestWord[]; // lifetime top-8 (the profile's runner-up pills)
  history: Record<string, number>; // dayKey → score (the heat grid)
}

const FRESH: Stats = {
  games: 0, total: 0, best: 0, bestWord: null, words: 0,
  firstDay: null, topWords: [], history: {},
};

export function loadStats(): Stats {
  const s = engine.store.getJSON(STATS_KEY, null) as Partial<Stats> | null;
  if (!s) return { ...FRESH };
  return {
    games: Number(s.games) || 0,
    total: Number(s.total) || 0,
    best: Number(s.best) || 0,
    bestWord: s.bestWord ?? null,
    words: Number(s.words) || 0,
    firstDay: typeof s.firstDay === 'string' ? s.firstDay : null,
    topWords: Array.isArray(s.topWords) ? s.topWords : [],
    history: s.history && typeof s.history === 'object' ? (s.history as Record<string, number>) : {},
  };
}

// exactly-once per day: a re-finish (impossible by the DONE lock, but belt
// and braces) must never double-count
export function recordDay(
  dayKey: string,
  score: number,
  wordsPlayed: number,
  bestWords: BestWord[]
): Stats {
  const cur = loadStats();
  if (cur.history[dayKey] !== undefined) return cur;
  const top = [...cur.topWords, ...bestWords]
    .sort((a, b) => b.pts - a.pts)
    .filter((w, i, arr) => arr.findIndex((x) => x.word === w.word) === i)
    .slice(0, 8);
  const next: Stats = {
    games: cur.games + 1,
    total: cur.total + score,
    best: Math.max(cur.best, score),
    bestWord: top[0] ?? null,
    words: cur.words + wordsPlayed,
    firstDay: cur.firstDay ?? dayKey,
    topWords: top,
    history: { ...cur.history, [dayKey]: score },
  };
  engine.store.setJSON(STATS_KEY, next);
  return next;
}

// THE STREAK: consecutive played days ending today — or yesterday, so an
// unplayed today doesn't break it before the day is over
export function streakDays(stats: Stats): number {
  let n = 0;
  const d = new Date();
  if (stats.history[engine.core.dayKey(d)] === undefined) d.setDate(d.getDate() - 1);
  while (stats.history[engine.core.dayKey(d)] !== undefined) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// the heat grid: last `weeks`×7 cells, oldest first — intensity 0-3
export function historyGrid(stats: Stats, weeks = 9): number[] {
  const cells: number[] = [];
  const now = new Date();
  const peak = Math.max(1, stats.best);
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const score = stats.history[engine.core.dayKey(d)];
    if (score === undefined || score <= 0) cells.push(0);
    else cells.push(score >= peak * 0.66 ? 3 : score >= peak * 0.33 ? 2 : 1);
  }
  return cells;
}
