// REMOTE STANDINGS + THE OUTBOX — stale-while-revalidate over the stubs
// (the fossil's loadHomeLb pattern: local renders NOW, remote swaps in),
// and an offline-resilient submission queue: finishDay enqueues, the outbox
// drains on boot/foreground/close. No network → everything stays local.
import engine from '@sworbl/engine';
import { supabase, isConfigured, ensurePlayer } from './supabase';
import { getPlayerName } from '@/game/player';
import { type LbEntry } from '@/game/standings';
import { type BestWord, type SworbState } from '@/game/persist';

const OUTBOX_KEY = 'sworbl_rn_outbox';
const CACHE_KEY = 'sworbl_rn_lb_cache_'; // + day | 'alltime'

export interface RemoteField {
  entries: LbEntry[];
  me: { rank: number; score: number } | null;
}

// ---- fetch (cache-backed) ----
export async function fetchDaily(dayKey: string): Promise<RemoteField | null> {
  const sb = supabase();
  if (!sb) return null;
  const cacheKey = `${dayKey}:regular`;
  try {
    const uid = (await sb.auth.getSession()).data.session?.user.id ?? null;
    const { data, error } = await sb
      .from('daily_standings')
      .select('name, score, solved, rank, player_id')
      .eq('day', dayKey)
      .eq('mode', 'regular')
      .order('rank', { ascending: true })
      .limit(100);
    if (error || !data) return readCache(cacheKey);
    const entries: LbEntry[] = data.map((r) => ({
      name: String(r.name),
      score: Number(r.score),
      solved: !!r.solved,
      isMe: uid != null && r.player_id === uid,
    }));
    const mine = uid ? data.find((r) => r.player_id === uid) : null;
    const out: RemoteField = {
      entries,
      me: mine ? { rank: Number(mine.rank), score: Number(mine.score) } : null,
    };
    engine.store.setJSON(CACHE_KEY + cacheKey, out);
    return out;
  } catch {
    return readCache(cacheKey);
  }
}

export async function fetchAllTime(): Promise<RemoteField | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const uid = (await sb.auth.getSession()).data.session?.user.id ?? null;
    const { data, error } = await sb
      .from('alltime_standings')
      .select('name, total, rank, player_id')
      .order('rank', { ascending: true })
      .limit(100);
    if (error || !data) return readCache('alltime');
    const entries: LbEntry[] = data.map((r) => ({
      name: String(r.name),
      score: Number(r.total),
      solved: true,
      isMe: uid != null && r.player_id === uid,
    }));
    const mine = uid ? data.find((r) => r.player_id === uid) : null;
    const out: RemoteField = {
      entries,
      me: mine ? { rank: Number(mine.rank), score: Number(mine.total) } : null,
    };
    engine.store.setJSON(CACHE_KEY + 'alltime', out);
    return out;
  } catch {
    return readCache('alltime');
  }
}

function readCache(key: string): RemoteField | null {
  return engine.store.getJSON(CACHE_KEY + key, null) as RemoteField | null;
}

// synchronous cache peek (key = dayKey | 'alltime') — cold launch renders
// the last-known REAL field instantly instead of a skeleton-then-swap flash
export function readCachedField(key: string): RemoteField | null {
  const v = readCache(key);
  return v && Array.isArray(v.entries) && v.entries.length ? v : null;
}

// ---- the outbox: submissions survive offline days ----
interface Pending {
  id?: string; // unique row id — the drain's write-back matches on THIS
  day: string; // practice entries use 'storm:<seed>' (never collides)
  seed?: string; // practice only
  score: number;
  solved: boolean;
  guesses: number;
  words: BestWord[];
  mode?: 'regular' | 'practice'; // per-mode write policy (modes-spec)
  rounds?: number; // rounds played at solve time — the bonus decay input
}

// PRACTICE (duels groundwork): keep-best per seed; words ride along so the
// run can GHOST a future opponent
export function enqueuePractice(seed: string, score: number, words: BestWord[]): Promise<void> {
  const key = 'storm:' + seed;
  const box = (engine.store.getJSON(OUTBOX_KEY, []) as Pending[]).filter((p) => p.day !== key);
  box.push({ id: mintRowId(), day: key, seed, score, solved: false, guesses: 0, words, mode: 'practice' });
  engine.store.setJSON(OUTBOX_KEY, box);
  // callers may await: post-a-showdown and resolve need the run VALIDATED
  // server-side first (timers raced the drain — audit)
  return drainOutbox();
}

// per-seed standings (duels): the ranked view over keep-best runs on one
// shared board (schema v4's practice_standings)
export async function fetchPractice(
  seed: string,
  limit = 10
): Promise<Array<{ name: string; score: number; isMe: boolean }> | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const uid = (await sb.auth.getSession()).data.session?.user.id ?? null;
    const { data, error } = await sb
      .from('practice_standings')
      .select('name, score, rank, player_id')
      .eq('seed', seed)
      .order('rank', { ascending: true })
      .limit(limit);
    if (error || !data) return null;
    return data.map((r) => ({
      name: String(r.name),
      score: Number(r.score),
      isMe: uid != null && r.player_id === uid,
    }));
  } catch {
    return null;
  }
}

export function enqueueSubmission(
  dayKey: string,
  score: number,
  sworb: SworbState,
  words: BestWord[],
  rounds: number = 1
): void {
  const box = (engine.store.getJSON(OUTBOX_KEY, []) as Pending[]).filter((p) => p.day !== dayKey);
  box.push({
    id: mintRowId(), day: dayKey, score, solved: sworb.solved, guesses: sworb.guessesUsed,
    words, mode: 'regular', rounds,
  });
  engine.store.setJSON(OUTBOX_KEY, box);
  void drainOutbox(); // best effort now; boot/foreground retries the rest
}

// THE DRAIN GUARD (audit: silent score loss) — a drain snapshots the box,
// awaits the network, then writes back. An enqueue landing inside that
// await window (round banks → solve seconds later) used to be clobbered by
// the write-back. Now: rows carry ids, the write-back REMOVES processed ids
// from the CURRENT box instead of replacing it, and drains never overlap.
let rowSeq = 0;
function mintRowId(): string {
  return `${Date.now().toString(36)}-${++rowSeq}`;
}
let draining = false;
let drainQueued = false;

export async function drainOutbox(): Promise<void> {
  if (!isConfigured()) return;
  if (draining) {
    drainQueued = true; // a fresh row arrived mid-drain — run again after
    return;
  }
  draining = true;
  try {
    await drainPass();
  } finally {
    draining = false;
    if (drainQueued) {
      drainQueued = false;
      void drainOutbox();
    }
  }
}

async function drainPass(): Promise<void> {
  // legacy rows (pre-id builds) get ids stamped before the snapshot so the
  // write-back can match them
  const raw = engine.store.getJSON(OUTBOX_KEY, []) as Pending[];
  if (!raw.length) return;
  if (raw.some((p) => !p.id)) {
    engine.store.setJSON(OUTBOX_KEY, raw.map((p) => (p.id ? p : { ...p, id: mintRowId() })));
  }
  const box = engine.store.getJSON(OUTBOX_KEY, []) as Pending[];
  const uid = await ensurePlayer(getPlayerName());
  const sb = supabase();
  if (!uid || !sb) return;
  const done = new Set<string>(); // delivered or finally-rejected row ids
  for (const p of box) {
    try {
      // THE HONESTY GATE (schema v2): results go through the submit-score
      // edge function, which re-scores the words server-side and inserts
      // with the service role — clients lost direct INSERT.
      const { data, error } = await sb.functions.invoke('submit-score', {
        body: p.mode === 'practice'
          ? { seed: p.seed, score: p.score, solved: false, guesses: 0, words: p.words, mode: 'practice' }
          : {
              day: p.day, score: p.score, solved: p.solved, guesses: p.guesses,
              words: p.words, mode: 'regular', rounds: p.rounds ?? 1,
            },
      });
      if (data?.ok) {
        done.add(p.id!); // delivered
        continue;
      }
      if (error) {
        // TRANSITION FALLBACK: function not deployed yet → the legacy
        // direct insert (works until schema-v2 drops the policy). A 4xx
        // VALIDATION rejection is final — drop it, don't retry forever.
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 404 && p.mode !== 'practice') {
          // (practice NEVER falls back — a direct insert would land a
          // 'storm:<seed>' row in the daily submissions table)
          const { error: insErr } = await sb.from('submissions').insert({
            player_id: uid, day: p.day, score: p.score,
            solved: p.solved, guesses: p.guesses, words: p.words,
          });
          if (!insErr || `${insErr.code}`.startsWith('23')) done.add(p.id!);
          continue;
        }
        if (status === 422 || status === 400) {
          done.add(p.id!); // rejected: final — never retry
          continue;
        }
        // network/5xx: NOT done — stays in the box for the next drain
      }
    } catch {
      // network throw: stays in the box
    }
  }
  // write-back by REMOVAL from the current box — rows enqueued mid-drain
  // (ids we never saw) survive untouched
  const current = engine.store.getJSON(OUTBOX_KEY, []) as Pending[];
  engine.store.setJSON(OUTBOX_KEY, current.filter((p) => !p.id || !done.has(p.id)));
}
