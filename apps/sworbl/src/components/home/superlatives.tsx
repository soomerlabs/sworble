// SUPERLATIVES — the day's best 5 words as candy pills, centered, with dashed
// placeholders until they're earned (v18: placeholders even with one filled).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PALETTE, INK, tileColorFor } from '@/game/palette';
import type { BestWord } from '@/game/persist';

export function Superlatives({ words }: { words: BestWord[] }) {
  const slots: (BestWord | null)[] = Array.from({ length: 5 }, (_, i) => words[i] ?? null);
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>SUPERLATIVES</Text>
      <View style={styles.fan}>
        {slots.map((w, i) => {
          if (!w) {
            return <View key={`ph${i}`} style={[styles.pill, styles.ghost]} />;
          }
          const pal = PALETTE[tileColorFor(w.word[0], i)];
          return (
            <View key={w.word + i} style={[styles.pill, { backgroundColor: pal.bg, shadowColor: pal.edge }, styles.solid]}>
              <Text style={styles.pillText}>
                {w.word.toUpperCase()} <Text style={styles.pts}>+{w.pts}</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5A5A66',
  },
  fan: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    maxWidth: 340,
    minHeight: 62, // two-row height even while empty (v18)
  },
  pill: {
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
    minWidth: 54,
    minHeight: 27,
  },
  ghost: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2E2E38',
  },
  solid: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  pillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.4,
    color: INK,
    textAlign: 'center',
  },
  pts: {
    fontSize: 11,
  },
});
