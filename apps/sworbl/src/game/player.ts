// PLAYER IDENTITY (device-local until Supabase): display name for the
// profile/leaderboard. Validation is length/charset only for now — the
// public-name profanity gate (engine containsFoulTerm) arrives with the
// server, where the canonical foul list will live.
import engine from '@sworbl/engine';

const NAME_KEY = 'sworbl_rn_name';

// first launch MINTS a handle (PLAYER + 4 digits) instead of everyone
// landing as 'PLAYER' — names aren't unique on the server (identity is the
// anonymous auth uuid), but the standings read far better when testers
// don't all collide on one word. Persisted immediately so it's stable.
function mintName(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `PLAYER${digits}`;
}

export function getPlayerName(): string {
  const v = engine.store.getJSON(NAME_KEY, null) as string | null;
  if (v && typeof v === 'string') return v;
  const minted = mintName();
  engine.store.setJSON(NAME_KEY, minted);
  return minted;
}

// returns the SAVED name (normalized) — callers re-read instead of trusting input
export function setPlayerName(raw: string): string {
  const name = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
  if (name.length < 2) return getPlayerName(); // too short: keep what we had
  engine.store.setJSON(NAME_KEY, name);
  return name;
}
