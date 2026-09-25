import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SignupForm } from '@/components/auth/SignupForm';
import { Button3D } from '@/components/Button3D';
import { CourseBadge } from '@/components/CourseBadge';
import { Icon, type IconName } from '@/components/Icon';
import { KeyboardScroll } from '@/components/KeyboardScroll';
import { MARKETS, MarketCard } from '@/components/MarketPicker';
import { Mascot, type MascotMood } from '@/components/Mascot';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { findCourse, starterCourses, type Course, type Market } from '@/content';
import { t } from '@/i18n';
import { resetTo } from '@/lib/nav';
import { useGame, type Level } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

type StepId = 'hello' | 'market' | 'reason' | 'level' | 'goal' | 'source' | 'plan' | 'signup';
const STEPS: StepId[] = ['hello', 'market', 'reason', 'level', 'goal', 'source', 'plan', 'signup'];

const REASONS: { id: string; icon: IconName; title: string }[] = [
  { id: 'income', icon: 'arrowUpRight', title: 'یه درآمد جانبی داشته باشم' }, // i18n-ignore: translated where shown
  { id: 'savings', icon: 'shield', title: 'پس‌اندازم رو بهتر مدیریت کنم' }, // i18n-ignore: translated where shown
  { id: 'career', icon: 'trophy', title: 'ترید رو شغل خودم کنم' }, // i18n-ignore: translated where shown
  { id: 'news', icon: 'layers', title: 'اخبار و بازارها رو بفهمم' }, // i18n-ignore: translated where shown
  { id: 'curious', icon: 'bulb', title: 'فقط کنجکاوم و می‌خوام یاد بگیرم' }, // i18n-ignore: translated where shown
];

const LEVELS: { id: Level; bars: number; title: string; sub: string }[] = [
  { id: 'new', bars: 1, title: 'تازه‌کارم', sub: 'تا حالا معامله نکردم؛ از صفر شروع می‌کنیم.' }, // i18n-ignore: translated where shown
  { id: 'some', bars: 2, title: 'یه چیزایی بلدم', sub: 'کندل و حد ضرر رو می‌شناسم؛ با یه آزمون کوتاه مقدمه‌ها رو رد می‌کنی.' }, // i18n-ignore: translated where shown
  { id: 'pro', bars: 3, title: 'قبلاً ترید کردم', sub: 'معامله‌ی واقعی داشتم؛ با یه آزمون کوتاه از جای درست شروع می‌کنی.' }, // i18n-ignore: translated where shown
];

const GOALS: { xp: number; minutes: number; title: string }[] = [
  { xp: 10, minutes: 5, title: 'آروم' }, // i18n-ignore: translated where shown
  { xp: 20, minutes: 10, title: 'معمولی' }, // i18n-ignore: translated where shown
  { xp: 30, minutes: 15, title: 'جدی' }, // i18n-ignore: translated where shown
  { xp: 50, minutes: 20, title: 'حرفه‌ای' }, // i18n-ignore: translated where shown
];

const SOURCES = ['اینستاگرام', 'تلگرام', 'یوتیوب', 'دوستان و آشناها', 'جست‌وجو در گوگل', 'جای دیگه']; // i18n-ignore: translated where shown

const PROMPTS: Record<StepId, { text: string; mood: MascotMood }> = {
  hello: { text: 'سلام! من شمعکم.', mood: 'party' }, // i18n-ignore: translated where shown
  market: { text: 'می‌خوای کدوم بازار رو یاد بگیری؟', mood: 'happy' }, // i18n-ignore: translated where shown
  reason: { text: 'چرا می‌خوای ترید یاد بگیری؟', mood: 'think' }, // i18n-ignore: translated where shown
  level: { text: 'چقدر با ترید آشنایی؟', mood: 'think' }, // i18n-ignore: translated where shown
  goal: { text: 'هدف روزانه‌ت چقدر باشه؟', mood: 'happy' }, // i18n-ignore: translated where shown
  source: { text: 'از کجا با چارتون آشنا شدی؟', mood: 'happy' }, // i18n-ignore: translated where shown
  plan: { text: 'مسیرت آماده‌ست!', mood: 'party' }, // i18n-ignore: translated where shown
  signup: { text: 'پروفایلت رو بساز تا پیشرفتت گم نشه.', mood: 'happy' }, // i18n-ignore: translated where shown
};

/** Onboarding: a few quick questions, a personal plan, then the profile. */
export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [market, setMarket] = useState<Market | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const step = STEPS[index];
  const prompt = PROMPTS[step];

  const back = () => {
    if (index > 0) setIndex(index - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };
  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1));

  const finish = (name: string) => {
    const game = useGame.getState();
    game.finishOnboarding(market ?? 'both', level ?? 'new');
    game.setDailyGoal(goal ?? 20);
    game.setAnswers({ reason: reason ?? undefined, source: source ?? undefined });
    if (name && !game.user) game.setName(name);
    resetTo('/(tabs)');
  };

  const canContinue =
    step === 'market' ? !!market : step === 'reason' ? !!reason : step === 'level' ? !!level : step === 'goal' ? !!goal : true;

  return (
    <Screen style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t('بازگشت')} style={styles.back}>
          <Icon name="chevronBack" size={26} color={colors.text3} strokeWidth={2.6} />
        </Pressable>
        <ProgressBar value={index / (STEPS.length - 1)} label={t('مرحله‌ی {n} از {total}', { n: fa(index + 1), total: fa(STEPS.length) })} />
      </View>

      <KeyboardScroll contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'hello' ? (
          <View style={styles.hello}>
            <SpeechBubble tail="bottomEnd" background={colors.text} border="#D5DBE6" style={styles.helloBubble}>
              <Txt w={900} size={20} color={colors.bg} center>
                {t(prompt.text)}
              </Txt>
              <Txt w={700} size={15} lh={1.8} color="#3A4560" center>
                {t('فقط چند تا سؤال کوتاه ازت می‌پرسم تا مسیر یادگیریت رو مخصوص خودت بسازم.')}
              </Txt>
            </SpeechBubble>
            <Mascot mood="party" size={170} />
          </View>
        ) : (
          <View style={styles.mascotRow}>
            <Mascot mood={prompt.mood} size={84} />
            <SpeechBubble style={{ flex: 1 }}>
              <Txt w={800} size={17} lh={1.7}>
                {t(prompt.text)}
              </Txt>
            </SpeechBubble>
          </View>
        )}

        {step === 'market' && (
          <View style={styles.list} accessibilityRole="radiogroup">
            {MARKETS.map((m) => (
              <MarketCard key={m.id} market={m} selected={market === m.id} onPress={() => setMarket(m.id)} />
            ))}
          </View>
        )}

        {step === 'reason' && (
          <View style={styles.list} accessibilityRole="radiogroup">
            {REASONS.map((r) => (
              <Choice key={r.id} selected={reason === r.id} onPress={() => setReason(r.id)} label={t(r.title)}>
                <View style={styles.iconTile}>
                  <Icon name={r.icon} size={22} color={colors.gold} />
                </View>
                <Txt w={800} size={16} style={{ flex: 1 }}>
                  {t(r.title)}
                </Txt>
              </Choice>
            ))}
          </View>
        )}

        {step === 'level' && (
          <View style={styles.list} accessibilityRole="radiogroup">
            {LEVELS.map((l) => (
              <Choice key={l.id} selected={level === l.id} onPress={() => setLevel(l.id)} label={t(l.title)}>
                <Bars count={l.bars} on={level === l.id} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt w={900} size={17}>
                    {t(l.title)}
                  </Txt>
                  <Txt size={13} lh={1.7} color={colors.text2}>
                    {t(l.sub)}
                  </Txt>
                </View>
              </Choice>
            ))}
          </View>
        )}

        {step === 'goal' && (
          <View style={styles.list} accessibilityRole="radiogroup">
            {GOALS.map((g) => (
              <Choice
                key={g.xp}
                selected={goal === g.xp}
                onPress={() => setGoal(g.xp)}
                label={t('{title}، {n} دقیقه در روز', { title: t(g.title), n: fa(g.minutes) })}
              >
                <Txt w={900} size={17} style={{ flex: 1 }}>
                  {t('{n} دقیقه در روز', { n: fa(g.minutes) })}
                </Txt>
                <Txt w={800} size={14} color={goal === g.xp ? colors.skyText : colors.text3}>
                  {t(g.title)}
                </Txt>
              </Choice>
            ))}
            <Txt size={13} lh={1.8} color={colors.text3} center>
              {t('هر وقت خواستی از پروفایل عوضش کن. کم ولی هر روز، بهتر از زیاد و گاهی.')}
            </Txt>
          </View>
        )}

        {step === 'source' && (
          <View style={styles.chips} accessibilityRole="radiogroup">
            {SOURCES.map((s) => {
              const on = source === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSource(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Txt w={800} size={15} color={on ? colors.skyText : colors.text}>
                    {t(s)}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        )}

        {step === 'plan' && <Plan market={market ?? 'both'} level={level ?? 'new'} goal={goal ?? 20} />}

        {step === 'signup' && (
          <View style={{ gap: 6 }}>
            <SignupForm onDone={finish} onSkip={finish} />
          </View>
        )}
      </KeyboardScroll>

      {step !== 'signup' && (
        <Button3D
          label={
            step === 'hello'
              ? t('بزن بریم')
              : step === 'plan'
                ? t('ساخت پروفایل')
                : step === 'source' && !source
                  ? t('رد کردن')
                  : t('ادامه')
          }
          variant={step === 'source' && !source ? 'secondary' : 'primary'}
          disabled={!canContinue}
          onPress={next}
        />
      )}
    </Screen>
  );
}

/** A selectable row with a radio-like highlight. */
function Choice({ selected, onPress, label, children }: { selected: boolean; onPress: () => void; label: string; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[styles.choice, selected && styles.choiceOn]}
    >
      {children}
    </Pressable>
  );
}

/** Signal-strength style bars for the experience level. */
function Bars({ count, on }: { count: number; on: boolean }) {
  return (
    <View style={styles.bars}>
      {[1, 2, 3].map((b) => (
        <View key={b} style={[styles.bar, { height: 8 + b * 7, backgroundColor: b <= count ? (on ? colors.sky : colors.bull) : colors.raised }]} />
      ))}
    </View>
  );
}

function Plan({ market, level, goal }: { market: Market; level: Level; goal: number }) {
  const courses = starterCourses(market)
    .map(findCourse)
    .filter((c): c is Course => !!c);
  const minutes = GOALS.find((g) => g.xp === goal)?.minutes ?? 10;
  // About 15 XP per lesson.
  const perDay = Math.max(1, Math.round(goal / 15));
  const start = courses[0];
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.planCard}>
        <PlanRow icon="target" label={t('هدف روزانه')} value={t('{minutes} دقیقه ({xp} امتیاز)', { minutes: fa(minutes), xp: fa(goal) })} />
        <PlanRow icon="book" label={t('هر روز حدوداً')} value={t('{n} درس کوتاه', { n: fa(perDay), count: perDay })} />
        {start && (
          <PlanRow
            icon="play"
            label={t('شروع از')}
            value={level === 'new' ? start.title : t('{course}؛ با آزمون پرش مقدمه‌ها رو رد کن', { course: start.title })}
          />
        )}
      </View>
      <Txt w={900} size={16}>
        {t('دوره‌هایی که برات اضافه می‌شن')}
      </Txt>
      <View style={styles.planCourses}>
        {courses.map((c) => (
          <View key={c.id} style={styles.planCourse}>
            <CourseBadge course={c} size={46} />
            <Txt w={800} size={12} center numberOfLines={2}>
              {c.title}
            </Txt>
          </View>
        ))}
      </View>
      <Txt size={13} lh={1.8} color={colors.text3}>
        {t('بعداً هر دوره‌ی دیگه‌ای رو خواستی اضافه کن؛ از اندیکاتورها و استراتژی‌ها تا تحلیل پیشرفته و اسمارت مانی.')}
      </Txt>
    </View>
  );
}

function PlanRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.planRow}>
      <Icon name={icon} size={20} color={colors.bull} />
      <Txt w={700} size={14} color={colors.text2} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt w={900} size={14}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingVertical: 18,
    gap: 18,
  },
  hello: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 24,
  },
  helloBubble: {
    maxWidth: 330,
    gap: 6,
    paddingVertical: 16,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  list: {
    gap: 12,
  },
  choice: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  choiceOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  bars: {
    width: 42,
    height: 32,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    direction: 'ltr',
  },
  bar: {
    width: 8,
    borderRadius: 3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    height: 50,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  planCard: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planCourses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planCourse: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
