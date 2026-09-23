import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { AnalysisChart, NameDot, TopicAvatar } from '@/components/chat/ChatBits';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { chatErrorText, MAX_MESSAGE, mergeMessages, messageProblem, messageTime, type ChatMessage } from '@/lib/chat';
import { deleteMessage, fetchMessages, joinRoom, leaveRoom, loadRooms, reportMessage, sendMessage, useChat } from '@/lib/chatApi';
import { useCloud } from '@/lib/cloud';
import { useGame } from '@/store/game';
import { colors, fonts, MAX_WIDTH } from '@/theme';
import { fa } from '@/utils/format';

/** New messages are fetched this often while the room is open. */
const POLL_MS = 3000;

/** One group: its messages, newest at the bottom, and the composer. */
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const room = useChat((s) => s.rooms.find((r) => r.id === id));
  const signedIn = useCloud((s) => s.userId != null);
  const user = useGame((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [olderDone, setOlderDone] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState(false);
  const [chartTip, setChartTip] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const nearBottom = useRef(true);

  const colW = Math.min(width, MAX_WIDTH);
  const bubbleW = Math.min(colW * 0.82, 400);

  const poll = useEffectEvent(async () => {
    const last = messages.length ? messages[messages.length - 1].id : undefined;
    const res = await fetchMessages(id, last != null ? { after: last } : {});
    setLoading(false);
    if (!res.ok) return;
    if (last == null && res.value.length < 50) setOlderDone(true);
    if (res.value.length) setMessages((prev) => mergeMessages(prev, res.value));
  });

  // The room's details (members, joined) come from the room list; refresh it on the way in.
  useEffect(() => {
    loadRooms();
  }, [id]);

  useEffect(() => {
    if (!focused) return;
    const first = setTimeout(() => poll(), 0);
    const t = setInterval(() => poll(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [focused, id]);

  // Follow new messages when the reader is at the bottom.
  useEffect(() => {
    if (nearBottom.current) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  const loadOlder = async () => {
    if (!messages.length) return;
    const res = await fetchMessages(id, { before: messages[0].id });
    if (!res.ok) return;
    if (res.value.length < 50) setOlderDone(true);
    nearBottom.current = false;
    setMessages((prev) => mergeMessages(prev, res.value));
  };

  const send = async () => {
    const problem = messageProblem(text);
    if (problem) {
      if (problem !== 'empty') setError(chatErrorText(problem));
      return;
    }
    setSending(true);
    setError(null);
    const res = await sendMessage(id, text.trim());
    setSending(false);
    if (!res.ok) {
      setError(chatErrorText(res.error));
      return;
    }
    setText('');
    nearBottom.current = true;
    setMessages((prev) => mergeMessages(prev, [res.value]));
  };

  const join = async () => {
    const err = await joinRoom(id);
    if (err) setError(chatErrorText(err));
  };

  const leave = async () => {
    setMenu(false);
    const err = await leaveRoom(id);
    if (err) setError(chatErrorText(err));
    else router.back();
  };

  const act = async (kind: 'report' | 'delete') => {
    const m = action;
    setAction(null);
    if (!m) return;
    const err = kind === 'report' ? await reportMessage(m.id) : await deleteMessage(m.id);
    if (err) setError(chatErrorText(err));
    else if (kind === 'delete') setMessages((prev) => prev.filter((x) => x.id !== m.id));
    else setError('گزارشت ثبت شد؛ ممنون. پیام‌هایی که چند نفر گزارش کنن پنهان می‌شن.');
  };

  const joined = room?.joined ?? false;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="برگشت" hitSlop={8} style={styles.headerBtn}>
          <Icon name="chevronBack" size={24} color={colors.text} strokeWidth={2.6} />
        </Pressable>
        {room ? <TopicAvatar topic={room.topic} size={40} /> : null}
        <View style={{ flex: 1, gap: 1 }}>
          <Txt w={900} size={16} numberOfLines={1}>
            {room?.title ?? 'گروه'}
          </Txt>
          <Txt w={700} size={12} color={colors.text3} numberOfLines={1}>
            {room ? `${fa(room.member_count)} عضو${room.about ? ` · ${room.about}` : ''}` : ''}
          </Txt>
        </View>
        {joined ? (
          <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="گزینه‌های گروه" hitSlop={8} style={styles.headerBtn}>
            <Icon name="list" size={22} color={colors.text2} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.list}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 120;
        }}
        scrollEventThrottle={100}
      >
        <View style={styles.rules}>
          <Icon name="shield" size={16} color={colors.gold} strokeWidth={2.4} />
          <Txt w={700} size={12} lh={1.7} color={colors.text2} style={{ flex: 1 }}>
            با احترام حرف بزن. لینک، آیدی، شماره تماس و تبلیغ سیگنال ممنوعه. هیچ پیامی توصیه‌ی سرمایه‌گذاری نیست. برای پیام نامناسب، نگهش دار و گزارش بده.
          </Txt>
        </View>
        {!olderDone && messages.length > 0 ? (
          <Pressable onPress={loadOlder} accessibilityRole="button" style={styles.older}>
            <Txt w={800} size={13} color={colors.skyText}>
              پیام‌های قبلی
            </Txt>
          </Pressable>
        ) : null}
        {loading ? (
          <Txt w={700} size={13} color={colors.text3} center>
            در حال گرفتن پیام‌ها…
          </Txt>
        ) : messages.length === 0 ? (
          <Txt w={700} size={14} lh={1.8} color={colors.text3} center>
            هنوز پیامی نیست. اولین نفر باش!
          </Txt>
        ) : null}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.author_name === m.author_name && prev.mine === m.mine;
          return <Bubble key={m.id} message={m} grouped={!!grouped} width={bubbleW} onLongPress={() => setAction(m)} />;
        })}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {error ? (
          <Pressable onPress={() => setError(null)}>
            <Txt w={700} size={12.5} color={colors.gold} style={{ paddingHorizontal: 4 }}>
              {error}
            </Txt>
          </Pressable>
        ) : null}
        {!signedIn ? (
          <Button3D label={user ? 'برای نوشتن، حسابت رو به سرور وصل کن' : 'برای نوشتن، وارد حسابت شو'} size={15} height={48} onPress={() => router.push(user ? '/account' : '/login')} />
        ) : !joined ? (
          <Button3D label="عضو گروه شو" size={16} height={48} onPress={join} />
        ) : (
          <View style={styles.inputRow}>
            <Pressable onPress={() => setChartTip(true)} accessibilityRole="button" accessibilityLabel="فرستادن نمودار" hitSlop={6} style={styles.attach}>
              <Icon name="candles" size={20} color={colors.text2} strokeWidth={2.4} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (error) setError(null);
              }}
              placeholder="پیام…"
              placeholderTextColor={colors.faint}
              multiline
              maxLength={MAX_MESSAGE}
              style={styles.input}
            />
            <Pressable
              onPress={send}
              disabled={sending || !text.trim()}
              accessibilityRole="button"
              accessibilityLabel="ارسال"
              style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]}
            >
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="send" size={20} color={colors.bullInk} strokeWidth={2.6} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      <Modal visible={action != null} transparent animationType="fade" onRequestClose={() => setAction(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAction(null)}>
          <View style={styles.dialog}>
            <Txt w={800} size={14} color={colors.text2} numberOfLines={3} center>
              {action ? `${action.author_name}: ${action.body || 'تحلیل با نمودار'}` : ''}
            </Txt>
            {action && !action.mine ? <Button3D label="گزارش پیام" variant="danger" size={16} onPress={() => act('report')} style={{ alignSelf: 'stretch' }} /> : null}
            {action && (action.mine || room?.owned) ? <Button3D label="حذف پیام" variant="danger" size={16} onPress={() => act('delete')} style={{ alignSelf: 'stretch' }} /> : null}
            <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={() => setAction(null)} style={{ alignSelf: 'stretch' }} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.dialog}>
            <Txt w={900} size={17} center>
              {room?.title ?? ''}
            </Txt>
            <Button3D label="ترک گروه" variant="danger" size={16} onPress={leave} style={{ alignSelf: 'stretch' }} />
            <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={() => setMenu(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={chartTip} transparent animationType="fade" onRequestClose={() => setChartTip(false)}>
        <Pressable style={styles.backdrop} onPress={() => setChartTip(false)}>
          <View style={styles.dialog}>
            <Icon name="candles" size={34} color={colors.bull} strokeWidth={2.4} />
            <Txt w={800} size={15} lh={1.8} center>
              برای گذاشتن نمودار و تحلیل، توی شبیه‌ساز زیر نمودار روی «اشتراک تحلیل» بزن؛ نمودار با سطح‌ها و ورود، حد ضرر و حد سودت فرستاده می‌شه.
            </Txt>
            <Button3D
              label="برو به شبیه‌ساز"
              size={16}
              onPress={() => {
                setChartTip(false);
                router.navigate('/(tabs)/simulator');
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="باشه" variant="secondary" size={16} onPress={() => setChartTip(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message: m, grouped, width, onLongPress }: { message: ChatMessage; grouped: boolean; width: number; onLongPress: () => void }) {
  const chartW = width - 24;
  return (
    <View style={[styles.bubbleRow, m.mine ? styles.rowMine : styles.rowOther, grouped && { marginTop: -6 }]}>
      {!m.mine ? <View style={{ width: 32 }}>{!grouped ? <NameDot name={m.author_name} /> : null}</View> : null}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityHint="برای گزارش یا حذف، نگه دار"
        style={[styles.bubble, { maxWidth: width }, m.mine ? styles.bubbleMine : styles.bubbleOther, m.chart && { width }]}
      >
        {!m.mine && !grouped ? (
          <Txt w={900} size={12.5} color={colors.skyText}>
            {m.author_name}
          </Txt>
        ) : null}
        {m.chart ? <AnalysisChart chart={m.chart} width={chartW} /> : null}
        {m.body ? (
          <Txt w={500} size={14.5} lh={1.75} selectable>
            {m.body}
          </Txt>
        ) : null}
        <Txt w={500} size={10.5} color={m.mine ? 'rgba(241,244,249,0.6)' : colors.text3} style={{ alignSelf: 'flex-end' }}>
          {messageTime(m.created_at)}
        </Txt>
      </Pressable>
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
  rules: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.goldCard,
    borderWidth: 1.5,
    borderColor: colors.goldCardLine,
  },
  older: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  // Right-to-left: others on the right (start), the learner's own messages on the left.
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
  composer: {
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.lineSoft,
    backgroundColor: colors.bg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  attach: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
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
