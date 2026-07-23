// THE SWORBL ICON SET — Lucide, one wrapper (owner: "i wanna use better
// icons"). Rounded caps + a chunky 2.4 stroke reads candy next to Fredoka,
// where default SF Symbols read generic-thin — and iOS/Android/web now
// share ONE set (the Android text-glyph fallbacks are gone). Add names
// here as screens need them; nothing imports lucide directly.
import React from 'react';
import {
  User, Settings, ArrowLeft, Share, Info, TrendingUp, Pencil, X, Pause, Play,
  type LucideIcon,
} from 'lucide-react-native';

const ICONS = {
  person: User,
  settings: Settings,
  back: ArrowLeft,
  share: Share,
  info: Info,
  chart: TrendingUp,
  pencil: Pencil,
  close: X,
  pause: Pause,
  play: Play,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: {
  name: IconName;
  size?: number;
  color: string;
}) {
  const Glyph: LucideIcon = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={2.4} absoluteStrokeWidth={false} />;
}
