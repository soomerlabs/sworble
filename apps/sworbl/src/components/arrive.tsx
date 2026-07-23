// DATA-ARRIVAL GRACE (owner: "data loads in clean with animations — NO
// JENK"): wraps a section whose skeleton gets replaced when remote data
// lands. While `ready` is false the children (the skeleton) render plainly;
// the flip to true replays a soft fade + rise on the new content. Shared
// values only — never a layout animation on persistent UI (house rule).
import React, { useEffect, useRef } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';

export function Arrive({ ready, style, children }: {
  ready: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const s = useSharedValue(1); // visible by default (skeleton OR cached data)
  const was = useRef(ready);
  useEffect(() => {
    if (!was.current && ready) {
      was.current = true;
      s.value = 0;
      s.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const pose = useAnimatedStyle(() => ({
    opacity: s.value,
    transform: [{ translateY: (1 - s.value) * 10 }],
  }));
  return <Animated.View style={[style, pose]}>{children}</Animated.View>;
}
