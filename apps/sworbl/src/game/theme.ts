// THEME TOKENS — the design handoff's exact light/dark pairs (HANDOFF.md
// "Tokens"): light bg #EDEFF7 / ink #1F1442 / sub #8A8FA3, dark bg #101014 /
// ink #EDEFF7 / sub #9DA2B3. Candy block colors are theme-INVARIANT (the
// palette reads on both grounds); only surfaces, ink, and hairlines swap.
import { useColorScheme } from 'react-native';

export interface Theme {
  mode: 'light' | 'dark';
  bg: string;
  ink: string; // primary text
  sub: string; // secondary text
  faint: string; // tertiary labels (DAILY PUZZLE ·, WHAT YOU GOT)
  hairline: string;
  dashed: string; // dashed ghost borders (empty tiles, got-away pills)
  icon: string;
  pill: string; // flat pill fill (non-candy word pills)
  blockShadow: string; // ambient drop under floating candy blocks
}

export const ACCENT = '#8971FF'; // indigo — you / action (both modes)
export const ACCENT_EDGE = '#6B4EE6';
export const CLUE_GREEN = '#5FD6A8';
export const CLUE_GREEN_EDGE = '#38AD7F';

const DARK: Theme = {
  mode: 'dark',
  bg: '#101014',
  ink: '#EDEFF7',
  sub: '#9DA2B3',
  faint: '#6b6b76',
  hairline: 'rgba(255,255,255,0.08)',
  dashed: 'rgba(255,255,255,0.22)',
  icon: '#9DA2B3',
  pill: 'rgba(255,255,255,0.05)',
  blockShadow: '0 5px 12px rgba(0,0,0,0.4)',
};

const LIGHT: Theme = {
  mode: 'light',
  bg: '#EDEFF7',
  ink: '#1F1442',
  sub: '#8A8FA3',
  faint: '#6b6b76',
  hairline: 'rgba(31,20,66,0.08)',
  dashed: '#C4C2CE',
  icon: '#6A6F82',
  pill: 'rgba(31,20,66,0.05)',
  blockShadow: '0 5px 12px rgba(31,20,66,0.16)',
};

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? LIGHT : DARK;
}
