// OPEN DUELS (modes-spec: h2h without lobbies) — a duel is a posted,
// server-validated run on a seed, waiting for anyone to beat it. Reads go
// through the open_duel_board view; posting goes through the post-duel
// edge function (the score is copied server-side from practice_scores —
// clients never name a number).
import engine from '@sworbl/engine';
import { supabase } from './supabase';

const CACHE_KEY = 'sworbl_rn_duels_cache';

export interface OpenDuel {
  id: number;
  seed: string;
  format: 'blitz' | 'themed';
  score: number;
  name: string;
  mine: boolean;
}

export function readCachedDuels(): OpenDuel[] {
  return engine.store.getJSON(CACHE_KEY, []) as OpenDuel[];
}

export async function fetchOpenDuels(limit = 6): Promise<OpenDuel[] | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const uid = (await sb.auth.getSession()).data.session?.user.id ?? null;
    const { data, error } = await sb
      .from('open_duel_board')
      .select('id, seed, format, score, name, poster')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return null;
    const out: OpenDuel[] = data.map((r) => ({
      id: Number(r.id),
      seed: String(r.seed),
      format: r.format === 'themed' ? 'themed' : 'blitz',
      score: Number(r.score),
      name: String(r.name),
      mine: uid != null && r.poster === uid,
    }));
    engine.store.setJSON(CACHE_KEY, out);
    return out;
  } catch {
    return null;
  }
}

// publish the caller's validated run on a seed; 'no-run' = play it first
export async function postDuel(
  seed: string,
  format: 'blitz' | 'themed' = 'blitz'
): Promise<'ok' | 'no-run' | 'error'> {
  const sb = supabase();
  if (!sb) return 'error';
  try {
    const { data, error } = await sb.functions.invoke('post-duel', { body: { seed, format } });
    if (data?.ok) return 'ok';
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    return status === 422 ? 'no-run' : 'error';
  } catch {
    return 'error';
  }
}
