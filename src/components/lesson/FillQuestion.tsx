import { Fragment, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import type { FillStep } from '@/content';
import { colors } from '@/theme';
import { shuffle } from '@/utils/random';

import { QuestionTag, QuestionTitle } from './common';
import type { QuestionProps } from './types';

/** Tap words from the bank to fill the blanks; tap a placed word to send it back. */
export function FillQuestion({ step, revealed, onAnswer }: QuestionProps<FillStep>) {
  const bank = useMemo(() => shuffle([...step.answers, ...step.distractors]), [step]);
  // Words of the text between blanks; punctuation right after a blank stays attached to it.
  const parts = useMemo(
    () =>
      step.sentence.split('___').map((part, i) => {
        const trailing = i > 0 ? (part.match(/^[،؛.!؟,:]+/)?.[0] ?? '') : '';
        return { trailing, words: part.slice(trailing.length).split(' ').filter(Boolean) };
      }),
    [step],
  );
  // Bank index placed in each blank.
  const [slots, setSlots] = useState<(number | null)[]>(() => step.answers.map(() => null));

  const update = (next: (number | null)[]) => {
    setSlots(next);
    const complete = next.every((s) => s != null);
    onAnswer(complete ? next.every((s, i) => bank[s!] === step.answers[i]) : null);
  };

  const place = (bankIndex: number) => {
    const empty = slots.indexOf(null);
    if (empty < 0) return;
    const next = slots.slice();
    next[empty] = bankIndex;
    update(next);
  };

  const remove = (slot: number) => {
    const next = slots.slice();
    next[slot] = null;
    update(next);
  };

  const used = new Set(slots.filter((s): s is number => s != null));

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="کامل کن" icon="pencil" />
        <QuestionTitle>جمله رو با کلمه‌های درست کامل کن</QuestionTitle>
      </View>

      <View style={styles.sentenceRow}>
        <Mascot mood="think" size={72} />
        <View style={styles.sentence}>
          {parts.map((part, i) => (
            <Fragment key={i}>
              {part.words.map((word, w) => (
                <Txt key={`${i}-${w}`} w={700} size={17} lh={1.6}>
                  {word}
                </Txt>
              ))}
              {i < parts.length - 1 && (
                <View style={styles.slotGroup}>
                  <Slot slot={i} bankIndex={slots[i]} bank={bank} step={step} revealed={revealed} onRemove={remove} />
                  {parts[i + 1].trailing ? (
                    <Txt w={700} size={17}>
                      {parts[i + 1].trailing}
                    </Txt>
                  ) : null}
                </View>
              )}
            </Fragment>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bank} accessibilityLabel="بانک کلمه‌ها">
        {bank.map((word, i) =>
          used.has(i) ? (
            <View key={i} style={[styles.tile, styles.ghost]}>
              <Txt w={800} size={16} color="transparent">
                {word}
              </Txt>
            </View>
          ) : (
            <Pressable
              key={i}
              disabled={revealed}
              onPress={() => place(i)}
              accessibilityRole="button"
              accessibilityLabel={word}
              style={({ pressed }) => [styles.tile, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}
            >
              <Txt w={800} size={16}>
                {word}
              </Txt>
            </Pressable>
          ),
        )}
      </View>
      <Txt size={13} color={colors.text3} center>
        روی کلمه بزن تا بره توی جای خالی؛ دوباره بزن تا برگرده.
      </Txt>
    </View>
  );
}

function Slot({
  slot,
  bankIndex,
  bank,
  step,
  revealed,
  onRemove,
}: {
  slot: number;
  bankIndex: number | null;
  bank: string[];
  step: FillStep;
  revealed: boolean;
  onRemove: (slot: number) => void;
}) {
  if (bankIndex == null) {
    return <View style={styles.emptySlot} accessibilityLabel="جای خالی" />;
  }
  const word = bank[bankIndex];
  const right = word === step.answers[slot];
  const tone = !revealed
    ? { border: colors.sky, bg: colors.skySoft, text: colors.skyText }
    : right
      ? { border: colors.bull, bg: colors.bullSoft, text: colors.bullText }
      : { border: colors.bear, bg: colors.bearSoft, text: colors.bearText };
  return (
    <Pressable
      disabled={revealed}
      onPress={() => onRemove(slot)}
      accessibilityRole="button"
      accessibilityLabel={`${word}، برای برداشتن بزن`}
      style={[styles.filled, { borderColor: tone.border, backgroundColor: tone.bg }]}
    >
      <Txt w={900} size={16} color={tone.text}>
        {word}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sentence: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  slotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptySlot: {
    width: 76,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.faint,
  },
  filled: {
    height: 38,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  divider: {
    borderTopWidth: 2,
    borderColor: colors.lineSoft,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tile: {
    height: 46,
    paddingHorizontal: 16,
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
