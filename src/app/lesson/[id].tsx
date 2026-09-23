import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { ChartQuestion } from '@/components/lesson/ChartQuestion';
import { ChoiceQuestion } from '@/components/lesson/ChoiceQuestion';
import { FeedbackSheet } from '@/components/lesson/FeedbackSheet';
import { FillQuestion } from '@/components/lesson/FillQuestion';
import { LearnCard } from '@/components/lesson/LearnCard';
import { LessonComplete } from '@/components/lesson/LessonComplete';
import { LessonHeader } from '@/components/lesson/LessonHeader';
import { LineQuestion } from '@/components/lesson/LineQuestion';
import { MatchQuestion } from '@/components/lesson/MatchQuestion';
import { OrderQuestion } from '@/components/lesson/OrderQuestion';
import { PredictQuestion } from '@/components/lesson/PredictQuestion';
import { TapQuestion } from '@/components/lesson/TapQuestion';
import { TrueFalseQuestion } from '@/components/lesson/TrueFalseQuestion';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { isQuestion } from '@/content';
import { buildSession, correctAnswerText, type Session } from '@/lib/session';
import { playSfx } from '@/lib/sfx';
import { HEART_REFILL_COST, heartsNow, todaysXp, useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

type Summary = { title: string; subtitle: string; xp: number; accuracy: number; seconds: number; coins: number; celebrate: boolean; goalReached: boolean };

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session] = useState(() => buildSession(String(id), useGame.getState()));
  if (!session) return <EmptySession />;
  return <LessonPlayer session={session} />;
}

function LessonPlayer({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();
  const isLesson = session.kind === 'lesson';
  const isTest = session.kind === 'test';
  const timeLimit = session.kind === 'practice' ? session.timeLimit : undefined;

  const hearts = useGame((s) => heartsNow(s).hearts);
  const coins = useGame((s) => s.coins);

  const [queue, setQueue] = useState(() => session.steps.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<'answer' | 'feedback' | 'done'>('answer');
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [solved, setSolved] = useState(0);
  const [combo, setCombo] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lives, setLives] = useState(session.kind === 'test' ? session.lives : 0);
  const [shake] = useState(() => new Animated.Value(0));

  const firstTry = useRef(new Map<number, boolean>());
  const correctCount = useRef(0);
  const startedAt = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const index = queue[pos];
  const current = session.steps[index];
  const step = current.step;

  const finish = (timeUp = false) => {
    if (finished.current) return;
    finished.current = true;
    const game = useGame.getState();
    const xpBefore = todaysXp(game);
    const questions = session.steps.map((s, i) => (isQuestion(s.step) ? i : -1)).filter((i) => i >= 0);
    const firstTryCorrect = questions.filter((i) => firstTry.current.get(i) === true).length;
    const answered = firstTry.current.size;
    const accuracy =
      timeLimit || isTest ? (answered ? correctCount.current / answered : 0) : questions.length ? firstTryCorrect / questions.length : 1;
    const seconds = (Date.now() - startedAt.current) / 1000;

    let xp: number;
    let coinsEarned = 0;
    const passed = lives > 0;
    if (session.kind === 'test') {
      xp = passed ? (session.mode === 'master' ? 30 : 20) : 0;
      if (passed && session.mode === 'master') game.masterUnit(session.unitId, xp);
      else if (passed) game.passUnitTest(session.unitId, xp);
    } else if (session.kind === 'lesson') {
      const prev = game.completed[session.lessonId];
      const firstTime = !prev || prev.skipped;
      xp = 10 + 2 * firstTryCorrect + (accuracy >= 1 ? 5 : 0);
      coinsEarned = firstTime ? (accuracy >= 1 ? 15 : 10) : 2;
      game.completeLesson(session.lessonId, accuracy, xp, coinsEarned);
    } else {
      xp = timeLimit ? 2 * correctCount.current : 5 + firstTryCorrect;
      // Each practised lesson's review gap grows if all its questions were right first time.
      const reviewed: Record<string, boolean> = {};
      firstTry.current.forEach((ok, i) => {
        const lessonId = session.steps[i].ref.split(':')[0];
        reviewed[lessonId] = (reviewed[lessonId] ?? true) && ok;
      });
      game.completePractice(xp, reviewed);
    }

    setSummary({
      title: isTest
        ? passed
          ? session.mode === 'master'
            ? 'استاد این واحد شدی!'
            : 'قبول شدی!'
          : 'این بار نشد'
        : timeUp
          ? 'وقت تموم شد!'
          : isLesson
            ? 'درس تموم شد!'
            : 'تمرین تموم شد!',
      subtitle: isTest
        ? passed
          ? session.mode === 'master'
            ? 'تاج این واحد مال تو شد و ۲۰ سکه جایزه گرفتی.'
            : 'این واحد و واحدهای قبلش برات باز شدن.'
          : session.mode === 'master'
            ? 'یه کم مرور کن و دوباره امتحان کن؛ آزمون استادی سخت‌تره.'
            : 'اشکالی نداره؛ درس‌ها رو یکی‌یکی جلو برو و دوباره امتحان کن.'
        : timeLimit
          ? `${fa(correctCount.current)} جواب درست توی ${fa(timeLimit)} ثانیه`
          : isLesson
            ? `${session.title} · ${current.topic}`
            : session.title,
      xp,
      accuracy,
      seconds,
      coins: coinsEarned,
      celebrate: !isTest || passed,
      goalReached: xpBefore < game.dailyGoal && todaysXp(useGame.getState()) >= game.dailyGoal,
    });
    setPhase('done');
    playSfx(isTest && !passed ? 'wrong' : 'complete');
  };

  // The speed round's clock only runs while a question is on screen.
  useEffect(() => {
    if (!timeLimit || phase !== 'answer') return;
    const t = setInterval(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearInterval(t);
  }, [timeLimit, phase]);

  const timeUp = timeLimit != null && secondsLeft != null && secondsLeft <= 0;
  const onTimeUp = useEffectEvent(() => finish(true));
  useEffect(() => {
    if (timeUp) onTimeUp();
  }, [timeUp]);

  const check = (correct: boolean, flawless = correct) => {
    const game = useGame.getState();
    if (!firstTry.current.has(index)) firstTry.current.set(index, flawless);
    if (correct) {
      correctCount.current += 1;
      setSolved((n) => n + 1);
      setCombo((c) => c + 1);
      if (session.kind === 'practice' && session.mode === 'mistakes') game.clearMistake(current.ref);
    } else {
      setCombo(0);
      game.recordMistake(current.ref);
      if (isLesson) game.loseHeart();
      if (isTest) setLives((l) => l - 1);
      if (timeLimit || isTest) setSolved((n) => n + 1);
      // Wrong answers come back at the end of the lesson.
      else setQueue((q) => [...q, index]);
    }
    setLastCorrect(correct);
    setPhase('feedback');
    playSfx(correct ? 'correct' : 'wrong');
    if (!correct) {
      // A quick side-to-side shake, like a head shake, on a wrong answer.
      shake.setValue(0);
      Animated.sequence(
        [10, -10, 7, -7, 3, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 55, useNativeDriver: false })),
      ).start();
    }
  };

  const next = () => {
    if (pos + 1 >= queue.length || (isTest && lives <= 0)) {
      finish();
      return;
    }
    setPos((p) => p + 1);
    setAnswer(null);
    setPhase('answer');
  };

  const continueLearn = () => {
    setSolved((n) => n + 1);
    next();
  };

  if (phase === 'done' && summary) {
    return <LessonComplete {...summary} onContinue={leave} />;
  }

  const revealed = phase === 'feedback';
  const outOfHearts = isLesson && hearts <= 0 && phase === 'answer';
  const progress = solved / session.steps.length;

  const renderStep = () => {
    const common = { topic: current.topic, revealed, onAnswer: setAnswer };
    switch (step.type) {
      case 'learn':
        return <LearnCard step={step} topic={current.topic} />;
      case 'choice':
        return <ChoiceQuestion step={step} {...common} />;
      case 'chart':
        return <ChartQuestion step={step} {...common} />;
      case 'predict':
        return <PredictQuestion step={step} {...common} />;
      case 'truefalse':
        return <TrueFalseQuestion step={step} {...common} />;
      case 'fill':
        return <FillQuestion step={step} {...common} />;
      case 'tap':
        return <TapQuestion step={step} {...common} />;
      case 'order':
        return <OrderQuestion step={step} {...common} />;
      case 'line':
        return <LineQuestion step={step} {...common} />;
      case 'match':
        return <MatchQuestion step={step} onComplete={(flawless) => check(true, flawless)} />;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <LessonHeader
        progress={progress}
        onClose={() => setConfirmExit(true)}
        hearts={isLesson ? hearts : isTest ? lives : undefined}
        secondsLeft={timeLimit ? Math.max(0, secondsLeft ?? 0) : undefined}
      />
      <ScrollView contentContainerStyle={[styles.content, revealed && { paddingBottom: 320 }]} showsVerticalScrollIndicator={false}>
        <Animated.View key={pos} style={{ transform: [{ translateX: shake }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {step.type !== 'match' && (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {step.type === 'learn' ? (
            <Button3D label="فهمیدم، ادامه" onPress={continueLearn} />
          ) : (
            <Button3D label="بررسی" disabled={answer === null || revealed} onPress={() => check(answer === true)} />
          )}
        </View>
      )}

      {revealed && (
        <FeedbackSheet
          correct={lastCorrect}
          correctAnswer={lastCorrect ? undefined : correctAnswerText(step)}
          explanation={'explanation' in step ? step.explanation : undefined}
          combo={combo}
          onContinue={next}
        />
      )}

      <Modal visible={confirmExit} transparent animationType="fade" onRequestClose={() => setConfirmExit(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Mascot mood="sad" size={96} />
            <Txt w={900} size={20} center>
              مطمئنی می‌خوای بری؟
            </Txt>
            <Txt size={15} color={colors.text2} center>
              {isLesson ? 'پیشرفت این درس ذخیره نمی‌شه.' : 'امتیاز این تمرین حساب نمی‌شه.'}
            </Txt>
            <Button3D label="ادامه می‌دم" onPress={() => setConfirmExit(false)} style={styles.dialogBtn} />
            <Button3D
              label="خروج"
              variant="secondary"
              size={17}
              onPress={() => {
                setConfirmExit(false);
                leave();
              }}
              style={styles.dialogBtn}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={outOfHearts} transparent animationType="fade" onRequestClose={leave}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Mascot mood="sad" size={96} />
            <Txt w={900} size={20} center>
              قلب‌هات تموم شد!
            </Txt>
            <Txt size={15} lh={1.8} color={colors.text2} center>
              هر ۳۰ دقیقه یه قلب برمی‌گرده. می‌تونی با سکه پرشون کنی یا با تمرین کردن قلب بگیری.
            </Txt>
            <Button3D
              label={`پر کردن قلب‌ها (${fa(HEART_REFILL_COST)} سکه)`}
              variant="gold"
              size={16}
              disabled={coins < HEART_REFILL_COST}
              onPress={() => useGame.getState().refillHearts()}
              style={styles.dialogBtn}
            />
            <Button3D label="تمرین کن و قلب بگیر" size={16} onPress={() => router.replace('/lesson/practice-mixed')} style={styles.dialogBtn} />
            <Button3D label="خروج" variant="secondary" size={16} onPress={leave} style={styles.dialogBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptySession() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, styles.empty, { paddingTop: Math.max(insets.top, 16) }]}>
      <Mascot mood="think" size={120} />
      <Txt w={900} size={19} center>
        فعلاً سؤالی برای این تمرین نیست
      </Txt>
      <Txt size={15} lh={1.8} color={colors.text2} center>
        چند تا درس رو تموم کن یا اول چند تا اشتباه داشته باش تا اینجا چیزی برای مرور باشه.
      </Txt>
      <Button3D label="برگرد" onPress={leave} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.lineSoft,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    padding: 22,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  dialogBtn: {
    alignSelf: 'stretch',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
});
