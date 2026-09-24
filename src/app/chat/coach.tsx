import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { CoachAvatar } from '@/components/chat/ChatBits';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { midsOf, useFeedSnapshot } from '@/components/sim/useMarketFeed';
import { Txt } from '@/components/Txt';
import { cleanReply, COACH_SUGGESTIONS, coachContext, coachErrorText, type CoachTurn } from '@/lib/coach';
import { addTurn, askCoach, clearCoach, useCoach } from '@/lib/coachApi';
import { messageTime } from '@/lib/chat';
import { useCloud } from '@/lib/cloud';
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
  const [composerH, setComposerH] = useState(70);
  const scroll = useRef<ScrollView>(null);

  const bubbleW = Math.min(Math.min(width, MAX_WIDTH) * 0.84, 420);

  useEffect(() => {
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  }, [turns.length, thinking]);

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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="برگشت" hitSlop={8} style={styles.headerBtn}>
          <Icon name="chevronBack" size={24} color={colors.text} strokeWidth={2.6} />
        </Pressable>
        <CoachAvatar size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt w={900} size={16}>
            شمعک
          </Txt>
          <Txt w={700} size={12} color={colors.bullText} numberOfLines={1}>
            {thinking ? 'داره می‌نویسه…' : 'دستیار هوش مصنوعی تریدینگو'}
          </Txt>
        </View>
        {turns.length > 0 ? (
          <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="گزینه‌های گفتگو" hitSlop={8} style={styles.headerBtn}>
            <Icon name="list" size={22} color={colors.text2} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={[styles.list, { paddingBottom: composerH + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Icon name="bulb" size={16} color={colors.gold} strokeWidth={2.4} />
          <Txt w={700} size={12} lh={1.7} color={colors.text2} style={{ flex: 1 }}>
            شمعک دوره‌ها و جایی که هستی، اشتباه‌های درس‌ها، و پوزیشن‌ها، سفارش‌ها و معامله‌های شبیه‌سازت رو می‌بینه. ممکنه اشتباه کنه؛ جواب‌هاش آموزشیه و توصیه‌ی سرمایه‌گذاری نیست.
          </Txt>
        </View>

        {turns.length === 0 ? (
          <View style={styles.empty}>
            <Mascot mood="happy" size={110} />
            <Txt w={900} size={18} center>
              سلام! من شمعکم.
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              هر سؤالی درباره‌ی ترید، درس‌هات یا معامله‌های شبیه‌سازت داری بپرس. مثلاً:
            </Txt>
            <View style={styles.suggestions}>
              {COACH_SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => (signedIn ? ask(s) : setText(s))} accessibilityRole="button" style={styles.suggestion}>
                  <Txt w={800} size={13.5} color={colors.text}>
                    {s}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {turns.map((t, i) => (
          <Bubble key={t.id} turn={t} grouped={i > 0 && turns[i - 1].role === t.role} width={bubbleW} />
        ))}
        {thinking ? <Typing /> : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]} onLayout={(e) => setComposerH(e.nativeEvent.layout.height)} pointerEvents="box-none">
        {error || remaining != null ? (
          <Pressable onPress={() => setError(null)} style={styles.notePill}>
            <Txt w={700} size={12.5} color={error ? colors.gold : colors.text3}>
              {error ?? `${fa(remaining ?? 0)} پیام دیگه برای امروز`}
            </Txt>
          </Pressable>
        ) : null}
        {!signedIn ? (
          <Button3D label={user ? 'برای گفتگو با شمعک، حسابت رو به سرور وصل کن' : 'برای گفتگو با شمعک، وارد حسابت شو'} size={15} height={48} onPress={() => router.push(user ? '/account' : '/login')} />
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="از شمعک بپرس…"
              placeholderTextColor={colors.faint}
              maxLength={MAX_QUESTION}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => ask(text)}
              editable={!thinking}
              style={styles.input}
            />
            <Pressable
              onPress={() => ask(text)}
              disabled={thinking || !text.trim()}
              accessibilityRole="button"
              accessibilityLabel="ارسال"
              style={[styles.send, (thinking || !text.trim()) && styles.sendIdle]}
            >
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="send" size={20} color={colors.bullInk} strokeWidth={2.6} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.dialog}>
            <Txt w={900} size={17} center>
              گفتگو با شمعک
            </Txt>
            <Txt size={13.5} lh={1.8} color={colors.text2} center>
              گفتگو فقط روی همین دستگاه ذخیره می‌شه.
            </Txt>
            <Button3D
              label="پاک کردن گفتگو"
              variant="danger"
              size={16}
              onPress={() => {
                clearCoach();
                setMenu(false);
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={() => setMenu(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Bubble({ turn: t, grouped, width }: { turn: CoachTurn; grouped: boolean; width: number }) {
  const mine = t.role === 'user';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther, grouped && { marginTop: -6 }]}>
      {!mine ? <View style={{ width: 32 }}>{!grouped ? <CoachAvatar size={32} /> : null}</View> : null}
      <View style={[styles.bubble, { maxWidth: width }, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Txt w={500} size={14.5} lh={1.8} selectable>
          {t.text}
        </Txt>
        <Txt w={500} size={10.5} color={mine ? 'rgba(241,244,249,0.65)' : colors.text3} style={{ alignSelf: 'flex-end' }}>
          {messageTime(new Date(t.at).toISOString())}
        </Txt>
      </View>
    </View>
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
      <View style={[styles.bubble, styles.bubbleOther, styles.typing]} accessibilityLabel="شمعک داره می‌نویسه">
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
    textAlign: 'right',
    writingDirection: 'rtl',
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
