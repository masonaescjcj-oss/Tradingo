import { Platform, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Weight = 400 | 500 | 700 | 800 | 900;

const FAMILY: Record<Weight, string> = {
  400: fonts.regular,
  500: fonts.medium,
  700: fonts.bold,
  800: fonts.extra,
  900: fonts.black,
};

export type TxtProps = TextProps & {
  w?: Weight;
  size?: number;
  color?: string;
  /** Lalezar display face for big titles. */
  display?: boolean;
  /** JetBrains Mono for prices and tickers (always left-to-right). */
  mono?: boolean;
  center?: boolean;
  /** Line height as a multiple of the font size. */
  lh?: number;
};

export function Txt({ w = 500, size = 15, color = colors.text, display, mono, center, lh, style, ...rest }: TxtProps) {
  const fontFamily = display ? fonts.display : mono ? (w >= 800 ? fonts.monoHeavy : fonts.mono) : FAMILY[w];
  // react-native-web sets dir="auto" on text, which left-aligns lines that start with Latin
  // characters. Persian copy is always right-to-left; prices are always left-to-right.
  const dirProps = Platform.OS === 'web' ? ({ dir: mono ? 'ltr' : 'rtl' } as object) : null;
  return (
    <Text
      {...dirProps}
      {...rest}
      style={[
        {
          fontFamily,
          fontSize: size,
          color,
          lineHeight: lh ? Math.round(size * lh) : undefined,
          textAlign: center ? 'center' : undefined,
          writingDirection: mono ? 'ltr' : 'rtl',
        },
        style,
      ]}
    />
  );
}
