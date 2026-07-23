// Candy palette + letter→hue mapping — verbatim from the web app (index.html).
import engine from '@sworbl/engine';

export interface Pal {
  bg: string;
  hi: string;
  edge: string;
}

export const PALETTE: Pal[] = [
  { bg: '#A78BFA', hi: '#BBA5FC', edge: '#7C5CE0' }, // brand violet
  { bg: '#5BC8F5', hi: '#7DD6F8', edge: '#2E9FD0' }, // brand cyan
  { bg: '#5FD6A8', hi: '#80E1BB', edge: '#38AD7F' }, // mint
  { bg: '#F58FB8', hi: '#F8ABC9', edge: '#D06090' }, // pink
  { bg: '#F5B84A', hi: '#F8CA74', edge: '#CE9022' }, // amber
  { bg: '#F58A66', hi: '#F8A588', edge: '#CC5F3D' }, // coral
];

export const INK = '#1F1442';
export const BG_DARK = '#101014';

// the mono board (web: MONO_DARK) — tiles idle GRAY; color is EARNED (traced)
export const MONO_DARK: Pal = { bg: '#33333E', hi: '#42424F', edge: '#22222A' };
export const MONO_INK = '#F2F1F4';

// the board card + its sunken cell wells (web: --card/--card-edge dark + cells)
export const CARD = { bg: '#1E1E24', edge: '#0A0A0D', well: '#141418' };

// GAME SURFACES per scheme — the fossil's exact theme table (index.html
// rootStyle vars + the light mono block from clueToken). STABLE module
// objects: components take these as props without breaking memoization.
export interface GameSurface {
  bg: string; // the sheet's game layer
  card: string; // board card + stepper card
  cardEdge: string;
  well: string; // sunken cells
  mono: Pal; // idle tiles + keyboard keys
  monoInk: string;
  line: string; // dashed ghosts, tracks, knobs (web --line)
  ink: string; // primary text on the game layer
  sub: string; // secondary text
  tileAmbient: string; // soft under-tile shadow ('' = none; light mode only —
  // the hard ledge carries less depth on a bright ground)
  timer: string; // the round clock (mint family, per-scheme contrast)
  timerLow: string; // ≤30s warning
  overlay: string; // count-in / paused dim
}

export const GAME_DARK: GameSurface = {
  bg: '#101014',
  card: '#1E1E24',
  cardEdge: '#0A0A0D',
  well: '#141418',
  mono: MONO_DARK,
  monoInk: MONO_INK,
  line: '#3A3A44',
  ink: '#EDEFF7',
  sub: '#9DA2B3',
  tileAmbient: '', // dark reads deep off the ledge alone (web parity)
  timer: '#EDEFF7', // plain ink (owner: no green — white on dark, black on light)
  timerLow: '#FF8A8E',
  overlay: 'rgba(16,16,20,0.55)',
};

export const GAME_LIGHT: GameSurface = {
  bg: '#EDEFF7',
  card: '#FFFFFF',
  cardEdge: '#C9CDDD',
  well: '#EDEFF4',
  // the fossil's REAL light mono (index.html MONO + --rji): pale lavender
  // faces, near-BLACK letters — the first port lifted a settings-pill token
  // by mistake (owner caught it: "we had black characters in light")
  mono: { bg: '#EAE8F0', hi: '#F5F4F9', edge: '#C8C4D2' },
  monoInk: '#1C1B20',
  line: '#D3D6E0',
  ink: '#1F1442',
  sub: '#6E7180',
  tileAmbient: '0 2px 3px rgba(31,20,66,0.13)', // fossil recap-block ambient, dialed subtle
  timer: '#1F1442', // plain ink (owner: no green — white on dark, black on light)
  timerLow: '#C43B44',
  overlay: 'rgba(237,239,247,0.6)',
};

export function gameSurface(mode: 'light' | 'dark'): GameSurface {
  return mode === 'light' ? GAME_LIGHT : GAME_DARK;
}

// same families as the web tileColorFor: vowels amber/coral, premium pink,
// mid-value violet, commons cyan/mint
export function tileColorFor(letter: string, id: number | null = null): number {
  const pick = ((id != null ? id : 0) * 7 + letter.charCodeAt(0)) % 2;
  if ('aeiou'.includes(letter)) return pick ? 4 : 5;
  const v = engine.core.VALUES[letter] || 1;
  if (v >= 5) return 3;
  if (v >= 2) return 0;
  return pick ? 1 : 2;
}
