// THE TORCH (owner: "drop everything they have and start fresh") — a
// content epoch on the server. The app checks it at its existing
// phone-home moments; a bumped epoch burns every locally cached day spec
// AND the current day's state, then the caller re-deals from the server.
// The never-torch-mid-round law holds: the caller only invokes this while
// the sheet is parked.
import engine from '@sworbl/engine';
import { supabase } from './supabase';
import { resetDay } from '@/game/persist';

const EPOCH_KEY = 'sworbl_rn_content_epoch';
const DAYSPEC_PREFIX = 'sworbl_rn_dayspec_'; // dailies-remote's cache keys

// returns true when the epoch moved and the torch ran — the caller bumps
// its content nonce so the home re-deals
export async function checkContentEpoch(todayKey: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  try {
    const { data, error } = await sb
      .from('app_config')
      .select('value')
      .eq('key', 'content_epoch')
      .maybeSingle();
    if (error || !data) return false;
    const remote = Number(data.value);
    if (!Number.isFinite(remote)) return false;
    const local = Number(engine.store.getJSON(EPOCH_KEY, 0));
    if (local === 0) {
      // first sighting: adopt silently — a fresh install is already fresh
      engine.store.setJSON(EPOCH_KEY, remote);
      return false;
    }
    if (remote === local) return false;

    // THE TORCH: every cached day spec burns, today's state burns, the
    // epoch advances. Yesterday's finished days keep their history
    // (scores/stats are results, not content).
    for (const k of engine.store.keys()) {
      if (k.startsWith(DAYSPEC_PREFIX)) engine.store.remove(k);
    }
    resetDay(todayKey);
    engine.store.setJSON(EPOCH_KEY, remote);
    return true;
  } catch {
    return false;
  }
}
