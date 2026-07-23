// THE SHEET'S WEATHER — the aurora crest that dresses the pull (owner:
// "ride the storm up"; the flat color wash was deleted — it read as a
// SECOND system where the aurora should be ONE THING stretching). Pure
// display: home owns sheetY/sGlow/sBoot and this component derives every
// frame from them — all interpolation, no timers, no blur on the moving
// sheet.
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle, interpolate, Extrapolation, type SharedValue,
} from 'react-native-reanimated';

import Storm from '@/components/game/storm';
import { bootWindow } from './home-motion';

interface Props {
  sheetY: SharedValue<number>;
  sGlow: SharedValue<number>; // aurora intensity: muted → FULL GLOW on arm
  sBoot: SharedValue<number>; // the boot master clock (band blooms late)
  sReveal: SharedValue<number>; // TIME-based exit: 0 until the launch commits,
  // then home runs it to 1 after the dock — a flick can't flash the color away
  closedY: number;
  width: number;
  peekH: number;
}

// OUTSIDE the clip (the sheet's outer, unclipped layer): the aurora crest.
// Living out here lets it stand TALLER than the band (owner: "taller, more
// northern-light-ish") — it rises above the sheet's top edge over home.
export function StormCrest({ sheetY, sGlow, sBoot, sReveal, closedY, width, peekH }: Props) {
  const stormH = Math.round(peekH * 2.4); // v3's own mount (3a08e4a): tall crest, head over home
  // the stretch target: at full open the SAME canvas must cover the whole
  // sheet face — home's aurora and the board's takeover are ONE THING
  // elongating (owner: the flat wash read as a second, mismatched system)
  // (full-sheet stretch retired — it taffy-pulled the veils; the frost
  // dissolve + opacity handoff carry the transition now)
  const stormRideStyle = useAnimatedStyle(() => {
    const travel = interpolate(sheetY.value, [0, closedY], [1, 0], Extrapolation.CLAMP);
    const calm = 0.68 + sGlow.value * 0.32; // parked: PRESENT → armed: ignited (0.45 read washed out, owner)
    const burn = interpolate(travel, [0, 0.3], [calm, 1], Extrapolation.CLAMP);
    // CLEAN HANDOFF (owner): the crest melts mostly out by the dock — a
    // gentle swell, opacity easing to a quarter across the last stretch of
    // travel, sReveal finishing the job after the dock (flicks stay safe)
    const melt = interpolate(travel, [0.55, 0.92], [1, 0.25], Extrapolation.CLAMP);
    return {
      opacity: bootWindow(sBoot.value, 0.45, 0.55) * burn * melt * (1 - sReveal.value),
      transform: [
        { scaleY: 1 + sGlow.value * 0.06 + travel * 0.3 },
        { scaleX: 1 + sGlow.value * 0.04 + travel * 0.1 },
      ],
    };
  }, [closedY]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stormRide,
        // the crest's head rises ~a band-height ABOVE the sheet's top edge;
        // its tail (the bottom melt) hangs past the screen at park
        { height: stormH, top: -Math.round(peekH * 0.9) },
        stormRideStyle,
      ]}>
      <Storm width={width} height={stormH} zoom={2.2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // the crest rides the sheet's TOP edge; scaling from that edge lets the
  // swell spread DOWN over the emerging board during the pull
  stormRide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    transformOrigin: '50% 0%',
  },
});
