// THE ARCHETYPE BADGE (owner: under the hints, above the leaderboard) —
// the split key:value pill: dark ARCHETYPE key half, candy value half in
// the reasoned hue. Tap = the archetype book.
import { router } from 'expo-router';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { ARCHETYPE_LABEL, ARCHETYPE_PAL } from '@/components/game/result-view';
import { PALETTE } from '@/game/palette';
import { type Theme } from '@/game/theme';

export function ArchetypeBadge({ theme, archetype }: { theme: Theme; archetype?: string | null }) {
  const label = archetype ? ARCHETYPE_LABEL[archetype] : null;
  if (!label) return null;
  const pal = PALETTE[ARCHETYPE_PAL[archetype ?? ''] ?? 2];
  return (
    <Pressable onPress={() => router.push('/archetypes')} hitSlop={8} style={styles.badge}>
      <View style={[styles.key, { backgroundColor: theme.pill }]}>
        <Text style={[styles.keyText, { color: theme.sub }]}>archetype</Text>
      </View>
      <View style={[styles.val, { backgroundColor: pal.bg, boxShadow: `inset 0 -2.5px 0 ${pal.edge}` }]}>
        <Text style={styles.valText}>{label}</Text>
        <View style={styles.info}>
          <Text style={styles.infoText}>i</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    borderRadius: 10, borderCurve: 'continuous',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  key: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  keyText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  val: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 4.5,
  },
  valText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#1F1442',
  },
  info: {
    width: 15,
    height: 15,
    borderRadius: 5, borderCurve: 'continuous',
    backgroundColor: 'rgba(31,20,66,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    color: '#1F1442',
  },
});
