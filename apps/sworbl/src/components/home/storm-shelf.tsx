// THE STORM SHELF (owner ruling): three FRESH boards every day, each with
// its own persistent leaderboard — jump in, place, own the crown. Cards
// show the current holder and YOUR best; a board you haven't run yet is
// an invitation. Sits under the 'storms' section name with the SHOWDOWN
// rail (open 1v1 posts) behind it.
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

import { PALETTE } from '@/game/palette';
import { dailyStormBoards } from '@/game/storm-seeds';
import { ACCENT, type Theme } from '@/game/theme';
import { fetchOpenDuels, fetchStormCrowns, readCachedDuels, type OpenDuel } from '@/net/duels';

type Crowns = Record<string, { top: { name: string; score: number } | null; mine: number | null }>;

export function StormShelf({ theme, refreshNonce }: { theme: Theme; refreshNonce?: number }) {
  const boards = useMemo(() => dailyStormBoards(), []);
  const [crowns, setCrowns] = useState<Crowns | null>(null);
  const [duels, setDuels] = useState<OpenDuel[]>(() => readCachedDuels());
  useEffect(() => {
    let live = true;
    fetchStormCrowns(boards.map((b) => b.seed)).then((c) => live && c && setCrowns(c));
    fetchOpenDuels().then((d) => live && d && setDuels(d));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.ink }]}>storms</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}>
        {boards.map((b, i) => {
          const pal = PALETTE[i * 2 % PALETTE.length];
          const c = crowns?.[b.seed];
          return (
            <Pressable
              key={b.seed}
              onPress={() => router.push(`/storm?seed=${b.seed}&clock=120`)}
              style={[styles.block, { backgroundColor: theme.card }]}>
              <View style={[styles.chip, { backgroundColor: pal.bg, boxShadow: `inset 0 -3px 0 ${pal.edge}` }]}>
                <Text style={styles.chipGlyph}>⛈</Text>
              </View>
              <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.stat, { color: theme.sub }]} numberOfLines={1}>
                {c?.top
                  ? `${c.top.score.toLocaleString()} · ${c.top.name.toLowerCase()}`
                  : 'no crown yet'}
              </Text>
              <Text style={[styles.meta, { color: c?.mine != null ? theme.faint : ACCENT }]}>
                {c?.mine != null ? `your best ${c.mine.toLocaleString()}` : 'run it ›'}
              </Text>
            </Pressable>
          );
        })}

        {/* SHOWDOWNS (owner rename): open 1v1 posts ride the same shelf */}
        {duels.map((d) => {
          const pal = PALETTE[(d.name.charCodeAt(0) ?? 97) % PALETTE.length];
          return (
            <Pressable
              key={`sd-${d.id}`}
              disabled={d.mine}
              onPress={() =>
                router.push(
                  `/storm?seed=${d.seed}&vs=${encodeURIComponent(d.name)}&target=${d.score}&did=${d.id}${d.format === 'blitz' ? '&clock=120' : ''}`
                )
              }
              style={[styles.block, { backgroundColor: theme.card }]}>
              <View style={[styles.chip, { backgroundColor: pal.bg, boxShadow: `inset 0 -3px 0 ${pal.edge}` }]}>
                <Text style={[styles.chipLetter]}>{d.name[0]}</Text>
              </View>
              <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>
                {d.name.toLowerCase()}
              </Text>
              <Text style={[styles.stat, { color: theme.sub }]}>{d.score.toLocaleString()} pts</Text>
              <Text style={[styles.meta, { color: d.mine ? theme.faint : ACCENT }]}>
                {d.mine ? 'your showdown' : 'showdown ›'}
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
  // rhymes with the masthead — the two section names wear the same type
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  rowContent: {
    gap: 10,
    paddingRight: 18,
    paddingBottom: 6,
    paddingTop: 2,
  },
  block: {
    width: 128,
    minHeight: 118,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 12,
    gap: 3,
    alignItems: 'flex-start',
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  chipGlyph: { fontSize: 14 },
  chipLetter: {
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
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
