// STORMS (owner rename — open duels) — a LEFT-ALIGNED row of opponent
// blocks under the standings: the START MATCH block always leads, posted
// runs fill in behind it. Tap a person's block to race their recorded
// run. Cache-first like every remote surface; the header wears the
// standings section's exact type.
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

import { PALETTE, tileColorFor } from '@/game/palette';
import { ACCENT, ACCENT_EDGE, type Theme } from '@/game/theme';
import { fetchOpenDuels, readCachedDuels, type OpenDuel } from '@/net/duels';

export function DuelsRail({ theme, refreshNonce }: { theme: Theme; refreshNonce?: number }) {
  const [duels, setDuels] = useState<OpenDuel[]>(() => readCachedDuels());
  useEffect(() => {
    let live = true;
    fetchOpenDuels().then((d) => live && d && setDuels(d));
    return () => {
      live = false;
    };
  }, [refreshNonce]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.ink }]}>storms</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}>
        {/* START MATCH leads the row — inviting, always there */}
        <Pressable
          onPress={() => router.push('/storm?seed=first-storm&clock=120')}
          style={[styles.block, styles.startBlock]}>
          <View style={styles.startPlus}>
            <Text style={styles.startPlusGlyph}>+</Text>
          </View>
          <Text style={styles.startLabel}>start{'\n'}match</Text>
          <Text style={styles.startMeta}>2:00 blitz</Text>
        </Pressable>

        {duels.map((d) => {
          const pal = PALETTE[tileColorFor(d.name[0]?.toLowerCase() ?? 'a', 0)];
          return (
            <Pressable
              key={d.id}
              disabled={d.mine}
              onPress={() =>
                router.push(
                  `/storm?seed=${d.seed}&vs=${encodeURIComponent(d.name)}&target=${d.score}&did=${d.id}${d.format === 'blitz' ? '&clock=120' : ''}`
                )
              }
              style={[styles.block, { backgroundColor: theme.card }]}>
              <View style={[styles.avatar, { backgroundColor: pal.bg, boxShadow: `inset 0 -3px 0 ${pal.edge}` }]}>
                <Text style={styles.avatarLetter}>{d.name[0]}</Text>
              </View>
              <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>
                {d.name.toLowerCase()}
              </Text>
              <Text style={[styles.stat, { color: theme.sub }]}>
                {d.score.toLocaleString()} pts
              </Text>
              <Text style={[styles.meta, { color: d.mine ? theme.faint : ACCENT }]}>
                {d.mine ? 'your post' : d.format === 'blitz' ? 'race · 2:00' : 'race · themed'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: 12,
  },
  // rhymes with the masthead (owner: "sworb of the day, then storms") —
  // the two section names wear the same type
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  rowContent: {
    gap: 10,
    paddingRight: 18,
    paddingBottom: 6, // the start block's 4px ledge must not clip
    paddingTop: 2,
  },
  block: {
    width: 112,
    minHeight: 118,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 12,
    gap: 3,
    alignItems: 'flex-start',
  },
  startBlock: {
    backgroundColor: ACCENT,
    boxShadow: `0 4px 0 ${ACCENT_EDGE}`,
  },
  startPlus: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  startPlusGlyph: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: -2,
  },
  startLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14.5,
    lineHeight: 17,
    color: '#FFFFFF',
  },
  startMeta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.75)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: '#1F1442',
  },
  name: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14.5,
  },
  stat: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
