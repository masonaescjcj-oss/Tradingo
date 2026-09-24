import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { CoachAvatar } from '@/components/chat/ChatBits';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { midsOf, useFeedSnapshot } from '@/components/sim/useMarketFeed';
import { Txt } from '@/components/Txt';
import { t, textStart } from '@/i18n';
import { cleanReply, coachContext, coachErrorText, coachSuggestions, type CoachTurn } from '@/lib/coach';
import { addTurn, ANSWER_REPORT_REASONS, askCoach, clearCoach, reportAnswer, useCoach, type AnswerReportReason } from '@/lib/coachApi';
import { messageTime } from '@/lib/chat';
import { useCloud } from '@/lib/cloud';
import { useKeyboardOverlap } from '@/lib/keyboard';
import { pickData, useGame } from '@/store/game';
import { colors, fonts, MAX_WIDTH } from '@/theme';
import { fa } from '@/utils/format';

const MAX_QUESTION = 1000;

/** A private chat with the AI coach, who sees the learner's courses, trades and positions. */
export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const turns = useCoach((s) => s.turns);
  const signedIn = useCloud((s) => s.userId != null);
  const user = useGame((s) => s.user);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState<CoachTurn | null>(null);
  const [composerH, setComposerH] = useState(70);
  const scroll = useRef<ScrollView>(null);
  const keyboard = useKeyboardOverlap();

  const bubbleW = Math.min(Math.min(width, MAX_WIDTH) * 0.84, 420);

  useEffect(() => {
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  }, [turns.length, thinking, keyboard.overlap]);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q || thinking) return;
    const earlier = useCoach.getState().turns;
    addTurn('user', q);
    setText('');
    setError(null);
    setThinking(true);
    const series = useFeedSnapshot.getState().series;
    const context = coachContext(pickData(useGame.getState()), series ? midsOf(series) : null);
    const res = await askCoach(earlier, q, context);
    setThinking(false);
    if (res.reply) {
      addTurn('assistant', cleanReply(res.reply));
      if (res.remaining != null) setRemaining(res.remaining);
    } else {
      setError(coachErrorText(res.error ?? 'ai'));
    }
  };

  return (
    <View style={styles.screen} onLayout={keyboard.onLayout}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('برگشت')} hitSlop={8} style={styles.headerBtn}>
          <Icon name="chevronBack" size={24} color={colors.text} strokeWidth={2.6} />
        </Pressable>
        <CoachAvatar size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt w={900} size={16}>
            {t('شمعک')}
          </Txt>
          <Txt w={700} size={12} color={colors.bullText} numberOfLines={1}>
            {thinking ? t('داره می‌نویسه…') : t('دستیار هوش مصنوعی چارتون')}
          </Txt>
        </View>
        {turns.length > 0 ? (
          <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel={t('گزینه‌های گفتگو')} hitSlop={8} style={styles.headerBtn}>
            <Icon name="list" size={22} color={colors.text2} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={[styles.list, { paddingBottom: composerH + 12 + keyboard.overlap }]} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Icon name="bulb" size={16} color={colors.gold} strokeWidth={2.4} />
          <Txt w={700} size={12} lh={1.7} color={colors.text2} style={{ flex: 1 }}>
            {t('شمعک دوره‌ها و جایی که هستی، اشتباه‌های درس‌ها، و پوزیشن‌ها، سفارش‌ها و معامله‌های شبیه‌سازت رو می‌بینه. ممکنه اشتباه کنه؛ جواب‌هاش آموزشیه و توصیه‌ی سرمایه‌گذاری نیست.')}
          </Txt>
        </View>

        {turns.length === 0 ? (
          <View style={styles.empty}>
            <Mascot mood="happy" size={110} />
            <Txt w={900} size={18} center>
              {t('سلام! من شمعکم.')}
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {t('هر سؤالی درباره‌ی ترید، درس‌هات یا معامله‌های شبیه‌سازت داری بپرس. مثلاً:')}
            </Txt>
            <View style={styles.suggestions}>
              {coachSuggestions().map((s) => (
                <Pressable key={s} onPress={() => (signedIn ? ask(s) : setText(s))} accessibilityRole="button" style={styles.suggestion}>
                  <Txt w={800} size={13.5} color={colors.text}>
                    {s}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {turns.map((turn, i) => (
          <Bubble
            key={turn.id}
            turn={turn}
            grouped={i > 0 && turns[i - 1].role === turn.role}
            width={bubbleW}
            onReport={turn.role === 'assistant' && signedIn ? () => setReporting(turn) : undefined}
          />
        ))}
        {thinking ? <Typing /> : null}
      </ScrollView>

      <View style={[styles.composer, { bottom: keyboard.overlap, paddingBottom: keyboard.overlap ? 10 : Math.max(insets.bottom, 10) }]} onLayout={(e) => setComposerH(e.nativeEvent.layout.height)} pointerEvents="box-none">
        {error || remaining != null ? (
          <Pressable onPress={() => setError(null)} style={styles.notePill}>
            <Txt w={700} size={12.5} color={error ? colors.gold : colors.text3}>
              {error ?? t('{n} پیام دیگه برای امروز', { n: fa(remaining ?? 0), count: remaining ?? 0 })}
            </Txt>
          </Pressable>
        ) : null}
        {!signedIn ? (
          <Button3D
            label={user ? t('برای گفتگو با شمعک، حسابت رو به سرور وصل کن') : t('برای گفتگو با شمعک، وارد حسابت شو')}
            size={15}
            height={48}
            onPress={() => router.push(user ? '/account' : '/login')}
          />
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('از شمعک بپرس…')}
              placeholderTextColor={colors.faint}
              maxLength={MAX_QUESTION}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => ask(text)}
              editable={!thinking}
              style={[styles.input, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }]}
            />
            <Pressable
              onPress={() => ask(text)}
              disabled={thinking || !text.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('ارسال')}
              style={[styles.send, (thinking || !text.trim()) && styles.sendIdle]}
            >
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="send" size={20} color={colors.bullInk} strokeWidth={2.6} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      <ReportAnswerSheet
        turn={reporting}
        question={reporting ? ([...turns.slice(0, turns.findIndex((x) => x.id === reporting.id))].reverse().find((x) => x.role === 'user')?.text ?? '') : ''}
        onClose={() => setReporting(null)}
      />

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.dialog}>
            <Txt w={900} size={17} center>
              {t('گفتگو با شمعک')}
            </Txt>
            <Txt size={13.5} lh={1.8} color={colors.text2} center>
              {t('گفتگو فقط روی همین دستگاه ذخیره می‌شه.')}
            </Txt>
            <Button3D
              label={t('پاک کردن گفتگو')}
              variant="danger"
              size={16}
              onPress={() => {
                clearCoach();
                setMenu(false);
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label={t('بی‌خیال')} variant="secondary" size={16} onPress={() => setMenu(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Bubble({ turn, grouped, width, onReport }: { turn: CoachTurn; grouped: boolean; width: number; onReport?: () => void }) {
  const mine = turn.role === 'user';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther, grouped && { marginTop: -6 }]}>
      {!mine ? <View style={{ width: 32 }}>{!grouped ? <CoachAvatar size={32} /> : null}</View> : null}
      <Pressable
        onLongPress={onReport}
        delayLongPress={350}
        disabled={!onReport}
        accessibilityHint={onReport ? t('برای گزارش این جواب، نگه دار') : undefined}
        style={[styles.bubble, { maxWidth: width }, mine ? styles.bubbleMine : styles.bubbleOther]}
      >
        <Txt w={500} size={14.5} lh={1.8} selectable>
          {turn.text}
        </Txt>
        <View style={styles.meta}>
          {onReport ? (
            <Pressable onPress={onReport} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('گزارش این جواب')} style={styles.reportBtn}>
              <Icon name="flag" size={12} color={colors.text3} strokeWidth={2.4} />
              <Txt w={700} size={10.5} color={colors.text3}>
                {t('گزارش')}
              </Txt>
            </Pressable>
          ) : null}
          <Txt w={500} size={10.5} color={mine ? 'rgba(241,244,249,0.65)' : colors.text3}>
            {messageTime(new Date(turn.at).toISOString())}
          </Txt>
        </View>
      </Pressable>
    </View>
  );
}

/** Reporting an answer of the coach: why, and an optional note. The answer and its question go to the admins. */
function ReportAnswerSheet({ turn, question, onClose }: { turn: CoachTurn | null; question: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const [reason, setReason] = useState<AnswerReportReason | null>(null);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setReason(null);
    setNote('');
    setPhase('form');
    setError(null);
  };

  const send = async () => {
    if (!turn || !reason) return;
    setPhase('sending');
    const res = await reportAnswer(question, turn.text, reason, note);
    if (res.ok) return setPhase('done');
    setPhase('form');
    setError(
      res.error === 'rate'
        ? t('امروز گزارش زیادی فرستادی؛ فردا دوباره امتحان کن.')
        : res.error === 'network'
          ? t('به سرور وصل نشد؛ دوباره امتحان کن.')
          : t('گزارش فرستاده نشد؛ دوباره امتحان کن.'),
    );
  };

  return (
    <Modal visible={turn != null} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.sheetBackdrop, { paddingBottom: keyboard.overlap }]} onLayout={keyboard.onLayout}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('بستن')} />
        <View style={[styles.sheet, { paddingBottom: 20 + (keyboard.overlap ? 0 : insets.bottom) }]}>
          {phase === 'done' ? (
            <>
              <Mascot mood="happy" size={80} />
              <Txt w={900} size={18} center>
                {t('ممنون که گزارش دادی')}
              </Txt>
              <Txt size={13.5} lh={1.9} color={colors.text2} center>
                {t('مدیرهای چارتون این جواب رو بررسی می‌کنن تا شمعک بهتر بشه.')}
              </Txt>
              <Button3D label={t('باشه')} size={16} onPress={close} />
            </>
          ) : (
            <>
              <Txt w={900} size={18}>
                {t('گزارش این جواب')}
              </Txt>
              <Txt size={12.5} lh={1.8} color={colors.text3}>
                {t('این جواب و سؤالت برای بررسی به مدیرهای چارتون فرستاده می‌شه؛ بقیه‌ی گفتگو روی گوشیت می‌مونه.')}
              </Txt>
              <View style={{ gap: 8 }}>
                {ANSWER_REPORT_REASONS.map((r) => {
                  const on = r.id === reason;
                  return (
                    <Pressable key={r.id} onPress={() => setReason(r.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.reason, on && styles.reasonOn]}>
                      <Txt w={800} size={14} color={on ? colors.skyText : colors.text}>
                        {t(r.label)}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('توضیح (اختیاری)')}
                placeholderTextColor={colors.faint}
                maxLength={300}
                multiline
                style={[styles.noteInput, { textAlign: textStart() }]}
              />
              {error ? (
                <Txt w={700} size={13} color={colors.bearText}>
                  {error}
                </Txt>
              ) : null}
              <Button3D label={phase === 'sending' ? t('در حال فرستادن…') : t('فرستادن گزارش')} disabled={!reason || phase === 'sending'} onPress={send} />
              <Button3D label={t('بی‌خیال')} variant="secondary" size={16} onPress={close} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Three dots bouncing while the coach writes. */
function Typing() {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: -5, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: false }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={[styles.bubbleRow, styles.rowOther]}>
      <View style={{ width: 32 }}>
        <CoachAvatar size={32} />
      </View>
      <View style={[styles.bubble, styles.bubbleOther, styles.typing]} accessibilityLabel={t('شمعک داره می‌نویسه')}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.lineSoft,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 12,
    gap: 10,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  intro: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.goldCard,
    borderWidth: 1.5,
    borderColor: colors.goldCardLine,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
  },
  suggestions: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 4,
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,8,15,0.7)',
  },
  sheet: {
    gap: 12,
    padding: 20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  reason: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  reasonOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  noteInput: {
    minHeight: 64,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  bubble: {
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderBottomRightRadius: 6,
  },
  bubbleMine: {
    backgroundColor: '#1D5A3C',
    borderBottomLeftRadius: 6,
  },
  typing: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text3,
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  notePill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
  },
  sendIdle: {
    opacity: 0.45,
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
});
