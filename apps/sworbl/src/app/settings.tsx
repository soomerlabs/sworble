// SETTINGS — designed in the handoff's family (card rows on the theme
// surface): player name, appearance (system/light/dark), haptics, about.
// DEV builds get the developer tools row (the old gear destination).
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { ScreenBar } from '@/components/screen-bar';
import { ScreenHeader } from '@/components/screen-header';
import { useTheme, useThemeMode, setThemeMode, ACCENT, type ThemeMode } from '@/game/theme';
import { getPlayerName, setPlayerName } from '@/game/player';
import { hapticsEnabled, setHapticsEnabled, haptic } from '@/game/haptics';
import { ensurePlayer } from '@/net/supabase';
import { toast } from '@/components/toast';

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'system' },
  { key: 'light', label: 'light' },
  { key: 'dark', label: 'dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const mode = useThemeMode();
  const [name, setName] = useState(getPlayerName());
  const [haptics, setHaptics] = useState(hapticsEnabled());

  const commitName = () => {
    const before = getPlayerName();
    const saved = setPlayerName(name);
    setName(saved); // normalization (or rejection) reflects back
    if (saved !== before) {
      // the server learns IMMEDIATELY (it only synced at boot before) —
      // standings rename on the next fetch
      void ensurePlayer(saved);
      toast(`you're ${saved} now`, { title: 'name changed', pal: 2 });
      haptic.good();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe}>
        <ScreenBar theme={theme} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader theme={theme} eyebrow="SWORBL" title="settings" />

          <Text style={[styles.sectionLabel, { color: theme.faint }]}>PLAYER</Text>
          <View style={[styles.row, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.ink }]}>name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              onSubmitEditing={commitName}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              returnKeyType="done"
              style={[styles.nameInput, { color: ACCENT }]}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.faint }]}>APPEARANCE</Text>
          <View style={[styles.row, { backgroundColor: theme.card }]}>
            <View style={styles.segments}>
              {MODES.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    setThemeMode(m.key);
                    haptic.soft();
                  }}
                  style={[
                    styles.segment,
                    mode === m.key && { backgroundColor: ACCENT },
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      { color: mode === m.key ? '#FFFFFF' : theme.sub },
                    ]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.faint }]}>FEEL</Text>
          <View style={[styles.row, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.ink }]}>haptics</Text>
            <Switch
              value={haptics}
              onValueChange={(v) => {
                setHaptics(v);
                setHapticsEnabled(v);
                if (v) haptic.good(); // a taste of what you just turned on
              }}
              trackColor={{ true: ACCENT }}
            />
          </View>

          {__DEV__ && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.faint }]}>DEVELOPER</Text>
              <Pressable
                onPress={() => router.push('/dev')}
                style={[styles.row, { backgroundColor: theme.card }]}>
                <Text style={[styles.rowLabel, { color: theme.ink }]}>dev tools</Text>
                <Text style={[styles.chev, { color: theme.faint }]}>›</Text>
              </Pressable>
            </>
          )}

          <Text style={[styles.about, { color: theme.faint }]}>
            sworbl {Constants.expoConfig?.version ?? ''} · made by soomer labs
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
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1.3,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  rowLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14.5,
  },
  nameInput: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14.5,
    textAlign: 'right',
    minWidth: 120,
    padding: 0,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
  chev: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
  },
  about: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
  },
});
