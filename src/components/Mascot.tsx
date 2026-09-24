import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { MOODS, type MascotMood } from '@/lib/mascotArt';

export type { MascotMood } from '@/lib/mascotArt';

/** Shamak, the candlestick mascot. Height is 170/140 of the width. */
export function Mascot({ mood = 'happy', size = 140 }: { mood?: MascotMood; size?: number }) {
  const m = MOODS[mood];
  return (
    <Svg width={size} height={Math.round((size * 170) / 140)} viewBox="0 0 140 170">
      <Ellipse cx={70} cy={163} rx={36} ry={6} fill="#000" opacity={0.3} />
      {m.sparkle && (
        <G fill="#FFC53D">
          <Path d="M18 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
          <Path d="M122 18 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" />
          <Path d="M130 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <Path d="M9 104 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
        </G>
      )}
      <Path d="M70 6 V34" stroke={m.dark} strokeWidth={7} strokeLinecap="round" />
      <Path d="M70 128 V156" stroke={m.dark} strokeWidth={7} strokeLinecap="round" />
      <Rect x={30} y={30} width={80} height={100} rx={24} fill={m.body} stroke={m.dark} strokeWidth={4} />
      <Rect x={40} y={42} width={11} height={40} rx={5.5} fill="#fff" opacity={0.35} />
      <Path d={m.arms} stroke={m.dark} strokeWidth={8} strokeLinecap="round" fill="none" />
      {m.brows && <Path d={m.brows} stroke={m.dark} strokeWidth={4} strokeLinecap="round" fill="none" />}
      <Circle cx={55} cy={72} r={12} fill="#fff" stroke={m.dark} strokeWidth={3} />
      <Circle cx={85} cy={72} r={12} fill="#fff" stroke={m.dark} strokeWidth={3} />
      <Circle cx={m.pupilX[0]} cy={m.pupilY} r={6} fill="#0E1320" />
      <Circle cx={m.pupilX[1]} cy={m.pupilY} r={6} fill="#0E1320" />
      <Circle cx={m.pupilX[0] + 2} cy={m.pupilY - 2} r={2} fill="#fff" />
      <Circle cx={m.pupilX[1] + 2} cy={m.pupilY - 2} r={2} fill="#fff" />
      {m.cheek > 0 && (
        <>
          <Ellipse cx={44} cy={93} rx={7} ry={4} fill="#FF7A93" opacity={m.cheek} />
          <Ellipse cx={96} cy={93} rx={7} ry={4} fill="#FF7A93" opacity={m.cheek} />
        </>
      )}
      {m.mouthLine && <Path d={m.mouthLine} stroke={m.dark} strokeWidth={4} strokeLinecap="round" fill="none" />}
      {m.mouthFill && <Path d={m.mouthFill} fill={m.dark} />}
      {m.tear && <Path d="M44 86 q-5 9 0 12 q5 -3 0 -12z" fill="#7CC7FF" opacity={0.9} />}
    </Svg>
  );
}
