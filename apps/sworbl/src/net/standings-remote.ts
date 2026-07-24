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
export async function fetchDaily(
  dayKey: string,
  mode: 'regular' | 'hard' = 'regular'
): Promise<RemoteField | null> {
  const sb = supabase();
  if (!sb) return null;
  const cacheKey = `${dayKey}:${mode}`;
  try {
    const uid = (await sb.auth.getSession()).data.session?.user.id ?? null;
    const { data, error } = await sb
      .from('daily_standings')
      .select('name, score, solved, rank, player_id')
      .eq('day', dayKey)
      .eq('mode', mode)
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
  day: string;
  score: number;
  solved: boolean;
  guesses: number;
  words: BestWord[];
  mode?: 'regular' | 'hard'; // per-mode write policy (modes-spec)
}

export function enqueueSubmission(
  dayKey: string,
  score: number,
  sworb: SworbState,
  words: BestWord[],
  mode: 'regular' | 'hard' = 'regular'
): void {
  const box = (engine.store.getJSON(OUTBOX_KEY, []) as Pending[]).filter((p) => p.day !== dayKey);
  box.push({ day: dayKey, score, solved: sworb.solved, guesses: sworb.guessesUsed, words, mode });
  engine.store.setJSON(OUTBOX_KEY, box);
  void drainOutbox(); // best effort now; boot/foreground retries the rest
}

export async function drainOutbox(): Promise<void> {
  if (!isConfigured()) return;
  const box = engine.store.getJSON(OUTBOX_KEY, []) as Pending[];
  if (!box.length) return;
  const uid = await ensurePlayer(getPlayerName());
  const sb = supabase();
  if (!uid || !sb) return;
  const remaining: Pending[] = [];
  for (const p of box) {
    try {
      // THE HONESTY GATE (schema v2): results go through the submit-score
      // edge function, which re-scores the words server-side and inserts
      // with the service role — clients lost direct INSERT.
      const { data, error } = await sb.functions.invoke('submit-score', {
        body: {
          day: p.day, score: p.score, solved: p.solved, guesses: p.guesses,
          words: p.words, mode: p.mode ?? 'regular',
        },
      });
      if (data?.ok) continue; // delivered (duplicates count — one-shot law)
      if (error) {
        // TRANSITION FALLBACK: function not deployed yet → the legacy
        // direct insert (works until schema-v2 drops the policy). A 4xx
        // VALIDATION rejection is final — drop it, don't retry forever.
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 404) {
          const { error: insErr } = await sb.from('submissions').insert({
            player_id: uid, day: p.day, score: p.score,
            solved: p.solved, guesses: p.guesses, words: p.words,
          });
          if (insErr && !`${insErr.code}`.startsWith('23')) remaining.push(p);
          continue;
        }
        if (status === 422 || status === 400) continue; // rejected: final
        remaining.push(p); // network/5xx: retry later
      }
    } catch {
      remaining.push(p);
    }
  }
  engine.store.setJSON(OUTBOX_KEY, remaining);
}
