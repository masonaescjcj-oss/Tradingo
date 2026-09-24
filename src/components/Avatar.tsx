import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { colors } from '@/theme';

const INK = '#0B1020';

/** Two eyes looking slightly right: white, pupil and a shine. */
function Eyes({ y, gap = 13, r = 6.5, cx = 50 }: { y: number; gap?: number; r?: number; cx?: number }) {
  return (
    <>
      {[cx - gap / 2 - r / 2, cx + gap / 2 + r / 2].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={y} r={r} fill="#FFFFFF" />
          <Circle cx={x + r * 0.2} cy={y + r * 0.15} r={r * 0.55} fill={INK} />
          <Circle cx={x + r * 0.42} cy={y - r * 0.2} r={r * 0.18} fill="#FFFFFF" />
        </G>
      ))}
    </>
  );
}

function Smile({ y, w = 7, color = '#0B3D24', open = false }: { y: number; w?: number; color?: string; open?: boolean }) {
  return open ? (
    <Path d={`M${50 - w} ${y} Q50 ${y + w * 1.6} ${50 + w} ${y} Z`} fill={color} />
  ) : (
    <Path d={`M${50 - w} ${y} Q50 ${y + w} ${50 + w} ${y}`} stroke={color} strokeWidth={3.4} strokeLinecap="round" fill="none" />
  );
}

/** Shamak's candle: wicks, body and the soft shine on its left. */
function Candle({ body, wick = body }: { body: string; wick?: string }) {
  return (
    <>
      <Rect x={47.5} y={12} width={5} height={16} rx={2.5} fill={wick} />
      <Rect x={47.5} y={72} width={5} height={16} rx={2.5} fill={wick} />
      <Rect x={31} y={24} width={38} height={52} rx={13} fill={body} />
      <Rect x={36} y={30} width={5} height={18} rx={2.5} fill="#FFFFFF" opacity={0.35} />
    </>
  );
}

/** Round animal head. */
function Head({ fill, r = 27, cy = 55 }: { fill: string; r?: number; cy?: number }) {
  return <Circle cx={50} cy={cy} r={r} fill={fill} />;
}

type Design = { label: string; bg: string; art: ReactNode };

/** The profile pictures learners can pick; the index in this list (from 1) is what the server keeps. */
const DESIGNS: Design[] = [
  {
    label: 'شمعک', // i18n-ignore: translated where shown
    bg: '#1B2543',
    art: (
      <>
        <Candle body="#2BD47D" />
        <Eyes y={45} />
        <Smile y={58} />
      </>
    ),
  },
  {
    label: 'شمعک نزولی', // i18n-ignore: translated where shown
    bg: '#3A1620',
    art: (
      <>
        <Candle body="#FF5A6E" />
        <Eyes y={47} />
        <Line x1={37} y1={36} x2={46} y2={40} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        <Line x1={63} y1={36} x2={54} y2={40} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        <Line x1={44} y1={62} x2={56} y2={62} stroke="#4A0D17" strokeWidth={3.4} strokeLinecap="round" />
      </>
    ),
  },
  {
    label: 'شاه شمعک', // i18n-ignore: translated where shown
    bg: '#3B2A00',
    art: (
      <>
        <Candle body="#FFC53D" wick="#E0A416" />
        <Polygon points="33,24 33,12 41,19 50,9 59,19 67,12 67,24" fill="#FFE08A" stroke="#C98F0A" strokeWidth={2} strokeLinejoin="round" />
        <Eyes y={45} />
        <Smile y={58} color="#5A3D00" />
      </>
    ),
  },
  {
    label: 'شمعک باحال', // i18n-ignore: translated where shown
    bg: '#0F2A1E',
    art: (
      <>
        <Candle body="#2BD47D" />
        <Rect x={33} y={39} width={15} height={11} rx={4} fill={INK} />
        <Rect x={52} y={39} width={15} height={11} rx={4} fill={INK} />
        <Line x1={47} y1={42} x2={53} y2={42} stroke={INK} strokeWidth={3} />
        <Rect x={36} y={41} width={5} height={2.5} rx={1.2} fill="#FFFFFF" opacity={0.6} />
        <Path d="M44 60 Q52 65 58 58" stroke="#0B3D24" strokeWidth={3.4} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    label: 'شمعک دی‌جی', // i18n-ignore: translated where shown
    bg: '#07233F',
    art: (
      <>
        <Candle body="#5AB0FF" />
        <Path d="M27 50 Q27 20 50 20 Q73 20 73 50" stroke="#1F2940" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Rect x={22} y={44} width={11} height={17} rx={5} fill="#1F2940" />
        <Rect x={67} y={44} width={11} height={17} rx={5} fill="#1F2940" />
        <Path d="M38 46 Q43 41 48 46 M52 46 Q57 41 62 46" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Smile y={58} color="#07233F" open />
      </>
    ),
  },
  {
    label: 'شمعک چشمک', // i18n-ignore: translated where shown
    bg: '#1E1240',
    art: (
      <>
        <Candle body="#A78BFA" />
        <Circle cx={40.5} cy={45} r={6.5} fill="#FFFFFF" />
        <Circle cx={42} cy={46} r={3.6} fill={INK} />
        <Path d="M53 46 Q59 41 65 46" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d="M42 58 Q50 67 58 58 Z" fill="#2A1660" />
        <Ellipse cx={52} cy={62.5} rx={3.5} ry={2.4} fill="#FF8A99" />
      </>
    ),
  },
  {
    label: 'شمعک درس‌خون', // i18n-ignore: translated where shown
    bg: '#062B28',
    art: (
      <>
        <Candle body="#4FD1C5" />
        <Eyes y={45} r={5.5} />
        <Circle cx={40} cy={45} r={9} stroke={INK} strokeWidth={2.6} fill="none" />
        <Circle cx={60} cy={45} r={9} stroke={INK} strokeWidth={2.6} fill="none" />
        <Line x1={49} y1={45} x2={51} y2={45} stroke={INK} strokeWidth={2.6} />
        <Smile y={60} w={6} color="#063B35" />
      </>
    ),
  },
  {
    label: 'شمعک جشن', // i18n-ignore: translated where shown
    bg: '#3A1C00',
    art: (
      <>
        <Candle body="#FF9433" wick="#E07A1B" />
        <Polygon points="50,4 62,27 38,27" fill="#FF5A6E" />
        <Path d="M44 16 L56 16 M41 22 L59 22" stroke="#FFE08A" strokeWidth={3} />
        <Circle cx={50} cy={5} r={3.5} fill="#FFE08A" />
        <Eyes y={45} />
        <Smile y={56} w={8} color="#5A2400" open />
      </>
    ),
  },
  {
    label: 'گاو صعودی', // i18n-ignore: translated where shown
    bg: '#0F2A1E',
    art: (
      <>
        <Path d="M27 42 Q12 36 16 20 Q22 32 34 34 Z" fill="#F5E6C8" />
        <Path d="M73 42 Q88 36 84 20 Q78 32 66 34 Z" fill="#F5E6C8" />
        <Head fill="#9A6234" />
        <Ellipse cx={50} cy={67} rx={17} ry={11} fill="#D9A066" />
        <Circle cx={44} cy={67} r={2.6} fill="#5A3417" />
        <Circle cx={56} cy={67} r={2.6} fill="#5A3417" />
        <Eyes y={49} gap={12} r={5.5} />
        <Path d="M31 39 L37 43 M69 39 L63 43" stroke="#5A3417" strokeWidth={3} strokeLinecap="round" />
      </>
    ),
  },
  {
    label: 'خرس', // i18n-ignore: translated where shown
    bg: '#2F1218',
    art: (
      <>
        <Circle cx={30} cy={33} r={10} fill="#8B5E3C" />
        <Circle cx={70} cy={33} r={10} fill="#8B5E3C" />
        <Circle cx={30} cy={33} r={5} fill="#C49A6C" />
        <Circle cx={70} cy={33} r={5} fill="#C49A6C" />
        <Head fill="#8B5E3C" />
        <Ellipse cx={50} cy={64} rx={13} ry={10} fill="#C49A6C" />
        <Ellipse cx={50} cy={60} rx={5} ry={3.6} fill={INK} />
        <Path d="M45 67 Q50 71 55 67" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        <Eyes y={49} gap={14} r={5} />
      </>
    ),
  },
  {
    label: 'گربه', // i18n-ignore: translated where shown
    bg: '#1F2940',
    art: (
      <>
        <Polygon points="25,44 29,18 46,32" fill="#9AA5B8" />
        <Polygon points="75,44 71,18 54,32" fill="#9AA5B8" />
        <Polygon points="29,38 31,25 40,32" fill="#FF8A99" />
        <Polygon points="71,38 69,25 60,32" fill="#FF8A99" />
        <Head fill="#9AA5B8" />
        <Eyes y={51} gap={13} r={5.5} />
        <Polygon points="47,61 53,61 50,65" fill="#FF8A99" />
        <Path d="M50 65 Q46 70 42 67 M50 65 Q54 70 58 67" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Path d="M22 58 L36 60 M22 65 L36 63 M78 58 L64 60 M78 65 L64 63" stroke="#E6EAF2" strokeWidth={1.8} strokeLinecap="round" />
      </>
    ),
  },
  {
    label: 'روباه', // i18n-ignore: translated where shown
    bg: '#1B2543',
    art: (
      <>
        <Polygon points="24,46 26,14 46,32" fill="#FF8A3D" />
        <Polygon points="76,46 74,14 54,32" fill="#FF8A3D" />
        <Polygon points="29,38 30,23 40,31" fill={INK} />
        <Polygon points="71,38 70,23 60,31" fill={INK} />
        <Head fill="#FF8A3D" />
        <Path d="M23 58 Q35 60 50 80 Q65 60 77 58 Q66 76 50 82 Q34 76 23 58 Z" fill="#FFFFFF" />
        <Eyes y={50} gap={14} r={5} />
        <Ellipse cx={50} cy={70} rx={4.5} ry={3.4} fill={INK} />
      </>
    ),
  },
  {
    label: 'پاندا', // i18n-ignore: translated where shown
    bg: '#123A2A',
    art: (
      <>
        <Circle cx={29} cy={32} r={10} fill={INK} />
        <Circle cx={71} cy={32} r={10} fill={INK} />
        <Head fill="#F1F4F9" />
        <Ellipse cx={39} cy={52} rx={8} ry={10} fill={INK} transform="rotate(25 39 52)" />
        <Ellipse cx={61} cy={52} rx={8} ry={10} fill={INK} transform="rotate(-25 61 52)" />
        <Circle cx={40} cy={51} r={3.2} fill="#FFFFFF" />
        <Circle cx={60} cy={51} r={3.2} fill="#FFFFFF" />
        <Ellipse cx={50} cy={64} rx={4.5} ry={3.2} fill={INK} />
        <Path d="M45 69 Q50 73 55 69" stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    label: 'جغد دانا', // i18n-ignore: translated where shown
    bg: '#2A1E4A',
    art: (
      <>
        <Polygon points="26,34 30,14 42,28" fill="#8D6E63" />
        <Polygon points="74,34 70,14 58,28" fill="#8D6E63" />
        <Head fill="#8D6E63" r={29} />
        <Circle cx={39} cy={50} r={11} fill="#F5E6C8" />
        <Circle cx={61} cy={50} r={11} fill="#F5E6C8" />
        <Circle cx={40} cy={51} r={5.5} fill={INK} />
        <Circle cx={62} cy={51} r={5.5} fill={INK} />
        <Circle cx={42} cy={49} r={1.8} fill="#FFFFFF" />
        <Circle cx={64} cy={49} r={1.8} fill="#FFFFFF" />
        <Polygon points="45,61 55,61 50,70" fill="#FFC53D" />
        <Path d="M36 74 Q42 70 48 74 M52 74 Q58 70 64 74" stroke="#6D5249" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    label: 'پنگوئن', // i18n-ignore: translated where shown
    bg: '#0B3A5B',
    art: (
      <>
        <Head fill="#1F2940" r={29} />
        <Path d="M50 40 Q34 34 30 52 Q30 76 50 80 Q70 76 70 52 Q66 34 50 40 Z" fill="#F1F4F9" />
        <Eyes y={52} gap={12} r={5} />
        <Path d="M42 62 L58 62 L50 70 Z" fill="#FF9433" strokeLinejoin="round" />
        <Circle cx={36} cy={64} r={3.5} fill="#FF8A99" opacity={0.7} />
        <Circle cx={64} cy={64} r={3.5} fill="#FF8A99" opacity={0.7} />
      </>
    ),
  },
  {
    label: 'شیر', // i18n-ignore: translated where shown
    bg: '#3B2A00',
    art: (
      <>
        <Circle cx={50} cy={54} r={36} fill="#C2711F" />
        <Circle cx={31} cy={34} r={7} fill="#F5B84A" />
        <Circle cx={69} cy={34} r={7} fill="#F5B84A" />
        <Head fill="#F5B84A" r={24} cy={56} />
        <Eyes y={52} gap={12} r={5} />
        <Polygon points="45,62 55,62 50,67" fill="#5A3417" />
        <Path d="M50 67 Q46 72 42 69 M50 67 Q54 72 58 69" stroke="#5A3417" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    label: 'قورباغه', // i18n-ignore: translated where shown
    bg: '#0F2A1E',
    art: (
      <>
        <Circle cx={35} cy={36} r={11} fill="#5BE39A" />
        <Circle cx={65} cy={36} r={11} fill="#5BE39A" />
        <Ellipse cx={50} cy={60} rx={32} ry={24} fill="#5BE39A" />
        <Circle cx={35} cy={36} r={7} fill="#FFFFFF" />
        <Circle cx={65} cy={36} r={7} fill="#FFFFFF" />
        <Circle cx={36} cy={37} r={4} fill={INK} />
        <Circle cx={66} cy={37} r={4} fill={INK} />
        <Path d="M32 62 Q50 78 68 62" stroke="#0B3D24" strokeWidth={3.4} strokeLinecap="round" fill="none" />
        <Circle cx={28} cy={60} r={4} fill="#FF8A99" opacity={0.7} />
        <Circle cx={72} cy={60} r={4} fill="#FF8A99" opacity={0.7} />
      </>
    ),
  },
  {
    label: 'ربات', // i18n-ignore: translated where shown
    bg: '#07233F',
    art: (
      <>
        <Line x1={50} y1={14} x2={50} y2={28} stroke="#AEB8CC" strokeWidth={3.5} />
        <Circle cx={50} cy={13} r={5} fill="#FF5A6E" />
        <Rect x={24} y={28} width={52} height={46} rx={12} fill="#AEB8CC" />
        <Rect x={18} y={44} width={7} height={14} rx={3} fill="#7D89A6" />
        <Rect x={75} y={44} width={7} height={14} rx={3} fill="#7D89A6" />
        <Rect x={33} y={40} width={12} height={10} rx={3} fill="#5AB0FF" />
        <Rect x={55} y={40} width={12} height={10} rx={3} fill="#5AB0FF" />
        <Rect x={36} y={58} width={28} height={8} rx={3} fill="#1F2940" />
        <Path d="M42 58 V66 M50 58 V66 M58 58 V66" stroke="#AEB8CC" strokeWidth={2} />
      </>
    ),
  },
  {
    label: 'موشک ماه', // i18n-ignore: translated where shown
    bg: '#1E1240',
    art: (
      <>
        <Circle cx={74} cy={24} r={9} fill="#FFE08A" />
        <Circle cx={22} cy={30} r={1.6} fill="#FFFFFF" />
        <Circle cx={30} cy={16} r={1.2} fill="#FFFFFF" />
        <Circle cx={80} cy={50} r={1.4} fill="#FFFFFF" />
        <G transform="rotate(40 50 52)">
          <Path d="M50 16 Q64 30 62 62 L38 62 Q36 30 50 16 Z" fill="#F1F4F9" />
          <Path d="M50 16 Q58 22 61 32 L39 32 Q42 22 50 16 Z" fill="#FF5A6E" />
          <Circle cx={50} cy={44} r={6.5} fill="#5AB0FF" stroke="#1F2940" strokeWidth={2.4} />
          <Path d="M38 52 L28 66 L38 62 Z M62 52 L72 66 L62 62 Z" fill="#FF5A6E" />
          <Path d="M42 62 Q50 84 58 62 Z" fill="#FF9433" />
          <Path d="M46 62 Q50 74 54 62 Z" fill="#FFE08A" />
        </G>
      </>
    ),
  },
  {
    label: 'الماس', // i18n-ignore: translated where shown
    bg: '#0B3A5B',
    art: (
      <>
        <Polygon points="30,34 40,22 60,22 70,34 50,80" fill="#8CC8FF" />
        <Polygon points="30,34 70,34 50,80" fill="#5AB0FF" />
        <Polygon points="40,22 50,34 60,22" fill="#C9E5FF" />
        <Polygon points="30,34 40,22 50,34" fill="#A9D6FF" />
        <Polygon points="50,34 60,22 70,34" fill="#A9D6FF" />
        <Eyes y={44} gap={10} r={4.5} />
        <Smile y={53} w={5} color="#07233F" />
      </>
    ),
  },
];

/** Picture ids learners can choose, with their names; 0 means the first letter of the name. */
export const AVATARS = DESIGNS.map((d, i) => ({ id: i + 1, label: d.label }));

const LETTER_COLORS = [colors.sky, colors.bull, colors.gold, '#FF8A7A', '#A78BFA', '#4FD1C5', colors.flame];

/** A profile picture: one of the drawn designs, or the first letter of the name on a colour of its own. */
export function Avatar({ id, name, size = 40 }: { id?: number | null; name: string; size?: number }) {
  const design = id ? DESIGNS[id - 1] : undefined;
  if (!design) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: LETTER_COLORS[h % LETTER_COLORS.length] }}
        accessibilityLabel={t('عکس پروفایل {name}', { name })}
      >
        <Txt w={900} size={size * 0.45} color={colors.bg}>
          {name.trim().charAt(0) || t('؟')}
        </Txt>
      </View>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={t('عکس پروفایل {name}: {picture}', { name, picture: t(design.label) })}>
      <Circle cx={50} cy={50} r={50} fill={design.bg} />
      {design.art}
    </Svg>
  );
}
