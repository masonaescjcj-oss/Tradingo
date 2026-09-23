import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { BoltIcon, FlameIcon, Icon, type IconName } from '@/components/Icon';
import { Hexagon } from '@/components/Hexagon';
import { MarketPicker, marketLabel } from '@/components/MarketPicker';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { unitsFor } from '@/content';
import { LEAGUES } from '@/lib/league';
import { currentStreak, useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa, faNum } from '@/utils/format';

const GOALS = [10, 20, 30, 50];

export default function ProfileScreen() {
  const game = useGame();
  const streak = currentStreak(game);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(game.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const studied = Object.values(game.completed).filter((r) => !r.skipped).length;
  const units = unitsFor(game.market);
  const trades = game.sim.history.length;
  const unitDone = (id: string) => units.find((u) => u.id === id)?.lessons.every((l) => game.completed[l.id]) ?? false;

  const achievements: { title: string; icon: IconName | 'flame'; color: string; ink: string; earned: boolean }[] = [
    { title: '۷ روز پیاپی', icon: 'flame', color: colors.flame, ink: '#3A1C00', earned: game.bestStreak >= 7 },
    { title: 'شکارچی الگو', icon: 'target', color: colors.bull, ink: colors.bullInk, earned: unitDone('candles') },
    { title: 'اولین معامله', icon: 'candles', color: colors.sky, ink: colors.skyInk, earned: trades > 0 },
    { title: 'استاد ریسک', icon: 'shield', color: colors.gold, ink: colors.goldInk, earned: unitDone('risk') },
  ];

  const saveName = () => {
    game.setName(draftName);
    setEditingName(false);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Txt display size={32} style={{ lineHeight: 44 }}>
          پروفایل
        </Txt>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Txt display size={40} color={colors.skyText}>
              {game.name.charAt(0)}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {editingName ? (
              <View style={styles.nameEdit}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  onSubmitEditing={saveName}
                  autoFocus
                  maxLength={20}
                  accessibilityLabel="اسمت"
                  placeholder="اسمت"
                  placeholderTextColor={colors.text3}
                  style={styles.input}
                />
                <Pressable onPress={saveName} accessibilityRole="button" accessibilityLabel="ذخیره‌ی اسم" style={styles.smallBtn}>
                  <Icon name="check" size={20} color={colors.bullInk} strokeWidth={3.2} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setDraftName(game.name);
                  setEditingName(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`اسم: ${game.name}. برای ویرایش بزن`}
                style={styles.nameRow}
              >
                <Txt w={900} size={22}>
                  {game.name}
                </Txt>
                <Icon name="pencil" size={16} color={colors.text3} />
              </Pressable>
            )}
            <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={styles.marketRow}>
              <View style={styles.marketChip}>
                <Txt w={800} size={12} color={colors.skyText}>
                  {`بازار: ${marketLabel(game.market).title}`}
                </Txt>
              </View>
              <Txt w={700} size={12} color={colors.text3}>
                تغییر
              </Txt>
            </Pressable>
          </View>
        </View>

        <View style={styles.stats}>
          <StatCard icon={<FlameIcon size={28} />} value={fa(streak)} label="روز پیاپی" />
          <StatCard icon={<BoltIcon size={28} />} value={faNum(game.xp)} label="کل امتیاز" />
          <StatCard icon={<Hexagon size={26} color={LEAGUES[game.league].color} />} value={LEAGUES[game.league].name} label="لیگ فعلی" />
          <StatCard icon={<Icon name="book" size={28} color={colors.bull} />} value={fa(studied)} label="درس خونده‌شده" />
        </View>

        <View style={{ gap: 12 }}>
          <Txt w={900} size={16}>
            مهارت‌های تو
          </Txt>
          {units.map((unit) => {
            const done = unit.lessons.filter((l) => game.completed[l.id]).length;
            const ratio = done / unit.lessons.length;
            return (
              <View key={unit.id} style={{ gap: 6 }}>
                <View style={styles.skillHead}>
                  <Txt w={800} size={14}>
                    {unit.title}
                  </Txt>
                  <Txt w={800} size={13} color={ratio >= 1 ? colors.bull : ratio > 0 ? colors.gold : colors.text3}>
                    {`${fa(Math.round(ratio * 100))}٪`}
                  </Txt>
                </View>
                <ProgressBar value={ratio} height={10} color={ratio >= 1 ? colors.bull : colors.gold} label={unit.title} />
              </View>
            );
          })}
        </View>

        <View style={{ gap: 12 }}>
          <Txt w={900} size={16}>
            دستاوردها
          </Txt>
          <View style={styles.badges}>
            {achievements.map((a) => (
              <View key={a.title} style={styles.badge} accessible accessibilityLabel={`${a.title}${a.earned ? '، گرفته‌شده' : '، هنوز نه'}`}>
                <Hexagon size={58} color={a.earned ? a.color : colors.raised}>
                  {a.icon === 'flame' ? (
                    <FlameIcon size={26} color={a.earned ? a.ink : colors.muted} inner={a.earned ? a.color : colors.raised} />
                  ) : (
                    <Icon name={a.icon} size={26} color={a.earned ? a.ink : colors.muted} strokeWidth={2.6} />
                  )}
                </Hexagon>
                <Txt w={800} size={11} lh={1.5} center color={a.earned ? colors.text : colors.muted}>
                  {a.title}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Txt w={900} size={16}>
            هدف روزانه
          </Txt>
          <View style={styles.goals} accessibilityRole="radiogroup">
            {GOALS.map((g) => {
              const on = game.dailyGoal === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => game.setDailyGoal(g)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.goal, on && styles.goalOn]}
                >
                  <Txt w={900} size={16} color={on ? colors.skyText : colors.text}>
                    {fa(g)}
                  </Txt>
                  <Txt w={700} size={11} color={colors.text3}>
                    امتیاز
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Icon name="info" size={20} color={colors.text3} />
          <Txt size={13} lh={1.8} color={colors.text3} style={{ flex: 1 }}>
            تریدینگو فقط برای آموزشه. ترید واقعی ریسک از دست دادن سرمایه داره و هیچ‌کدوم از مطالب اینجا توصیه‌ی سرمایه‌گذاری نیست.
          </Txt>
        </View>

        <Button3D label="پاک کردن همه‌ی پیشرفت" variant="secondary" size={15} onPress={() => setConfirmReset(true)} />
      </ScrollView>

      <MarketPicker visible={pickerOpen} value={game.market} onChange={game.setMarket} onClose={() => setPickerOpen(false)} />

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Txt w={900} size={19} center>
              همه‌چی پاک بشه؟
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              امتیاز، درس‌ها، سکه‌ها و حساب شبیه‌ساز از اول شروع می‌شن. این کار برگشت‌پذیر نیست.
            </Txt>
            <Button3D label="بی‌خیال" onPress={() => setConfirmReset(false)} style={{ alignSelf: 'stretch' }} />
            <Button3D
              label="پاک کن"
              variant="danger"
              size={17}
              onPress={() => {
                setConfirmReset(false);
                game.resetAll();
                router.replace('/welcome');
              }}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <View>
        <Txt w={900} size={20}>
          {value}
        </Txt>
        <Txt size={12} color={colors.text2}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 20,
    paddingBottom: 32,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.sky,
    backgroundColor: '#1B3A5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  nameEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.extra,
    fontSize: 16,
    textAlign: 'right',
  },
  smallBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
  },
  marketChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(90,176,255,0.14)',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexBasis: '46%',
    flexGrow: 1,
    height: 70,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  skillHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  goals: {
    flexDirection: 'row',
    gap: 10,
  },
  goal: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  goalOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceDeep,
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
