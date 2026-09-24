import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Shamak as the Chartoon logo: the calm, outline-free version from the app icon
 * (assets/brand/logo-mark.svg). Drawn on a 240-unit square; the character spans 96×172 units
 * in its middle, and `glow` adds the soft green halo behind it. The splash screen shows the
 * same picture (assets/splash-icon.png), which is what lets the intro take over unseen.
 */
export function LogoMark({ size, glow = true }: { size: number; glow?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <RadialGradient id="lmGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#2BD47D" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#2BD47D" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="lmBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#52EDA0" />
          <Stop offset="1" stopColor="#17A862" />
        </LinearGradient>
      </Defs>
      {glow && <Circle cx={120} cy={128} r={108} fill="url(#lmGlow)" />}
      <Rect x={115} y={34} width={10} height={40} rx={5} fill="#2BD47D" />
      <Rect x={115} y={166} width={10} height={40} rx={5} fill="#2BD47D" />
      <Rect x={72} y={62} width={96} height={116} rx={30} fill="url(#lmBody)" />
      <Rect x={84} y={74} width={12} height={42} rx={6} fill="#FFFFFF" opacity={0.35} />
      <Circle cx={104} cy={112} r={12.5} fill="#FFFFFF" />
      <Circle cx={136} cy={112} r={12.5} fill="#FFFFFF" />
      <Circle cx={106.5} cy={114} r={6.5} fill="#0B1020" />
      <Circle cx={138.5} cy={114} r={6.5} fill="#0B1020" />
      <Circle cx={109} cy={111} r={2.2} fill="#FFFFFF" />
      <Circle cx={141} cy={111} r={2.2} fill="#FFFFFF" />
      <Path d="M107 139 Q120 151 133 139" stroke="#0B3D24" strokeWidth={5.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
