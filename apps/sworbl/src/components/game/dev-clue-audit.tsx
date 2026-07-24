// DEV CLUE AUDIT (web "Today's clues" panel port) — fairness lens for the
// owner: every clue REVEALED under the board; tap one and the solver proves
// it on the LIVE board right now — provable path flashes gold tile-by-tile,
// unprovable shakes the chip red. __DEV__ only (the board gates rendering).
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { PALETTE } from '@/game/palette';

// ---- the strip of revealed chips ----
interface StripProps {
  clues: string[];
  found: string[];
  findableNow: number; // solver-proven findable among the unfound, RIGHT NOW
  // returns true if the solver proved a path (board flashes it)
  onTap: (clue: string) => boolean;
}

function AuditChip({ clue, slot, isFound, onTap }: {
  clue: string; slot: number; isFound: boolean; onTap: (c: string) => boolean;
}) {
  const shakeX = useSharedValue(0);
  const [dead, setDead] = useState(false);
  const pal = PALETTE[slot % PALETTE.length];
  const tap = () => {
    const ok = onTap(clue);
    setDead(!ok);
    if (!ok) {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(5, { duration: 60 }),
        withTiming(-3, { duration: 55 }),
        withTiming(0, { duration: 60 })
      );
    }
  };
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  return (
    <Animated.View style={st}>
      <Pressable
        onPress={tap}
        style={[
          styles.chip,
          isFound
            ? { backgroundColor: pal.bg, boxShadow: `0 2px 0 ${pal.edge}` }
            : dead
              ? styles.chipDead
              : styles.chipOpen,
        ]}>
        <Text style={[styles.chipText, { color: isFound ? '#1F1442' : dead ? '#FF8A8E' : '#F5B84A' }]}>
          {clue.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function DevClueAudit({ clues, found, findableNow, onTap }: StripProps) {
  const unfound = clues.filter((c) => !found.includes(c)).length;
  const starved = unfound >= 2 && findableNow < 2;
  return (
    <View style={styles.strip}>
      <Text style={[styles.label, starved && styles.labelBad]}>
        DEV · findable now: {findableNow}/{unfound} unfound
        {starved ? '  ⚠ STARVED' : ''} · tap to prove
      </Text>
      <View style={styles.row}>
        {clues.map((c, i) => (
          <AuditChip key={c} clue={c} slot={i} isFound={found.includes(c)} onTap={onTap} />
        ))}
      </View>
    </View>
  );
}

// ---- the path flash: gold outlines stamped tile-by-tile, then gone ----
interface FlashProps {
  cells: { col: number; row: number }[];
  size: number;
  cell: number;
  onDone: () => void;
}

function FlashCell({ c, i, size, cell }: {
  c: { col: number; row: number }; i: number; size: number; cell: number;
}) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(
      i * 70,
      withSequence(withTiming(1, { duration: 110 }), withTiming(1, { duration: 700 }), withTiming(0, { duration: 250 }))
    );
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st, styles.flashCell,
        {
          left: c.col * cell, top: c.row * cell,
          width: size, height: size, borderRadius: Math.round(size * 0.2), borderCurve: 'continuous',
        },
      ]}>
      <Text style={styles.flashSeq}>{i + 1}</Text>
    </Animated.View>
  );
}

export function DevFlash({ cells, size, cell, onDone }: FlashProps) {
  useEffect(() => {
    const t = setTimeout(onDone, cells.length * 70 + 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cells.map((c, i) => (
        <FlashCell key={i} c={c} i={i} size={size} cell={cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: '#F5B84A',
  },
  labelBad: {
    color: '#FF8A8E',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  chip: {
    borderRadius: 9, borderCurve: 'continuous',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOpen: {
    borderWidth: 2,
    borderColor: '#F5B84A',
  },
  chipDead: {
    borderWidth: 2,
    borderColor: '#FF8A8E',
  },
  chipText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  flashCell: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#F5B84A',
    backgroundColor: 'rgba(245,184,74,0.18)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 2,
  },
  flashSeq: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    color: '#F5B84A',
  },
});
