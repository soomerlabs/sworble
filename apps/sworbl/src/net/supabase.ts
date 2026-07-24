// SUPABASE CLIENT — the whole backend hangs off two env strings. Absent →
// isConfigured() false and every caller falls back to the local stubs: the
// app NEVER depends on the network to function (local-first law).
//   .env:  EXPO_PUBLIC_SUPABASE_URL=…  EXPO_PUBLIC_SUPABASE_ANON_KEY=…
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import engine from '@sworbl/engine';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isConfigured(): boolean {
  return URL.length > 0 && KEY.length > 0;
}

// auth session persists through the SAME storage the game uses (MMKV via
// the engine's backing — sync under the hood, async facade for supabase)
const storageAdapter = {
  getItem: async (k: string) => (engine.store.getJSON(k, null) as string | null),
  setItem: async (k: string, v: string) => {
    engine.store.setJSON(k, v);
  },
  removeItem: async (k: string) => {
    engine.store.remove(k);
  },
};

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!isConfigured()) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        storage: storageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

// anonymous identity: sign in once, upsert the player row with the local
// name. Fire-and-forget from boot; failures are silent (local-first).
// USERNAMES ARE UNIQUE (schema v5, owner: "username is what games do") —
// a collision on a MINTED default remints and retries once; a collision
// on a chosen name is surfaced through renamePlayer instead.
export async function ensurePlayer(name: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const res = await sb.auth.signInAnonymously();
      if (res.error) return null;
      data = { session: res.data.session };
    }
    const uid = data.session?.user.id ?? null;
    if (uid) {
      const { error } = await sb.from('players').upsert({ id: uid, name }, { onConflict: 'id' });
      if (error && `${error.code}` === '23505' && /^PLAYER\d{4}$/.test(name)) {
        // minted default collided — remint locally and try once more
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { remintPlayerName } = require('@/game/player');
        const fresh = remintPlayerName();
        await sb.from('players').upsert({ id: uid, name: fresh }, { onConflict: 'id' });
      }
    }
    return uid;
  } catch {
    return null;
  }
}

// the rename path with an honest verdict — 'taken' feeds the profile toast
export async function renamePlayer(name: string): Promise<'ok' | 'taken' | 'error'> {
  const sb = supabase();
  if (!sb) return 'ok'; // offline/unconfigured: local-first, server catches up at boot
  try {
    const { data } = await sb.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return 'error';
    const { error } = await sb.from('players').upsert({ id: uid, name }, { onConflict: 'id' });
    if (!error) return 'ok';
    return `${error.code}` === '23505' ? 'taken' : 'error';
  } catch {
    return 'error';
  }
}
