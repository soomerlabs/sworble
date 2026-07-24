// THE ARCHETYPE BOOK (owner: "put an i next to the archetype and explain
// the different ones") — a pageSheet explaining the five ways a day's
// clues can relate to its word. On-brand cards: candy chip, name, the
// rule, a tiny example.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ARCHETYPE_PAL, ARCHETYPE_RULE } from '@/components/game/result-view';
import { PALETTE } from '@/game/palette';
import { useTheme } from '@/game/theme';

const BOOK = [
  {
    key: 'straight', name: 'category',
    example: 'FOREST ← pine, moss, birch, canopy',
  },
  {
    key: 'connector', name: 'connector',
    example: 'FIRE ← camp(fire), (fire)work, (fire)place',
  },
  {
    key: 'sibling', name: 'sibling',
    example: 'SILVER ← gold, copper, bronze, zinc',
  },
  {
    key: 'association', name: 'association',
    example: 'CLOCK ← face, alarm, chime, cuckoo',
  },
  {
    key: 'lateral', name: 'lateral',
    example: 'BROKEN ← news, heart, mirror, promise',
  },
  {
    key: 'wordplay', name: 'wordplay',
    example: 'SAFARI ← grAPE, prOWL, goATee',
  },
];

export default function ArchetypesScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.eyebrow, { color: theme.faint }]}>ARCHETYPES</Text>
          <Text style={[styles.title, { color: theme.ink }]}>
            six ways the clues point at the word
          </Text>
          <Text style={[styles.lede, { color: theme.sub }]}>
            every day wears one — it&rsquo;s on the home screen before you play.
            the clues never lie; the archetype tells you HOW they&rsquo;re telling
            the truth.
          </Text>
          {BOOK.map((a) => {
            const pal = PALETTE[ARCHETYPE_PAL[a.key] ?? 2];
            return (
              <View key={a.key} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={[styles.chip, { backgroundColor: pal.bg, boxShadow: `inset 0 -3px 0 ${pal.edge}` }]}>
                  <Text style={styles.chipLetter}>{a.name[0]}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardName, { color: theme.ink }]}>{a.name}</Text>
                  <Text style={[styles.cardRule, { color: theme.sub }]}>{ARCHETYPE_RULE[a.key]}</Text>
                  <Text style={[styles.cardExample, { color: theme.faint }]}>{a.example}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 12,
  },
  eyebrow: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    letterSpacing: 2.5,
  },
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    lineHeight: 27,
  },
  lede: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16, borderCurve: 'continuous',
    padding: 14,
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 10, borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 17,
    color: '#1F1442',
  },
  cardText: { flex: 1, gap: 2 },
  cardName: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
  },
  cardRule: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    lineHeight: 17,
  },
  cardExample: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11.5,
    marginTop: 2,
  },
});
