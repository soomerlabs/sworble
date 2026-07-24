// HOW TO PLAY — the onboarding home (v1: the rules, told in the game's own
// grammar; grows into the full tutorial later). Reached from the ⓘ in the
// home header's right slot (pre-play only — the score lives there after).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ScreenBar } from '@/components/screen-bar';
import { ScreenHeader } from '@/components/screen-header';
import { Floaters } from '@/components/home/floaters';
import { useTheme, ACCENT, CLUE_GREEN } from '@/game/theme';
import { PALETTE } from '@/game/palette';

const STEPS: { pal: number; title: string; body: string }[] = [
  {
    pal: 1,
    title: 'swipe words',
    body: 'drag across neighboring letters to spell — longer words pay much more, and every word buys you extra seconds on the clock.',
  },
  {
    pal: 2,
    title: 'catch the 6 clues',
    body: "six hidden words share a secret connection. spell one and it banks below the board — each clue is intel about the day's answer.",
  },
  {
    pal: 0,
    title: "crack the day's word",
    body: 'at 0:00 the guess slides up — 6 tries for the WHOLE day at the one word behind the clues. fewer clues found, bigger the bonus.',
  },
  {
    pal: 4,
    title: 'play all day — but guess early',
    body: "rounds are replayable until midnight and your BEST round counts. every extra round shrinks the solve bonus, so bravery pays: guess while it's rich.",
  },
];

export default function HowToScreen() {
  const theme = useTheme();
  const dims = useWindowDimensions();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {/* the home screen's drifting candy tiles — every screen breathes (owner) */}
      <Floaters width={dims.width} height={dims.height} />
      <SafeAreaView style={styles.safe}>
        <ScreenBar theme={theme} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader theme={theme} eyebrow="HOW TO PLAY" title="sworbl" />
          {STEPS.map((s, i) => {
            const pal = PALETTE[s.pal];
            return (
              <View key={s.title} style={[styles.step, { backgroundColor: theme.card }]}>
                <View
                  style={[
                    styles.stepBlock,
                    { backgroundColor: pal.bg, boxShadow: `inset 0 -4px 0 ${pal.edge}` },
                  ]}>
                  <Text style={styles.stepNo}>{i + 1}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.stepTitle, { color: theme.ink }]}>{s.title}</Text>
                  <Text style={[styles.stepBody, { color: theme.sub }]}>{s.body}</Text>
                </View>
              </View>
            );
          })}
          <Text style={[styles.hintLine, { color: theme.faint }]}>
            hints arrive as you play: 3 words in → a free first letter · 7 words → a free clue ·
            the finale always starts with at least <Text style={{ color: CLUE_GREEN }}>2 banked</Text>
          </Text>
          <Text style={[styles.hintLine, { color: theme.faint }]}>
            watch for the <Text style={{ color: ACCENT }}>daily twist</Text> — the connection
            between the clues changes every day
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    gap: 13,
    borderRadius: 14, borderCurve: 'continuous',
    padding: 14,
    alignItems: 'flex-start',
  },
  stepBlock: {
    width: 34,
    height: 34,
    borderRadius: 10, borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNo: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 17,
    color: '#1F1442',
    includeFontPadding: false,
  },
  stepText: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15.5,
  },
  stepBody: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    lineHeight: 18,
  },
  hintLine: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
