import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { ChestTier } from '@/lib/chest';

/** Colours of each chest tier: the screen behind it, the wooden body and the metal trim. */
export const CHEST_LOOK: Record<ChestTier, { label: string; bg: string; body: string; bodyDark: string; trim: string; trimDark: string; trimLight: string }> = {
  common: { label: 'معمولی', bg: '#1F8A5B', body: '#2BB673', bodyDark: '#1C8A55', trim: '#FFC53D', trimDark: '#E0A21C', trimLight: '#FFE08A' }, // i18n-ignore: translated where shown
  rare: { label: 'کمیاب', bg: '#3AA7F2', body: '#1F8FE0', bodyDark: '#1674C2', trim: '#FFC53D', trimDark: '#E0A21C', trimLight: '#FFE08A' }, // i18n-ignore: translated where shown
  epic: { label: 'حماسی', bg: '#8A5CF6', body: '#6D3FE0', bodyDark: '#5530B8', trim: '#FFC53D', trimDark: '#E0A21C', trimLight: '#FFE08A' }, // i18n-ignore: translated where shown
  legendary: { label: 'افسانه‌ای', bg: '#F29B0C', body: '#E4572E', bodyDark: '#B8401E', trim: '#FFE27A', trimDark: '#F2B705', trimLight: '#FFF4C2' }, // i18n-ignore: translated where shown
};

const LOCKED = { body: '#39445E', bodyDark: '#2B3449', trim: '#56627D', trimDark: '#46516A', trimLight: '#6B7894' };

/**
 * A treasure chest in the app's flat style. `open` lifts the lid over a glowing inside;
 * `locked` draws it in greys.
 */
export function Chest({ tier = 'rare', size = 120, open = false, locked = false }: { tier?: ChestTier; size?: number; open?: boolean; locked?: boolean }) {
  const c = locked ? LOCKED : CHEST_LOOK[tier];
  // Room above the chest for the lifted lid.
  const height = (size * 126) / 120;
  return (
    <Svg width={size} height={height} viewBox="0 -16 120 126">
      <Ellipse cx={60} cy={101} rx={46} ry={6} fill="#000" opacity={0.18} />

      {open ? (
        <G>
          {/* Light pouring out of the open chest. */}
          <Path d="M36 50 L12 -2 L50 30 Z M84 50 L108 -2 L70 30 Z M52 46 L60 -8 L68 46 Z" fill="#FFF6C9" opacity={0.55} />
          <Rect x={16} y={44} width={88} height={12} rx={5} fill="#3A1F00" />
          <Ellipse cx={60} cy={50} rx={38} ry={5} fill="#FFE27A" opacity={0.9} />
        </G>
      ) : null}

      {/* Body. */}
      <Rect x={14} y={52} width={92} height={44} rx={7} fill={c.body} />
      <Rect x={14} y={67} width={92} height={4} fill={c.bodyDark} />
      <Rect x={14} y={81} width={92} height={4} fill={c.bodyDark} />
      <Rect x={20} y={50} width={15} height={47} rx={3} fill={c.trim} />
      <Rect x={85} y={50} width={15} height={47} rx={3} fill={c.trim} />
      <Rect x={20} y={88} width={15} height={9} rx={3} fill={c.trimDark} />
      <Rect x={85} y={88} width={15} height={9} rx={3} fill={c.trimDark} />

      {/* Lid: closed over the body, or tipped up and back. */}
      <G transform={open ? 'translate(0 -26) rotate(-8 60 40)' : undefined}>
        <Path d="M12 52 V34 Q12 20 26 20 H94 Q108 20 108 34 V52 Z" fill={c.body} />
        <Path d="M12 44 H108 V52 H12 Z" fill={c.bodyDark} />
        <Rect x={20} y={18} width={15} height={35} rx={4} fill={c.trim} />
        <Rect x={85} y={18} width={15} height={35} rx={4} fill={c.trim} />
        <Rect x={22} y={21} width={11} height={10} rx={3} fill={c.trimLight} />
        <Rect x={87} y={21} width={11} height={10} rx={3} fill={c.trimLight} />
        <Rect x={10} y={48} width={100} height={8} rx={3} fill={c.trim} />
      </G>

      {/* Lock plate. */}
      {!open ? (
        <G>
          <Path d="M47 50 Q47 44 53 44 Q60 44 60 49 Q60 44 67 44 Q73 44 73 50 V58 Q73 68 60 70 Q47 68 47 58 Z" fill={c.trim} />
          <Path d="M50 51 Q50 47 54 47 Q60 47 60 51 Q60 47 66 47 Q70 47 70 51 V58 Q70 65 60 67 Q50 65 50 58 Z" fill={c.trimDark} />
          {locked ? (
            <G>
              <Circle cx={60} cy={55} r={3.4} fill={c.body} />
              <Rect x={58.4} y={56} width={3.2} height={6} rx={1.2} fill={c.body} />
            </G>
          ) : (
            <Path d="M54 53 Q60 50 66 53 Q64 62 60 63 Q56 62 54 53 Z" fill="#FFFFFF" />
          )}
        </G>
      ) : null}
    </Svg>
  );
}
