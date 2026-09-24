import { router } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { ProChart, type ProLine } from '@/components/sim/ProChart';
import { entryText } from '@/components/sim/text';
import { Row, Segment, Stepper, Toggle } from '@/components/sim/ui';
import { seedSeries, useFeedSnapshot, type Series } from '@/components/sim/useMarketFeed';
import { Txt } from '@/components/Txt';
import { t, textStart } from '@/i18n';
import { buildChart, chatErrorText, MAX_MESSAGE, messageProblem, type ChatMessage } from '@/lib/chat';
import { chatAvailable, loadRooms, sendMessage, useChat } from '@/lib/chatApi';
import { useCloud } from '@/lib/cloud';
import { formatPrice, SYMBOLS, type SymbolSpec } from '@/lib/simulator';
import { useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa } from '@/utils/format';

type Side = 'buy' | 'sell' | 'none';
type Levels = { entry: number; sl: number; tp: number };
type Position = { side: 'buy' | 'sell'; entry: number; sl?: number; tp?: number };

const TOOLS = { ma: true, ma2: false, bands: false, rsi: false, volume: false };

/** Entry at the price, stop one default stop away and target two, on the side of the trade. */
function defaultLevels(spec: SymbolSpec, price: number, side: Side): Levels {
  const dir = side === 'sell' ? -1 : 1;
  const round = (v: number) => Number(v.toFixed(spec.decimals));
  return { entry: round(price), sl: round(price - dir * spec.defaultStop), tp: round(price + dir * spec.defaultStop * 2) };
}

/**
 * Writing an analysis for a chat group, on the simulator's own chart: pick the symbol,
 * the direction, entry, stop and target (drawn on the chart as you set them) and a note.
 * From a group it posts there; from the simulator it asks which group.
 */
export function AnalysisComposer({
  visible,
  onClose,
  room,
  initialSymbol,
  levels = {},
  position,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  /** The group to post in; without it the learner picks one of theirs. */
  room?: string;
  initialSymbol?: string;
  /** The learner's own horizontal levels per symbol, drawn and shared too. */
  levels?: Record<string, number[]>;
  /** An open trade on the initial symbol, used for the first entry, stop and target. */
  position?: Position;
  onSent?: (message: ChatMessage, room: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const signedIn = useCloud((s) => s.userId != null);
  const user = useGame((s) => s.user);
  const snapshot = useFeedSnapshot((s) => s.series);
  const [seed] = useState(seedSeries);
  const rooms = useChat((s) => s.rooms).filter((r) => r.joined);

  const first = SYMBOLS.find((s) => s.id === initialSymbol) ?? SYMBOLS[0];
  const [symbolId, setSymbolId] = useState(first.id);
  const [side, setSide] = useState<Side>(position?.side ?? 'buy');
  const [values, setValues] = useState<Levels | null>(null);
  const [useSl, setUseSl] = useState(true);
  const [useTp, setUseTp] = useState(true);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const spec = SYMBOLS.find((s) => s.id === symbolId) ?? SYMBOLS[0];
  const series: Series = snapshot?.[spec.id] ?? seed[spec.id];
  const price = series.price;
  const fromPosition = position && symbolId === first.id ? { entry: position.entry, sl: position.sl, tp: position.tp } : null;
  const lv: Levels = values ?? {
    ...defaultLevels(spec, price, side),
    ...(fromPosition ? Object.fromEntries(Object.entries(fromPosition).filter(([, v]) => v != null)) : {}),
  };
  const directional = side !== 'none';
  const dir = side === 'sell' ? -1 : 1;
  const fmt = (p: number) => formatPrice(spec, p);
  const round = (v: number) => Number(v.toFixed(spec.decimals));
  const mine = levels[spec.id] ?? [];

  const check = useEffectEvent(async () => {
    const ok = await chatAvailable();
    setAvailable(ok);
    if (ok && !room) await loadRooms();
  });

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => check(), 0);
    return () => clearTimeout(timer);
  }, [visible]);

  const pickSymbol = (id: string) => {
    setSymbolId(id);
    setValues(null);
  };
  const pickSide = (next: Side) => {
    setSide(next);
    if (next !== 'none') setValues(defaultLevels(spec, lv.entry, next));
  };
  const nudge = (key: keyof Levels, by: number) => setValues({ ...lv, [key]: round(lv[key] + by * spec.step) });

  const problem =
    !directional
      ? null
      : useSl && (lv.sl - lv.entry) * dir >= 0
        ? side === 'buy'
          ? t('حد ضرر خرید باید پایین‌تر از ورود باشه.')
          : t('حد ضرر فروش باید بالاتر از ورود باشه.')
        : useTp && (lv.tp - lv.entry) * dir <= 0
          ? side === 'buy'
            ? t('حد سود خرید باید بالاتر از ورود باشه.')
            : t('حد سود فروش باید پایین‌تر از ورود باشه.')
          : null;
  const rr = directional && useSl && useTp && !problem ? Math.abs(lv.tp - lv.entry) / Math.abs(lv.entry - lv.sl) : null;

  const lines: ProLine[] = mine.map((p) => ({ price: p, label: t('سطح'), color: colors.gold, ink: colors.goldInk }));
  if (directional) {
    if (useTp) lines.push({ price: lv.tp, label: t('حد سود'), color: colors.bull, ink: colors.bullInk });
    lines.push({ price: lv.entry, label: side === 'buy' ? t('ورود خرید') : t('ورود فروش'), color: colors.text2, ink: colors.bg, solid: true });
    if (useSl) lines.push({ price: lv.sl, label: t('حد ضرر'), color: colors.bear, ink: colors.bearInk });
  }

  const target = room ?? picked ?? rooms[0]?.id ?? null;

  const close = () => {
    setSentTo(null);
    setError(null);
    onClose();
  };

  const send = async () => {
    if (!target || busy) return;
    if (problem) {
      setError(problem);
      return;
    }
    const bad = messageProblem(note, true);
    if (bad) {
      setError(chatErrorText(bad));
      return;
    }
    setBusy(true);
    setError(null);
    const chart = buildChart(spec, series.candles, {
      side: directional ? side : undefined,
      entry: directional ? lv.entry : undefined,
      sl: directional && useSl ? lv.sl : undefined,
      tp: directional && useTp ? lv.tp : undefined,
      levels: mine,
    });
    const res = await sendMessage(target, note.trim(), chart);
    setBusy(false);
    if (!res.ok) {
      setError(chatErrorText(res.error));
      return;
    }
    setNote('');
    onSent?.(res.value, target);
    if (room) close();
    else setSentTo(target);
  };

  const chartH = Math.round(Math.min(380, Math.max(240, height * 0.4)));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} supportedOrientations={['portrait', 'landscape']}>
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.top}>
          <Txt w={900} size={18} style={{ flex: 1 }}>
            {t('تحلیل جدید')}
          </Txt>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('بستن')} hitSlop={8} style={styles.close}>
            <Icon name="close" size={22} color={colors.text} strokeWidth={2.6} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.symbols}>
            {SYMBOLS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => pickSymbol(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: s.id === spec.id }}
                style={[styles.symbol, s.id === spec.id && styles.symbolOn]}
              >
                <Txt mono w={800} size={13}>
                  {s.label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>

          <ProChart
            key={spec.id}
            spec={spec}
            candles={series.candles}
            times={series.times}
            volumes={series.volumes}
            price={price}
            lines={lines}
            tools={TOOLS}
            width={width}
            height={chartH}
            title={spec.label}
          />

          <View style={styles.body}>
            {sentTo ? (
              <View style={{ gap: 12 }}>
                <Txt w={900} size={16} color={colors.bullText}>
                  {t('تحلیلت فرستاده شد!')}
                </Txt>
                <Button3D
                  label={t('دیدن توی گروه')}
                  onPress={() => {
                    close();
                    router.push(`/chat/${sentTo}`);
                  }}
                />
                <Button3D label={t('بستن')} variant="secondary" size={16} onPress={close} />
              </View>
            ) : (
              <>
                <Segment
                  label={t('جهت تحلیل')}
                  value={side}
                  onChange={pickSide}
                  options={[
                    { value: 'buy', label: t('خرید') },
                    { value: 'sell', label: t('فروش') },
                    { value: 'none', label: t('فقط نظر') },
                  ]}
                />

                {directional ? (
                  <View style={styles.levels}>
                    <Row>
                      <Txt w={800} size={14}>
                        {entryText()}
                      </Txt>
                      <Stepper label={t('قیمت ورود')} value={fmt(lv.entry)} onMinus={() => nudge('entry', -1)} onPlus={() => nudge('entry', 1)} />
                    </Row>
                    <LevelRow label={t('حد ضرر')} tone={colors.bearText} on={useSl} onToggle={() => setUseSl((v) => !v)} value={fmt(lv.sl)} onMinus={() => nudge('sl', -1)} onPlus={() => nudge('sl', 1)} />
                    <LevelRow label={t('حد سود')} tone={colors.bullText} on={useTp} onToggle={() => setUseTp((v) => !v)} value={fmt(lv.tp)} onMinus={() => nudge('tp', -1)} onPlus={() => nudge('tp', 1)} />
                    {rr != null ? (
                      <Txt w={800} size={12.5} color={colors.gold}>
                        {t('ریسک به ریوارد: ۱ به {n}', { n: fa(rr.toFixed(1)) })}
                      </Txt>
                    ) : null}
                    {problem ? (
                      <Txt w={700} size={12.5} color={colors.bearText}>
                        {problem}
                      </Txt>
                    ) : null}
                  </View>
                ) : null}

                <TextInput
                  value={note}
                  onChangeText={(v) => {
                    setNote(v);
                    if (error) setError(null);
                  }}
                  placeholder={t('تحلیلت رو بنویس: چرا این جهت؟ کجا اشتباه از آب درمیاد؟')}
                  placeholderTextColor={colors.faint}
                  multiline
                  numberOfLines={3}
                  maxLength={MAX_MESSAGE}
                  style={[styles.note, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }]}
                />

                {!room && signedIn && available ? (
                  <View style={{ gap: 8 }}>
                    <Txt w={800} size={13.5} color={colors.text2}>
                      {t('کدوم گروه؟')}
                    </Txt>
                    {rooms.length === 0 ? (
                      <Txt size={13.5} lh={1.8} color={colors.text3}>
                        {t('هنوز عضو هیچ گروهی نیستی. از تب «گفتگو» توی یه گروه عضو شو.')}
                      </Txt>
                    ) : (
                      <View style={styles.rooms}>
                        {rooms.map((r) => (
                          <Pressable
                            key={r.id}
                            onPress={() => setPicked(r.id)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: target === r.id }}
                            style={[styles.room, target === r.id && styles.roomOn]}
                          >
                            <Txt w={800} size={13} color={target === r.id ? colors.text : colors.text3}>
                              {r.title}
                            </Txt>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}

                {error ? (
                  <Txt w={700} size={13} color={colors.bearText}>
                    {error}
                  </Txt>
                ) : null}

                {available === false ? (
                  <Txt size={14} lh={1.8} color={colors.text2}>
                    {t('گفتگوها هنوز روی سرور فعال نشدن یا الان به سرور وصل نیستیم.')}
                  </Txt>
                ) : !signedIn ? (
                  <Button3D
                    label={user ? t('برای فرستادن، حسابت رو به سرور وصل کن') : t('برای فرستادن، وارد حسابت شو')}
                    size={16}
                    onPress={() => {
                      close();
                      router.push(user ? '/account' : '/login');
                    }}
                  />
                ) : (
                  <Button3D label={busy ? t('چند لحظه…') : t('فرستادن تحلیل')} variant={target ? 'primary' : 'disabled'} onPress={send} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function LevelRow({
  label,
  tone,
  on,
  onToggle,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  tone: string;
  on: boolean;
  onToggle: () => void;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <Row>
      <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} style={styles.toggle}>
        <Toggle on={on} />
        <Txt w={800} size={14} color={on ? tone : colors.text3}>
          {label}
        </Txt>
      </Pressable>
      {on ? (
        <Stepper label={label} value={value} onMinus={onMinus} onPlus={onPlus} />
      ) : (
        <Txt w={700} size={12} color={colors.text3}>
          {t('بدون {label}', { label })}
        </Txt>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  symbols: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  symbol: {
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  symbolOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  body: {
    gap: 14,
    padding: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  levels: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  note: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
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
