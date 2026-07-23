// The STEPPER CARD (web hopperCardStyle + bannerEl + payBadge): the strip
// above the board where the traced word builds in candy chips, with the
// pay badge (×mult · pts) fading in at the top-right while a chain is lit.
// Verdicts land here too: valid word + points, invalid in red.
// (The sworb-day guess face and the letter-flight arrival are later passes.)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { PALETTE, CARD, tileColorFor } from '@/game/palette';
import { scoreWord } from '@/game/dict';

export interface StepperVerdict {
  word: string;
  pts?: number;
  ok: boolean;
  clue?: string;
}

interface Props {
  width: number; // boardW + 24, the shared rail
  traceWord: string; // live chain, lowercase ('' when idle)
  verdict: StepperVerdict | null;
}

function Chips({ word, red }: { word: string; red?: boolean }) {
  const hs = Math.min(30, Math.floor(220 / Math.max(1, word.length)));
  return (
    <View style={styles.chipRow}>
      {[...word].map((ch, i) => {
        const pal = PALETTE[tileColorFor(ch, i)];
        return (
          <Animated.View
            key={i + ch}
            entering={ZoomIn.springify().mass(0.5)}
            style={[
              styles.chip,
              {
                width: hs,
                height: hs,
                borderRadius: Math.round(hs * 0.27),
                backgroundColor: red ? '#E5484D' : pal.bg,
                shadowColor: red ? '#8C2328' : pal.edge,
              },
            ]}>
            <Text style={[styles.chipText, { fontSize: Math.round(hs * 0.55) }]}>
              {ch.toUpperCase()}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function StepperCard({ width, traceWord, verdict }: Props) {
  const tracing = traceWord.length > 0;
  const mult = tracing ? engine.core.lenMult(traceWord.length) : 0;
  const pts = tracing && traceWord.length >= 3 ? scoreWord(traceWord) : 0;

  return (
    <View style={[styles.card, { width }]}>
      {/* the banner: live chain chips, a landed verdict, or the idle line */}
      {verdict ? (
        <View style={styles.bannerRow}>
          <Chips word={verdict.word.toLowerCase()} red={!verdict.ok} />
          {verdict.ok && (
            <Animated.Text entering={FadeIn.duration(150)} style={styles.pts}>
              +{verdict.pts}
              {verdict.clue ? '  ✦' : ''}
            </Animated.Text>
          )}
        </View>
      ) : tracing ? (
        <Chips word={traceWord} />
      ) : (
        <Text style={styles.idle}>swipe to spell</Text>
      )}

      {/* pay badge (web payBadgeStyle): ×mult · running pts, only while tracing */}
      {tracing && mult > 1 && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.payBadge}>
          <Text style={styles.payMult}>×{mult}</Text>
          {pts > 0 && <Text style={styles.payPts}>{pts}</Text>}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD.bg,
    borderRadius: 16,
    padding: 10,
    minHeight: 64,
    marginBottom: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CARD.edge,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  chipText: {
    fontFamily: 'Fredoka_600SemiBold',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  pts: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 17,
    color: '#5FD6A8',
  },
  idle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    letterSpacing: 1.5,
    color: '#3A3A44',
    textTransform: 'uppercase',
  },
  payBadge: {
    position: 'absolute',
    top: 5,
    right: 7,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#26262E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  payMult: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: '#F5B84A',
  },
  payPts: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: '#9DA2B3',
  },
});
