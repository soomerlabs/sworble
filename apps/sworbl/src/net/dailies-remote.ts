// SERVER-DRIVEN DAILIES (owner: swap tester content rapidly) — the remote
// `dailies` table overrides the bundled dailies.json per day. Local-first
// law: the bundle is the fallback, the cache renders offline, and a fetch
// failure changes nothing. dealDaily consumes loadRemoteEntry SYNCHRONOUSLY
// (cache only); fetchRemoteEntry refreshes the cache and reports change so
// home can re-deal an UNSTARTED day.
import engine from '@sworbl/engine';
import { supabase } from './supabase';

const CACHE_KEY = 'sworbl_rn_dayspec_'; // + dayKey

export interface DayEntry {
  sworb: string;
  themeWords: string[];
  definition?: string;
  archetype?: string | null;
}

function looksLikeEntry(v: unknown): v is DayEntry {
  const e = v as DayEntry;
  return (
    !!e && typeof e === 'object' &&
    typeof e.sworb === 'string' && e.sworb.length >= 4 &&
    Array.isArray(e.themeWords) && e.themeWords.every((w) => typeof w === 'string')
  );
}

// sync cache read — safe in render/deal paths
export function loadRemoteEntry(dayKey: string): DayEntry | null {
  const v = engine.store.getJSON(CACHE_KEY + dayKey, null);
  return looksLikeEntry(v) ? v : null;
}

// fetch → cache; resolves TRUE when the day's spec changed vs the cache
export async function fetchRemoteEntry(dayKey: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb
      .from('dailies')
      .select('content')
      .eq('day', dayKey)
      .maybeSingle();
    if (error || !data || !looksLikeEntry(data.content)) return false;
    const prev = JSON.stringify(engine.store.getJSON(CACHE_KEY + dayKey, null));
    const next = JSON.stringify(data.content);
    if (prev === next) return false;
    engine.store.setJSON(CACHE_KEY + dayKey, data.content);
    return true;
  } catch {
    return false;
  }
}
