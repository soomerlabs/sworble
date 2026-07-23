// PLAY HALO — NATIVE (Skia): the eclipse belongs to the DOOR now. A slowly
// spinning spectrum disc sits directly behind the P·L·A·Y row — exact
// geometry (TracePlay owns it), so the light rings the tiles AND shows
// through the gaps between them (owner: "in between the blocks too").
// WEB SIBLING: play-halo.web.tsx (CSS conic gradient) — patch both.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, Paint, Blur, Circle, SweepGradient, vec } from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

const HUES = ['#A78BFA', '#5BC8F5', '#5FD6A8', '#F58FB8', '#F5B84A', '#F58A66', '#A78BFA'];
export const HALO_PAD = 40; // the glow's reach past the row on every side

export function PlayHalo({ rowW, rowH }: { rowW: number; rowH: number }) {
  const W = rowW + HALO_PAD * 2;
  const H = rowH + HALO_PAD * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = W / 2; // full disc — the gaps between tiles reveal its middle

  const spin = useSharedValue(0);
  const breath = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 36000, easing: Easing.linear }), -1, false);
    breath.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pose = useDerivedValue(() => [
    { rotate: spin.value * Math.PI * 2 },
    // squash the disc to the row's proportions — an ellipse hugging the door
    { scaleY: H / W },
  ]);
  const glow = useDerivedValue(() => 0.55 + breath.value * 0.3);

  return (
    <Canvas pointerEvents="none" style={[styles.halo, { width: W, height: H }]}>
      <Group layer={<Paint><Blur blur={16} /></Paint>} opacity={glow}>
        <Group transform={pose} origin={vec(cx, cy)}>
          <Circle cx={cx} cy={cy} r={R}>
            <SweepGradient c={vec(cx, cy)} colors={HUES} />
          </Circle>
        </Group>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    left: -HALO_PAD,
    top: -HALO_PAD,
  },
});
