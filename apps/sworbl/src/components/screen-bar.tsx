// SCREEN BAR (handoff 5a/4a app bar): back · wordmark · optional action.
// The sibling of home's AppBar for pushed screens.
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Icon, type IconName } from '@/components/icon';
import { Brand } from '@/components/brand';
import { type Theme } from '@/game/theme';

interface Props {
  theme: Theme;
  action?: { icon: IconName; onPress: () => void };
}

export function ScreenBar({ theme, action }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.side}>
        <Icon name="back" size={22} color={theme.icon} />
      </Pressable>
      <Brand ink={theme.ink} />
      <View style={[styles.side, styles.right]}>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={10}>
            <Icon name={action.icon} size={22} color={theme.icon} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10, // iOS bars breathe below their icons (owner)
  },
  side: {
    width: 44,
  },
  right: {
    alignItems: 'flex-end',
  },
});
