// The 6 clue pills under the board. States (web idiom, clueToken):
//   found → candy pill (PALETTE hue by slot)
//   ghost → dashed pill, FIRST LETTER + a dot per remaining letter — hint aid #1,
//           always-on ("r · · ·"), a free nudge that never gives the word away.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PALETTE, INK } from '@/game/palette';

interface Props {
  clues: string[];
  found: string[];
  // HINT LADDER (owner 2026-07-23): pills are BLANK by default — a first
  // letter shows only on the clue the starter nudge revealed (earned intel,
  // so it persists into the finale too)
  nudged?: string | null;
}

export function ClueFan({ clues, found, nudged }: Props) {
  return (
    <View style={styles.fan}>
      {clues.map((clue, i) => {
        const isFound = found.includes(clue);
        const pal = PALETTE[i % PALETTE.length];
        return (
          <View
            key={clue}
            style={[
              styles.pill,
              isFound
                ? { backgroundColor: pal.bg, boxShadow: `0 2px 0 ${pal.edge}` }
                : styles.pillGhost,
            ]}>
            <Text style={[styles.pillText, isFound ? { color: INK } : styles.ghostText]}>
              {isFound
                ? clue.toUpperCase()
                : nudged === clue
                  ? clue[0] + ' ' + '· '.repeat(clue.length - 1).trim()
                  : '· '.repeat(clue.length).trim()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fan: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    marginTop: 14,
    maxWidth: 420,
  },
  pill: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  pillGhost: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3A3A44',
  },
  pillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  ghostText: {
    color: '#9DA2B3',
  },
});
