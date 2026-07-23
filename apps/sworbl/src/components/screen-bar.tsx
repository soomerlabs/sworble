// SCREEN BAR (handoff 5a/4a app bar): back · wordmark · optional action.
// The sibling of home's AppBar for pushed screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Brand } from '@/components/brand';
import { type Theme } from '@/game/theme';

function BarIcon({ name, fallback, color }: { name: string; fallback: string; color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as never} size={22} tintColor={color} />;
  }
  return <Text style={{ fontSize: 19, color }}>{fallback}</Text>;
}

interface Props {
  theme: Theme;
  action?: { symbol: string; fallback: string; onPress: () => void };
}

export function ScreenBar({ theme, action }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.side}>
        <BarIcon name="arrow.backward" fallback="‹" color={theme.icon} />
      </Pressable>
      <Brand ink={theme.ink} />
      <View style={[styles.side, styles.right]}>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={10}>
            <BarIcon name={action.symbol} fallback={action.fallback} color={theme.icon} />
          </Pressable>
        )}
      </View>
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
    paddingTop: 12,
  },
  side: {
    width: 44,
  },
  right: {
    alignItems: 'flex-end',
  },
});
