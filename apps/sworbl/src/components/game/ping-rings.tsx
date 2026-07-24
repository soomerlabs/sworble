// The SONAR PING — two expanding rings from a tile's center. Detection's
// feeling without deduction's homework (the minesweeper aesthetic, distilled).
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing,
} from 'react-native-reanimated';

interface Props {
  x: number; // tile center, board-local px
  y: number;
  size: number; // tile size — rings scale off it
  color: string;
  onFinish: () => void;
}

function Ring({ x, y, size, color, delay }: Omit<Props, 'onFinish'> & { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) }));
  }, []);
  const d = size * 0.9;
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + t.value * 2.1 }],
    opacity: t.value === 0 ? 0 : 0.85 * (1 - t.value),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        anim,
        styles.ring,
        {
          left: x - d / 2,
          top: y - d / 2,
          width: d,
          height: d,
          borderRadius: d / 2, borderCurve: 'continuous',
          borderColor: color,
        },
      ]}
    />
  );
}

export function PingRings({ x, y, size, color, onFinish }: Props) {
  useEffect(() => {
    const h = setTimeout(onFinish, 1450);
    return () => clearTimeout(h);
  }, []);
  return (
    <>
      <Ring x={x} y={y} size={size} color={color} delay={0} />
      <Ring x={x} y={y} size={size} color={color} delay={280} />
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 3,
  },
});
