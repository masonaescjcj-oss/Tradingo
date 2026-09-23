import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import type { MatchStep } from '@/content';
import { colors } from '@/theme';
import { fa } from '@/utils/format';
import { shuffle } from '@/utils/random';

import { QuestionTag, QuestionTitle, type OptionState } from './common';
import { OptionButton } from './OptionButton';

type Props = {
  step: MatchStep;
  /** Called once every pair is matched; `flawless` is false if any wrong pair was tried. */
  onComplete: (flawless: boolean) => void;
};

type Pick = { side: 'term' | 'meaning'; pair: number };

export function MatchQuestion({ step, onComplete }: Props) {
  const terms = useMemo(() => shuffle(step.pairs.map((_, i) => i)), [step]);
  const meanings = useMemo(() => shuffle(step.pairs.map((_, i) => i)), [step]);
  const [matched, setMatched] = useState<number[]>([]);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [wrong, setWrong] = useState<Pick[]>([]);
  const mistakes = useRef(0);

  useEffect(() => {
    if (wrong.length === 0) return;
    const t = setTimeout(() => setWrong([]), 600);
    return () => clearTimeout(t);
  }, [wrong]);

  const tap = (side: Pick['side'], pair: number) => {
    if (matched.includes(pair)) return;
    if (!picked || picked.side === side) {
      setPicked({ side, pair });
      return;
    }
    if (picked.pair === pair) {
      const next = [...matched, pair];
      setMatched(next);
      setPicked(null);
      if (next.length === step.pairs.length) onComplete(mistakes.current === 0);
    } else {
      mistakes.current += 1;
      setWrong([picked, { side, pair }]);
      setPicked(null);
    }
  };

  const stateOf = (side: Pick['side'], pair: number): OptionState => {
    if (matched.includes(pair)) return 'dim';
    if (wrong.some((w) => w.side === side && w.pair === pair)) return 'wrong';
    if (picked?.side === side && picked.pair === pair) return 'selected';
    return 'idle';
  };

  const textColor = (state: OptionState) =>
    state === 'selected' ? colors.skyText : state === 'wrong' ? colors.bearText : state === 'dim' ? colors.faint : colors.text;

  // Rows pair a shuffled term with a shuffled meaning, like two columns side by side.
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="واژه‌نامه‌ی ترید" icon="book" />
        <QuestionTitle>هر اصطلاح رو به معنیش وصل کن</QuestionTitle>
      </View>
      <View style={{ gap: 12 }}>
        {terms.map((termPair, row) => {
          const meaningPair = meanings[row];
          const termState = stateOf('term', termPair);
          const meaningState = stateOf('meaning', meaningPair);
          const term = step.pairs[termPair];
          return (
            <View key={row} style={styles.row}>
              <OptionButton
                state={termState}
                role="button"
                disabled={matched.includes(termPair)}
                onPress={() => tap('term', termPair)}
                accessibilityLabel={term.term}
                style={styles.cell}
              >
                <Txt w={900} size={16} color={textColor(termState)} center>
                  {term.term}
                </Txt>
                {term.sub && (
                  <Txt w={700} size={11} color={termState === 'dim' ? colors.faint : colors.text3} center>
                    {term.sub}
                  </Txt>
                )}
              </OptionButton>
              <OptionButton
                state={meaningState}
                role="button"
                disabled={matched.includes(meaningPair)}
                onPress={() => tap('meaning', meaningPair)}
                accessibilityLabel={step.pairs[meaningPair].meaning}
                style={styles.cell}
              >
                <Txt w={700} size={13.5} lh={1.55} color={textColor(meaningState)} center>
                  {step.pairs[meaningPair].meaning}
                </Txt>
              </OptionButton>
            </View>
          );
        })}
      </View>
      <Txt w={700} size={13} color={colors.text3} center>
        {`${fa(matched.length)} از ${fa(step.pairs.length)} جفت پیدا شد`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cell: {
    flex: 1,
    minHeight: 68,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
