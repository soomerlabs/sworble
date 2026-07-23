// PLAYER IDENTITY: display name for the profile/leaderboard. Length +
// charset + the profanity gate (engine containsFoulTerm over FOUL_STEMS,
// the Scunthorpe-aware boundary matcher). A server-side twin lands with
// the rename edge function at launch.
import engine from '@sworbl/engine';
import { FOUL_STEMS } from './foul';

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

// the public-name gate — callers can pre-check to give honest feedback
export function isNameAllowed(raw: string): boolean {
  const name = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return !engine.core.containsFoulTerm(name, FOUL_STEMS);
}

// returns the SAVED name (normalized) — callers re-read instead of trusting input
export function setPlayerName(raw: string): string {
  const name = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
  if (name.length < 2) return getPlayerName(); // too short: keep what we had
  if (!isNameAllowed(name)) return getPlayerName(); // the foul gate holds
  engine.store.setJSON(NAME_KEY, name);
  return name;
}
