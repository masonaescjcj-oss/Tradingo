import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { colors } from '@/theme';

import type { Tone } from './text';

export const TONES: Record<Tone, { color: string; text: string; soft: string; ink: string }> = {
  bull: { color: colors.bull, text: colors.bullText, soft: colors.bullSoft, ink: colors.bullInk },
  bear: { color: colors.bear, text: colors.bearText, soft: colors.bearSoft, ink: colors.bearInk },
  sky: { color: colors.sky, text: colors.skyText, soft: colors.skySoft, ink: colors.skyInk },
  gold: { color: colors.gold, text: colors.gold, soft: colors.goldSoft, ink: colors.goldInk },
};

export const VIOLET = '#A78BFA';
export const VIOLET_INK = '#1E1240';

export const pnlColor = (v: number) => (v >= 0 ? colors.bull : colors.bearText);

type Option<T> = { value: T; label: string; mono?: boolean; hint?: string };

/** A row of mutually exclusive options that share the width. */
export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
  small,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  small?: boolean;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.hint ?? o.label}
            style={[styles.segmentItem, small && { height: 30 }, on && styles.segmentOn]}
          >
            <Txt mono={o.mono} w={800} size={small ? 12 : 13} color={on ? colors.text : colors.text3}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small on/off switch; "on" sits at the end (left) edge in right-to-left layouts. */
export function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.switch, on && styles.switchOn]}>
      <View style={[styles.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
    </View>
  );
}

export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  disabled,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.stepper, disabled && { opacity: 0.45 }]}>
      <Pressable onPress={onMinus} disabled={disabled} accessibilityRole="button" accessibilityLabel={`کم کردن ${label}`} style={styles.stepBtn}>
        <Icon name="minus" size={16} color={colors.text} strokeWidth={3} />
      </Pressable>
      <Txt w={900} size={13.5} center style={{ minWidth: 78 }}>
        {value}
      </Txt>
      <Pressable onPress={onPlus} disabled={disabled} accessibilityRole="button" accessibilityLabel={`زیاد کردن ${label}`} style={styles.stepBtn}>
        <Icon name="plus" size={16} color={colors.text} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

/** Pill-shaped toggle button, e.g. an indicator on the chart. */
export function Chip({
  label,
  on,
  onPress,
  color = colors.sky,
  mono,
  accessibilityLabel,
  children,
}: {
  label?: string;
  on?: boolean;
  onPress: () => void;
  color?: string;
  mono?: boolean;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={on != null ? { selected: on } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, on && { borderColor: color, backgroundColor: 'rgba(255,255,255,0.04)' }]}
    >
      {children}
      {label ? (
        <Txt mono={mono} w={800} size={12} color={on ? colors.text : colors.text2}>
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/** A small label over a value, used in stat grids and position cards. */
export function Figure({ label, value, color = colors.text, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
      <Txt w={700} size={11} color={colors.text2} numberOfLines={1}>
        {label}
      </Txt>
      <Txt mono={mono} w={800} size={12.5} color={color} numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Txt w={900} size={16}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function Hint({ children, tone }: { children: string; tone?: Tone }) {
  return (
    <View style={[styles.hint, tone && { borderColor: TONES[tone].color, backgroundColor: TONES[tone].soft }]}>
      <Icon name="bulb" size={15} color={tone ? TONES[tone].text : colors.gold} strokeWidth={2.4} />
      <Txt w={700} size={12} lh={1.7} color={tone ? TONES[tone].text : colors.text2} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

export function IconButton({ icon, label, onPress, size = 40 }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={[styles.iconBtn, { width: size, height: size }]}>
      <Icon name={icon} size={size * 0.48} color={colors.text2} strokeWidth={2.4} />
    </Pressable>
  );
}

export const simStyles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    paddingBottom: 40,
  },
});

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  segmentItem: {
    flex: 1,
    height: 34,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: colors.raised,
  },
  switch: {
    width: 44,
    height: 26,
    padding: 3,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  switchOn: {
    backgroundColor: colors.bull,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  card: {
    padding: 14,
    gap: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surfaceDeep,
  },
  iconBtn: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
