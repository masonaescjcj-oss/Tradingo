import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import type { OrderStep } from '@/content';
import { colors } from '@/theme';
import { fa } from '@/utils/format';
import { shuffle } from '@/utils/random';

import { QuestionTag, QuestionTitle } from './common';
import type { QuestionProps } from './types';

/** Build the right sequence by tapping items from the bank; tap a placed item to send it back. */
export function OrderQuestion({ step, revealed, onAnswer }: QuestionProps<OrderStep>) {
  const bank = useMemo(() => {
    const idx = step.items.map((_, i) => i);
    let order = shuffle(idx);
    // Never start with the answer already in place.
    for (let tries = 0; tries < 5 && order.every((v, i) => v === i); tries++) order = shuffle(idx);
    return order;
  }, [step]);
  const [placed, setPlaced] = useState<number[]>([]);

  const update = (next: number[]) => {
    setPlaced(next);
    onAnswer(next.length === step.items.length ? next.every((item, i) => item === i) : null);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="مرتب کن" icon="list" />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>

      <View style={styles.answer} accessibilityLabel="ترتیب انتخاب‌شده">
        {step.items.map((_, slot) => {
          const item = placed[slot];
          if (item == null) {
            return (
              <View key={slot} style={styles.emptyRow}>
                <Txt mono w={800} size={14} color={colors.faint}>
                  {fa(slot + 1)}
                </Txt>
              </View>
            );
          }
          const right = item === slot;
          const tone = !revealed
            ? { border: colors.sky, bg: colors.skySoft, text: colors.skyText }
            : right
              ? { border: colors.bull, bg: colors.bullSoft, text: colors.bullText }
              : { border: colors.bear, bg: colors.bearSoft, text: colors.bearText };
          return (
            <Pressable
              key={slot}
              disabled={revealed}
              onPress={() => update(placed.filter((_, k) => k !== slot))}
              accessibilityRole="button"
              accessibilityLabel={`${fa(slot + 1)}: ${step.items[item]}، برای برداشتن بزن`}
              style={[styles.row, { borderColor: tone.border, backgroundColor: tone.bg }]}
            >
              <View style={[styles.num, { backgroundColor: tone.border }]}>
                <Txt w={900} size={13} color={colors.bg}>
                  {fa(slot + 1)}
                </Txt>
              </View>
              <Txt w={800} size={15} color={tone.text} style={{ flex: 1 }}>
                {step.items[item]}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.bank}>
        {bank.map((item) =>
          placed.includes(item) ? (
            <View key={item} style={[styles.tile, styles.ghost]}>
              <Txt w={800} size={15} color="transparent">
                {step.items[item]}
              </Txt>
            </View>
          ) : (
            <Pressable
              key={item}
              disabled={revealed}
              onPress={() => update([...placed, item])}
              accessibilityRole="button"
              accessibilityLabel={step.items[item]}
              style={({ pressed }) => [styles.tile, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}
            >
              <Txt w={800} size={15}>
                {step.items[item]}
              </Txt>
            </Pressable>
          ),
        )}
      </View>
      <Txt size={13} color={colors.text3} center>
        به ترتیب درست روی گزینه‌ها بزن؛ برای جابه‌جایی، دوباره روشون بزن.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: {
    gap: 8,
  },
  emptyRow: {
    height: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    borderTopWidth: 2,
    borderColor: colors.lineSoft,
  },
  bank: {
    gap: 8,
  },
  tile: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  ghost: {
    borderColor: 'transparent',
    backgroundColor: '#1A2234',
  },
});
