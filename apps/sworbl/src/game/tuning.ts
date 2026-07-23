// THE KNOBS — every feel number in one place until the dev settings sheet
// exists. Engine defaults (TIME_FUEL) are the shipped values; override here
// while tuning on-device, then push the final numbers back into the engine.
import engine from '@sworbl/engine';

export const TUNING = {
  BASE_SECS: engine.run.TIME_FUEL.BASE_SECS, // 180 — three minutes given
  CAP_SECS: engine.run.TIME_FUEL.CAP_SECS, // 420 — the Seven, earned
  MERCY_SECS: 45, // time-fuel rounds: mercy pings on the 0:45 crossing
  PAR_TARGET: 3500, // scoring-header crown STUB — becomes today's #1 when Supabase standings land
  PAR_SECOND: 2400, // 2nd-place track mark STUB — same Supabase swap
  PAR_THIRD: 1500, // 3rd-place track mark STUB — "what's needed to get on the board"
  PUZZLE_EPOCH: '2026-07-01', // Nº 1 — the date header's puzzle counter
};
