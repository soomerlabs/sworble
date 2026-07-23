// PLAYER IDENTITY (device-local until Supabase): display name for the
// profile/leaderboard. Validation is length/charset only for now — the
// public-name profanity gate (engine containsFoulTerm) arrives with the
// server, where the canonical foul list will live.
import engine from '@sworbl/engine';

const NAME_KEY = 'sworbl_rn_name';
export const DEFAULT_NAME = 'PLAYER';

export function getPlayerName(): string {
  const v = engine.store.getJSON(NAME_KEY, null) as string | null;
  return v && typeof v === 'string' ? v : DEFAULT_NAME;
}

// returns the SAVED name (normalized) — callers re-read instead of trusting input
export function setPlayerName(raw: string): string {
  const name = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
  if (name.length < 2) return getPlayerName(); // too short: keep what we had
  engine.store.setJSON(NAME_KEY, name);
  return name;
}
