import { router } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Segment } from '@/components/sim/ui';
import { Txt } from '@/components/Txt';
import type { Candle } from '@/content/types';
import { buildChart, chatErrorText, MAX_MESSAGE, messageProblem } from '@/lib/chat';
import { chatAvailable, loadRooms, sendMessage, useChat } from '@/lib/chatApi';
import { useCloud } from '@/lib/cloud';
import type { SymbolSpec } from '@/lib/simulator';
import { useGame } from '@/store/game';
import { colors, fonts, MAX_WIDTH } from '@/theme';

import { AnalysisChart } from './ChatBits';

type Side = 'buy' | 'sell' | 'none';

/**
 * Posts the simulator chart to a chat group as an analysis: the latest candles, the
 * learner's levels, a direction, and the entry/stop/target of their open trade if any.
 */
export function ShareAnalysis({
  visible,
  onClose,
  spec,
  candles,
  levels,
  position,
}: {
  visible: boolean;
  onClose: () => void;
  spec: SymbolSpec;
  candles: Candle[];
  levels: number[];
  position?: { side: 'buy' | 'sell'; entry: number; sl?: number; tp?: number };
}) {
  const { width } = useWindowDimensions();
  const signedIn = useCloud((s) => s.userId != null);
  const user = useGame((s) => s.user);
  const rooms = useChat((s) => s.rooms).filter((r) => r.joined);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [side, setSide] = useState<Side>(position?.side ?? 'none');
  const [note, setNote] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const open = useEffectEvent(async () => {
    const ok = await chatAvailable();
    setAvailable(ok);
    if (ok) await loadRooms();
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => open(), 0);
    return () => clearTimeout(t);
  }, [visible]);

  const chosen = room ?? rooms[0]?.id ?? null;
  const chart = buildChart(spec, candles, {
    side: side === 'none' ? undefined : side,
    entry: position?.entry,
    sl: position?.sl,
    tp: position?.tp,
    levels,
  });

  const close = () => {
    setSentTo(null);
    setError(null);
    onClose();
  };

  const send = async () => {
    if (!chosen) return;
    const problem = messageProblem(note, true);
    if (problem) {
      setError(chatErrorText(problem));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await sendMessage(chosen, note.trim(), chart);
    setBusy(false);
    if (!res.ok) {
      setError(chatErrorText(res.error));
      return;
    }
    setNote('');
    setSentTo(chosen);
  };

  const sheetW = Math.min(width, MAX_WIDTH);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { width: sheetW }]}>
          <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
            <Txt w={900} size={19}>
              اشتراک تحلیل در گفتگو
            </Txt>
            <AnalysisChart chart={chart} width={sheetW - 40} height={140} />

            {sentTo ? (
              <>
                <Txt w={800} size={15} lh={1.8} color={colors.bullText}>
                  تحلیلت فرستاده شد!
                </Txt>
                <Button3D
                  label="دیدن توی گروه"
                  onPress={() => {
                    close();
                    router.push(`/chat/${sentTo}`);
                  }}
                />
                <Button3D label="بستن" variant="secondary" size={16} onPress={close} />
              </>
            ) : available === false ? (
              <>
                <Txt size={14} lh={1.8} color={colors.text2}>
                  گفتگوها هنوز روی سرور فعال نشدن یا الان به سرور وصل نیستیم.
                </Txt>
                <Button3D label="بستن" variant="secondary" size={16} onPress={close} />
              </>
            ) : !signedIn ? (
              <>
                <Txt size={14} lh={1.8} color={colors.text2}>
                  برای فرستادن تحلیل توی گروه‌ها وارد حسابت شو.
                </Txt>
                <Button3D
                  label={user ? 'اتصال حساب به سرور' : 'ورود یا ثبت‌نام'}
                  onPress={() => {
                    close();
                    router.push(user ? '/account' : '/login');
                  }}
                />
                <Button3D label="بستن" variant="secondary" size={16} onPress={close} />
              </>
            ) : (
              <>
                <Segment
                  label="جهت تحلیل"
                  value={side}
                  onChange={setSide}
                  options={[
                    { value: 'buy', label: 'خرید' },
                    { value: 'sell', label: 'فروش' },
                    { value: 'none', label: 'فقط نظر' },
                  ]}
                />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="تحلیلت رو بنویس: چرا این جهت؟ کجا اشتباه از آب درمیاد؟"
                  placeholderTextColor={colors.faint}
                  multiline
                  maxLength={MAX_MESSAGE}
                  style={styles.input}
                />
                <Txt w={800} size={13.5} color={colors.text2}>
                  کدوم گروه؟
                </Txt>
                {rooms.length === 0 ? (
                  <Txt size={13.5} lh={1.8} color={colors.text3}>
                    هنوز عضو هیچ گروهی نیستی. از تب «گفتگو» توی یه گروه عضو شو.
                  </Txt>
                ) : (
                  <View style={styles.rooms}>
                    {rooms.map((r) => (
                      <Pressable
                        key={r.id}
                        onPress={() => setRoom(r.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosen === r.id }}
                        style={[styles.room, chosen === r.id && styles.roomOn]}
                      >
                        <Txt w={800} size={13} color={chosen === r.id ? colors.text : colors.text3}>
                          {r.title}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                )}
                {error ? (
                  <Txt w={700} size={13} color={colors.bearText}>
                    {error}
                  </Txt>
                ) : null}
                <Button3D label={busy ? 'چند لحظه…' : 'فرستادن'} variant={chosen ? 'primary' : 'disabled'} onPress={chosen && !busy ? send : undefined} />
                <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={close} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(5,8,15,0.7)',
  },
  sheet: {
    maxHeight: '92%',
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    textAlignVertical: 'top',
  },
  rooms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  room: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  roomOn: {
    borderColor: colors.bull,
    backgroundColor: colors.bullSoft,
  },
});
