import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { quizPoints, QUIZ_SECONDS, type DuelQuestion, type DuelResult } from '@/lib/duel';
import { playSfx } from '@/lib/sfx';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

const PAUSE_MS = 1100;

/** Round 1: questions against the clock; a right answer scores 100 plus a bonus for time left. */
export function QuizRound({ questions, onDone }: { questions: DuelQuestion[]; onDone: (r: DuelResult['quiz']) => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(QUIZ_SECONDS);
  const [score, setScore] = useState({ correct: 0, points: 0 });
  const [gain, setGain] = useState(0);
  const startedAt = useRef(0);
  const q = questions[index];
  const answered = picked != null;
  // True/false answers are 0 (true) and 1 (false), like two options.
  const rightIndex = q.kind === 'choice' ? q.answer : q.answer ? 0 : 1;
  const options = q.kind === 'choice' ? q.options : [t('درسته'), t('غلطه')];

  const answer = (choice: number) => {
    if (answered) return;
    // The clock state is refreshed every tenth of a second, close enough for the time bonus.
    const secondsLeft = left;
    const ok = choice === rightIndex;
    const pts = quizPoints(ok, secondsLeft);
    setPicked(choice);
    setGain(pts);
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), points: s.points + pts }));
    playSfx(ok ? 'correct' : 'wrong');
  };

  // Each question's clock; running out counts as a wrong answer.
  useEffect(() => {
    startedAt.current = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, QUIZ_SECONDS - (Date.now() - startedAt.current) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setPicked((p) => (p == null ? -1 : p));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [index]);

  const finish = useEffectEvent(() => onDone(score));

  // After an answer (or time out), a short pause, then the next question or the round's end.
  useEffect(() => {
    if (picked == null) return;
    const timer = setTimeout(() => {
      if (index + 1 >= questions.length) {
        finish();
        return;
      }
      setIndex((i) => i + 1);
      setPicked(null);
      setGain(0);
      setLeft(QUIZ_SECONDS);
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [picked, index, questions.length]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Txt w={800} size={13} color={colors.text3}>
          {t('سؤال {n} از {total}', { n: fa(index + 1), total: fa(questions.length) })}
        </Txt>
        <View style={{ flex: 1 }} />
        <Txt w={900} size={14} color={colors.gold}>
          {t('{n} امتیاز', { n: fa(score.points) })}
        </Txt>
      </View>
      <ProgressBar value={left / QUIZ_SECONDS} height={10} color={left < 5 ? colors.bear : colors.sky} label={t('زمان باقی‌مونده')} />

      <View style={styles.card}>
        <Txt w={900} size={17} lh={1.8}>
          {q.prompt}
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        {options.map((text, i) => {
          const right = answered && i === rightIndex;
          const wrong = answered && i === picked && i !== rightIndex;
          return (
            <Pressable
              key={`${index}-${i}`}
              onPress={() => answer(i)}
              disabled={answered}
              accessibilityRole="button"
              accessibilityLabel={t('گزینه‌ی {n}: {text}', { n: fa(i + 1), text })}
              accessibilityState={{ disabled: answered, selected: picked === i }}
              style={({ pressed }) => [styles.option, right && styles.right, wrong && styles.wrong, pressed && !answered && { transform: [{ translateY: 2 }] }]}
            >
              <Txt w={800} size={15} lh={1.6} style={{ flex: 1 }} color={right ? colors.bullText : wrong ? colors.bearText : colors.text}>
                {text}
              </Txt>
              {right ? <Icon name="check" size={20} color={colors.bull} strokeWidth={3} /> : wrong ? <Icon name="close" size={20} color={colors.bear} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <Txt w={900} size={15} center color={gain > 0 ? colors.bullText : colors.bearText}>
          {gain > 0 ? t('+{n} امتیاز', { n: fa(gain) }) : picked === -1 ? t('وقت تموم شد!') : t('این یکی نشد')}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    minHeight: 110,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  right: {
    borderColor: colors.bull,
    backgroundColor: colors.bullSheet,
  },
  wrong: {
    borderColor: colors.bear,
    backgroundColor: colors.bearSheet,
  },
});
