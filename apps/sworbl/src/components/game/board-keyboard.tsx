// THE BOARD-KEYBOARD (fossil sworbKb, ported): at 0:00 the board's own grid
// becomes the keyboard — 26 alphabetical keys, EACH IN CANDY (the keyboard is
// its own bright surface; color is earned on the play board, given here),
// laid on the exact 5×6 tile grid. Bottom row: ⌫ (2-wide, mono) + the submit
// key (mono ⏎ until the slots fill → mint GUESS). Overlay crossfades over the
// fading tiles — the player never leaves the board.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PALETTE, INK, GAME_DARK, type GameSurface } from '@/game/palette';

interface Props {
  gs?: GameSurface;
  size: number; // tile size — keys ARE tiles
  gap: number;
  full: boolean; // all slots typed → the submit key goes mint GUESS
  onKey: (ch: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

function Key({
  w, h, bg, edge, ink, label, fontSize, onPress,
}: {
  w: number; h: number; bg: string; edge: string; ink: string;
  label: string; fontSize: number; onPress: () => void;
}) {
  const lift = Math.max(3, Math.round(h * 0.08));
  const rad = Math.round(h * 0.2);
  return (
    <Pressable onPress={onPress} style={{ width: w, height: h + lift }}>
      {({ pressed }) => (
        <>
          <View style={[styles.ledge, { top: lift, width: w, height: h, borderRadius: rad, backgroundColor: edge }]} />
          <View
            style={[
              styles.face,
              { width: w, height: h, borderRadius: rad, backgroundColor: bg },
              pressed && { transform: [{ translateY: lift - 1 }] },
            ]}>
            <Text style={[styles.label, { fontSize, color: ink }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function BoardKeyboard({ gs = GAME_DARK, size, gap, full, onKey, onBackspace, onSubmit }: Props) {
  const cell = size + gap;
  const rows: React.ReactNode[] = [];
  // rows 0-4: A-Z alphabetical, candy by index (fossil: PALETTE[i % 6])
  for (let r = 0; r < 5; r++) {
    const keys = [];
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      if (i > 25) break;
      const ch = String.fromCharCode(65 + i);
      const pal = PALETTE[i % PALETTE.length];
      keys.push(
        <Key
          key={ch}
          w={size} h={size} bg={pal.bg} edge={pal.edge} ink={INK}
          label={ch} fontSize={Math.round(size * 0.5)}
          onPress={() => onKey(ch.toLowerCase())}
        />
      );
    }
    rows.push(
      <View key={r} style={[styles.row, { gap, top: r * cell }]}>
        {keys}
      </View>
    );
  }
  // row 5: Z's leftover? (25 letters fill 5 rows exactly when 25... A-Z = 26:
  // fossil grid flows 26 keys then two 2-wide specials — recreate: last letter
  // Z lands row 5 col 0, then ⌫ (2-wide) + submit (2-wide) complete the row
  const wide = size * 2 + gap;
  rows.push(
    <View key={5} style={[styles.row, { gap, top: 5 * cell }]}>
      <Key
        w={size} h={size}
        bg={PALETTE[25 % PALETTE.length].bg} edge={PALETTE[25 % PALETTE.length].edge} ink={INK}
        label="Z" fontSize={Math.round(size * 0.5)}
        onPress={() => onKey('z')}
      />
      <Key
        w={wide} h={size} bg={gs.mono.bg} edge={gs.mono.edge} ink={gs.monoInk}
        label="⌫" fontSize={Math.round(size * 0.44)}
        onPress={onBackspace}
      />
      <Key
        w={wide} h={size}
        bg={full ? '#5FD6A8' : gs.mono.bg}
        edge={full ? '#38AD7F' : gs.mono.edge}
        ink={full ? INK : '#6E6E7A'}
        label={full ? 'GUESS' : '⏎'}
        fontSize={full ? Math.round(size * 0.3) : Math.round(size * 0.44)}
        onPress={onSubmit}
      />
    </View>
  );

  return (
    <Animated.View
      // AFTER the letters have dimmed (owner: 00:00 slammed everything at
      // once) — a beat, then the keys rise in
      entering={FadeInDown.delay(260).duration(340)}
      style={[StyleSheet.absoluteFill, styles.grid]}>
      {rows}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    justifyContent: 'flex-start',
  },
  row: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
  },
  ledge: {
    position: 'absolute',
    left: 0,
  },
  face: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    includeFontPadding: false,
  },
});
