import { router, useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { CoachRow, RoomRow } from '@/components/chat/ChatBits';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Hint } from '@/components/sim/ui';
import { Txt } from '@/components/Txt';
import { t, textStart } from '@/i18n';
import { CHAT_TOPICS, chatErrorText, hasBlockedContent, type ChatTopic } from '@/lib/chat';
import { chatAvailable, createRoom, joinRoom, loadRooms, useChat } from '@/lib/chatApi';
import { useCoach } from '@/lib/coachApi';
import { useCloud } from '@/lib/cloud';
import { cloudEnabled } from '@/lib/supabase';
import { useKeyboardOverlap } from '@/lib/keyboard';
import { useGame } from '@/store/game';
import { colors, fonts } from '@/theme';

/** Room list refresh while the tab is open, for unread counts and new groups. */
const ROOMS_POLL_MS = 15_000;

/** Community groups: the learner's own groups, then the others to join. */
export default function ChatScreen() {
  const focused = useIsFocused();
  const rooms = useChat((s) => s.rooms);
  const loaded = useChat((s) => s.loaded);
  const error = useChat((s) => s.error);
  const signedIn = useCloud((s) => s.userId != null);
  const user = useGame((s) => s.user);
  const [available, setAvailable] = useState<boolean | null>(cloudEnabled ? null : false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastCoach = useCoach((s) => s.turns.at(-1));

  const refresh = async () => {
    if (!(await chatAvailable())) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    await loadRooms();
  };
  const tick = useEffectEvent(() => {
    refresh();
  });

  useEffect(() => {
    if (!focused) return;
    const first = setTimeout(() => tick(), 0);
    const timer = setInterval(() => tick(), ROOMS_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [focused, signedIn]);

  const signIn = () => router.push(user ? '/account' : '/login');
  const mine = rooms.filter((r) => r.joined);
  const others = rooms.filter((r) => !r.joined);

  const join = async (id: string) => {
    if (!signedIn) {
      setNotice(t('برای عضویت توی گروه‌ها وارد حسابت شو.'));
      return;
    }
    const err = await joinRoom(id);
    if (err) setNotice(chatErrorText(err));
  };

  return (
    <Screen bottom={false}>
      <View style={styles.header}>
        <Txt display size={32} style={{ lineHeight: 44 }}>
          {t('گفتگو')}
        </Txt>
        {available ? (
          <Pressable
            onPress={() => (signedIn ? setCreating(true) : setNotice(t('برای ساختن گروه وارد حسابت شو.')))}
            accessibilityRole="button"
            style={styles.newGroup}
          >
            <Icon name="plus" size={16} color={colors.bullText} strokeWidth={3} />
            <Txt w={900} size={13.5} color={colors.bullText}>
              {t('گروه جدید')}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
            tintColor={colors.text3}
          />
        }
      >
        <CoachRow preview={lastCoach?.text ?? null} at={lastCoach?.at ?? null} onPress={() => router.push('/chat/coach')} />

        {available === false ? (
          <View style={styles.empty}>
            <Mascot mood="think" size={110} />
            <Txt w={900} size={18} center>
              {t('گفتگوها به‌زودی')}
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {cloudEnabled
                ? t('گروه‌های گفتگو هنوز روی سرور فعال نشدن یا الان به سرور وصل نیستیم. کمی بعد دوباره سر بزن.')
                : t('این نسخه به سرور وصل نیست؛ گفتگوها توی نسخه‌ی آنلاین فعالن.')}
            </Txt>
          </View>
        ) : null}

        {available && !signedIn ? (
          <View style={styles.signIn}>
            <Txt w={800} size={14} lh={1.8} color={colors.text2}>
              {t('گروه‌ها رو می‌تونی بخونی. برای عضویت، پیام دادن و گذاشتن تحلیل، وارد حسابت شو.')}
            </Txt>
            <Button3D label={user ? t('اتصال حساب به سرور') : t('ورود یا ثبت‌نام')} size={16} height={48} onPress={signIn} />
          </View>
        ) : null}

        {available && loaded && error && rooms.length === 0 ? <Hint tone="bear">{chatErrorText(error)}</Hint> : null}

        {mine.length > 0 ? (
          <View style={styles.section}>
            <Txt w={900} size={16}>
              {t('گروه‌های من')}
            </Txt>
            {mine.map((r) => (
              <RoomRow key={r.id} room={r} onPress={() => router.push(`/chat/${r.id}`)} />
            ))}
          </View>
        ) : null}

        {others.length > 0 ? (
          <View style={styles.section}>
            <Txt w={900} size={16}>
              {mine.length > 0 ? t('گروه‌های دیگه') : t('گروه‌ها')}
            </Txt>
            {others.map((r) => (
              <RoomRow key={r.id} room={r} onPress={() => router.push(`/chat/${r.id}`)} onJoin={() => join(r.id)} />
            ))}
          </View>
        ) : null}

        {available && !loaded ? (
          <Txt w={700} size={13} color={colors.text3} center>
            {t('در حال گرفتن گروه‌ها…')}
          </Txt>
        ) : null}

        {available ? (
          <Hint>
            {t('قانون گروه‌ها: با احترام حرف بزن. لینک، آیدی، شماره تماس و تبلیغ سیگنال ممنوعه. هیچ پیامی توصیه‌ی سرمایه‌گذاری نیست؛ هر تصمیمی مسئولیتش با خودته.')}
          </Hint>
        ) : null}
      </ScrollView>

      <Modal visible={notice != null} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Txt w={800} size={15} lh={1.8} center>
              {notice ?? ''}
            </Txt>
            {!signedIn ? (
              <Button3D
                label={user ? t('اتصال حساب به سرور') : t('ورود یا ثبت‌نام')}
                size={16}
                onPress={() => {
                  setNotice(null);
                  signIn();
                }}
                style={{ alignSelf: 'stretch' }}
              />
            ) : null}
            <Button3D label={t('باشه')} variant="secondary" size={16} onPress={() => setNotice(null)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>

      <CreateRoomSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          router.push(`/chat/${id}`);
        }}
      />
    </Screen>
  );
}

function CreateRoomSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [topic, setTopic] = useState<ChatTopic>('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const name = title.trim();
    if (name.length < 3 || name.length > 40) {
      setError(t('اسم گروه باید بین ۳ تا ۴۰ حرف باشه.'));
      return;
    }
    if (hasBlockedContent(name) || hasBlockedContent(about)) {
      setError(chatErrorText('links'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createRoom(name, about.trim(), topic);
    setBusy(false);
    if (!res.ok) {
      setError(chatErrorText(res.error));
      return;
    }
    setTitle('');
    setAbout('');
    onCreated(res.value);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheetBackdrop, { paddingBottom: keyboard.overlap }]} onLayout={keyboard.onLayout}>
        {/* Modals draw under the navigation bar too; the sheet's buttons stay above it (and above the keyboard). */}
        <View style={[styles.sheet, { paddingBottom: 28 + (keyboard.overlap ? 0 : insets.bottom) }]}>
          <Txt w={900} size={19}>
            {t('گروه جدید')}
          </Txt>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('اسم گروه، مثلاً «نوسان‌گیری طلا»')}
            placeholderTextColor={colors.faint}
            maxLength={40}
            style={[styles.input, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }]}
          />
          <TextInput
            value={about}
            onChangeText={setAbout}
            placeholder={t('درباره‌ی گروه (اختیاری)')}
            placeholderTextColor={colors.faint}
            maxLength={160}
            multiline
            style={[styles.input, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }, { minHeight: 70, textAlignVertical: 'top' }]}
          />
          <Txt w={800} size={13.5} color={colors.text2}>
            {t('موضوع')}
          </Txt>
          <View style={styles.topics}>
            {CHAT_TOPICS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setTopic(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: topic === item.id }}
                style={[styles.topic, topic === item.id && styles.topicOn]}
              >
                <Txt w={800} size={13} color={topic === item.id ? colors.text : colors.text3}>
                  {t(item.label)}
                </Txt>
              </Pressable>
            ))}
          </View>
          {error ? (
            <Txt w={700} size={13} color={colors.bearText}>
              {error}
            </Txt>
          ) : null}
          <Button3D label={busy ? t('چند لحظه…') : t('ساختن گروه')} onPress={busy ? undefined : submit} />
          <Button3D label={t('بی‌خیال')} variant="secondary" size={16} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 16,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  signIn: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  section: {
    gap: 10,
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,8,15,0.7)',
  },
  sheet: {
    gap: 12,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topic: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  topicOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
});
