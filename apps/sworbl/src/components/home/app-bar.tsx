// HOME APP BAR (handoff 20a/6b): person · wordmark · settings, 56px row.
// Brand sits at the same offset as the sheet's — the "uniting logos" dock
// animation is positional, keep them aligned when touching either.
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Brand } from '@/components/brand';
import { type Theme } from '@/game/theme';

function BarIcon({ name, fallback, color }: { name: string; fallback: string; color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as never} size={23} tintColor={color} />;
  }
  return <Text style={{ fontSize: 20, color }}>{fallback}</Text>;
}

interface Props {
  theme: Theme;
  onPerson?: () => void;
  onSettings?: () => void;
}

export function AppBar({ theme, onPerson, onSettings }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onPerson} hitSlop={8} style={styles.side}>
        <BarIcon name="person.fill" fallback="◍" color={theme.icon} />
      </Pressable>
      <Brand ink={theme.ink} />
      <Pressable onPress={onSettings} hitSlop={8} style={[styles.side, styles.right]}>
        <BarIcon name="gearshape.fill" fallback="⚙" color={theme.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12, // sheet parity — logos unite at dock
  },
  side: {
    width: 44,
  },
  right: {
    alignItems: 'flex-end',
  },
});
