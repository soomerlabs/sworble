// The haptic language (owner-designed on the spike): the tick CRESCENDOS as
// the chain grows — soft on the first letters, heavy as a long word lands.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import engine from '@sworbl/engine';

const HAPTICS_KEY = 'sworbl_rn_haptics';
let enabled: boolean | null = null; // lazy — storage backing installs at boot

export function hapticsEnabled(): boolean {
  if (enabled === null) enabled = engine.store.getJSON(HAPTICS_KEY, true) !== false;
  return enabled;
}

export function setHapticsEnabled(v: boolean): void {
  enabled = v;
  engine.store.setJSON(HAPTICS_KEY, v);
}

const native = Platform.OS !== 'web';
const on = () => native && hapticsEnabled();

const RAMP = [
  Haptics.ImpactFeedbackStyle.Soft, // 1
  Haptics.ImpactFeedbackStyle.Soft, // 2
  Haptics.ImpactFeedbackStyle.Light, // 3
  Haptics.ImpactFeedbackStyle.Light, // 4
  Haptics.ImpactFeedbackStyle.Medium, // 5
  Haptics.ImpactFeedbackStyle.Medium, // 6
  Haptics.ImpactFeedbackStyle.Heavy, // 7+
];

export const haptic = {
  tick(chainLen = 1) {
    if (on()) Haptics.impactAsync(RAMP[Math.min(chainLen, RAMP.length) - 1]).catch(() => {});
  },
  soft() {
    if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  },
  good() {
    if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  // the LAUNCH success (owner: the canned Success double-pulse beats land
  // too close — ~70ms apart and untunable). A hand-rolled pair: medium
  // strike, a real breath, then the heavy landing.
  launch() {
    if (!on()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => {
      if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 170);
  },
  bad() {
    if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
