// THE CROWN — the fossil's svg (web score strip + podium), shared. Never
// the ♛ text glyph (owner: "awful crown").
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  width?: number;
  fill?: string;
  edge?: string;
  style?: object;
}

export function Crown({ width = 14, fill = '#8971FF', edge = '#6A4FE0', style }: Props) {
  const height = Math.round((width * 24) / 34);
  return (
    <Svg width={width} height={height} viewBox="0 0 34 24" style={style}>
      <Path
        d="M3 21 L2 7 L10 13 L17 3 L24 13 L32 7 L31 21 Z"
        fill={fill}
        stroke={edge}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={2} cy={6.5} r={2.4} fill={fill} />
      <Circle cx={32} cy={6.5} r={2.4} fill={fill} />
      <Circle cx={17} cy={2.6} r={2.4} fill={fill} />
    </Svg>
  );
}
