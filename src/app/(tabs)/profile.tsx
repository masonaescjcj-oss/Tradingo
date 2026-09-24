import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button3D } from '@/components/Button3D';
import { BoltIcon, FlameIcon, Icon, type IconName } from '@/components/Icon';
import { Hexagon } from '@/components/Hexagon';
import { InstallRow } from '@/components/InstallApp';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CourseBadge } from '@/components/CourseBadge';
import { MarketPicker, marketLabel } from '@/components/MarketPicker';
import { AvatarSheet, UsernameSheet } from '@/components/ProfileSheets';
import { ProgressBar } from '@/components/ProgressBar';
import { ReminderRow } from '@/components/Reminders';
import { Screen } from '@/components/Screen';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { courseProgress, findCourse, findUnit, type Course } from '@/content';
import { t, textStart } from '@/i18n';
import { cloudSetName, useCloud } from '@/lib/cloud';
import { LEAGUES } from '@/lib/league';
import { loginText } from '@/lib/login';
import { resetTo } from '@/lib/nav';
import { profileCard, type ShareCard } from '@/lib/shareCard';
import { currentStreak, useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa, faNum } from '@/utils/format';

const GOALS = [10, 20, 30, 50];

export default function ProfileScreen() {
  const game = useGame();
  const admin = useCloud((s) => s.admin);
  const streak = currentStreak(game);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(game.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const username = game.user?.username;
  const [confirmReset, setConfirmReset] = useState(false);
  const [card, setCard] = useState<ShareCard | null>(null);

  const studied = Object.values(game.completed).filter((r) => !r.skipped).length;
  const courses = game.enrolled.map(findCourse).filter((c): c is Course => !!c);
  const trades = game.sim.history.length;
  const unitDone = (id: string) => findUnit(id)?.lessons.every((l) => game.completed[l.id]) ?? false;
  const courseDone = courses.some((c) => {
    const p = courseProgress(c, game.completed);
    return p.done === p.total;
  });

  const achievements: { title: string; icon: IconName | 'flame'; color: string; ink: string; earned: boolean }[] = [
    { title: t('۷ روز پیاپی'), icon: 'flame', color: colors.flame, ink: '#3A1C00', earned: game.bestStreak >= 7 },
    { title: t('شکارچی الگو'), icon: 'target', color: colors.bull, ink: colors.bullInk, earned: unitDone('candles') },
    { title: t('اولین معامله'), icon: 'candles', color: colors.sky, ink: colors.skyInk, earned: trades > 0 },
    { title: t('استاد ریسک'), icon: 'shield', color: colors.gold, ink: colors.goldInk, earned: unitDone('risk') },
    { title: t('کلکسیونر دوره'), icon: 'grid', color: '#A78BFA', ink: '#1E1240', earned: game.enrolled.length >= 8 },
    { title: t('دوره‌ی کامل'), icon: 'trophy', color: '#F472B6', ink: '#3D0A24', earned: courseDone },
    { title: t('صد درس'), icon: 'book', color: '#4FD1C5', ink: '#062B28', earned: studied >= 100 },
    { title: t('تمرین‌کار'), icon: 'refresh', color: '#A3E635', ink: '#1F3300', earned: game.practiceSessions >= 20 },
  ];

  const saveName = () => {
    game.setName(draftName);
    if (draftName.trim()) cloudSetName(draftName.trim());
    setEditingName(false);
  };

  return (
    <Screen bottom={false}>
      <View style={styles.header}>
        <Txt display size={32} style={{ lineHeight: 44 }}>
          {t('پروفایل')}
        </Txt>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Pressable onPress={() => setAvatarOpen(true)} accessibilityRole="button" accessibilityLabel={t('تغییر عکس پروفایل')} style={styles.avatar}>
            <Avatar id={game.avatar} name={game.name} size={80} />
            <View style={styles.avatarEdit}>
              <Icon name="pencil" size={13} color={colors.bg} strokeWidth={2.8} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            {editingName ? (
              <View style={styles.nameEdit}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  onSubmitEditing={saveName}
                  autoFocus
                  maxLength={20}
                  accessibilityLabel={t('اسمت')}
                  placeholder={t('اسمت')}
                  placeholderTextColor={colors.text3}
                  style={[styles.input, { textAlign: textStart() }]}
                />
                <Pressable onPress={saveName} accessibilityRole="button" accessibilityLabel={t('ذخیره‌ی اسم')} style={styles.smallBtn}>
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
                accessibilityLabel={t('اسم: {name}. برای ویرایش بزن', { name: game.name })}
                style={styles.nameRow}
              >
                <Txt w={900} size={22}>
                  {game.name}
                </Txt>
                <Icon name="pencil" size={16} color={colors.text3} />
              </Pressable>
            )}
            {username ? (
              <View style={styles.usernameRow}>
                <Pressable onPress={() => setUsernameOpen(true)} accessibilityRole="button" accessibilityLabel={t('آیدی: {username}. برای تغییر بزن', { username })} style={styles.usernameChip}>
                  <Txt mono w={700} size={13} color={colors.skyText} numberOfLines={1}>
                    {`@${username}`}
                  </Txt>
                  <Icon name="pencil" size={13} color={colors.text3} />
                </Pressable>
                <Txt w={700} size={12} color={colors.text3} onPress={() => router.push({ pathname: '/u/[username]', params: { username } })}>
                  {t('پروفایل عمومی')}
                </Txt>
              </View>
            ) : null}
            <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={styles.marketRow}>
              <View style={styles.marketChip}>
                <Txt w={800} size={12} color={colors.skyText}>
                  {t('بازار شبیه‌ساز: {market}', { market: t(marketLabel(game.market).title) })}
                </Txt>
              </View>
              <Txt w={700} size={12} color={colors.text3}>
                {t('تغییر')}
              </Txt>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => router.push('/account')} accessibilityRole="button" style={styles.accountRow}>
          <Icon name={game.user ? 'shield' : 'user'} size={22} color={game.user ? colors.bull : colors.skyText} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={800} size={14}>
              {game.user ? t('حساب کاربری') : t('ساخت حساب یا ورود')}
            </Txt>
            {game.user ? (
              // Mono text reads left to right, so an email or a number's groups don't flip in a Persian (RTL) row.
              <Txt mono size={12} color={colors.text3} numberOfLines={1} style={{ alignSelf: 'flex-start' }}>
                {loginText(game.user.login)}
              </Txt>
            ) : (
              <Txt w={500} size={12} color={colors.text3} numberOfLines={1}>
                {t('پیشرفتت رو به اسم خودت ذخیره کن؛ کد تأیید لازم نیست')}
              </Txt>
            )}
          </View>
          <Icon name="chevronNext" size={20} color={colors.text3} />
        </Pressable>

        <Pressable onPress={() => router.push('/league')} accessibilityRole="button" accessibilityLabel={t('لیگ هفتگی: لیگ {name}', { name: t(LEAGUES[game.league].name) })} style={styles.leagueCard}>
          <Hexagon size={46} color={LEAGUES[game.league].color}>
            <Txt display size={22} color={LEAGUES[game.league].ink}>
              {fa(game.league + 1)}
            </Txt>
          </Hexagon>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={900} size={16}>
              {t('لیگ {name}', { name: t(LEAGUES[game.league].name) })}
            </Txt>
            <Txt w={700} size={12.5} color={colors.text2}>
              {t('{xp} امتیاز این هفته · جدول رتبه‌ها', { xp: faNum(game.weeklyXp) })}
            </Txt>
          </View>
          <Icon name="trophy" size={24} color={colors.gold} />
          <Icon name="chevronNext" size={20} color={colors.text3} />
        </Pressable>

        <View style={styles.stats}>
          <StatCard icon={<FlameIcon size={28} />} value={fa(streak)} label={t('روز پیاپی')} />
          <StatCard icon={<BoltIcon size={28} />} value={faNum(game.xp)} label={t('کل امتیاز')} />
          <StatCard icon={<Hexagon size={26} color={LEAGUES[game.league].color} />} value={t(LEAGUES[game.league].name)} label={t('لیگ فعلی')} />
          <StatCard icon={<Icon name="book" size={28} color={colors.bull} />} value={fa(studied)} label={t('درس خونده‌شده')} />
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" style={styles.action}>
            <Icon name="bag" size={20} color={colors.gold} strokeWidth={2.4} />
            <Txt w={900} size={14}>
              {t('فروشگاه')}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setCard(profileCard({ name: game.name, xp: game.xp, streak, league: t(LEAGUES[game.league].name), lessons: studied }))}
            accessibilityRole="button"
            accessibilityLabel={t('اشتراک پیشرفتم')}
            style={styles.action}
          >
            <Icon name="share" size={20} color={colors.skyText} strokeWidth={2.4} />
            <Txt w={900} size={14}>
              {t('اشتراک پیشرفتم')}
            </Txt>
          </Pressable>
        </View>

        <View style={{ gap: 12 }}>
          <View style={styles.skillHead}>
            <Txt w={900} size={16}>
              {t('دوره‌های من')}
            </Txt>
            <Pressable onPress={() => router.push('/courses')} accessibilityRole="button" hitSlop={8}>
              <Txt w={800} size={13} color={colors.skyText}>
                {t('+ افزودن دوره')}
              </Txt>
            </Pressable>
          </View>
          {courses.map((course) => {
            const p = courseProgress(course, game.completed);
            const ratio = p.done / Math.max(1, p.total);
            return (
              <Pressable
                key={course.id}
                onPress={() => router.push(`/course/${course.id}`)}
                accessibilityRole="button"
                accessibilityLabel={t('{title}، {n} درصد', { title: course.title, n: fa(Math.round(ratio * 100)) })}
                style={styles.courseRow}
              >
                <CourseBadge course={course} size={40} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.skillHead}>
                    <Txt w={800} size={14} numberOfLines={1} style={{ flex: 1 }}>
                      {course.title}
                    </Txt>
                    <Txt w={800} size={13} color={ratio >= 1 ? colors.bull : ratio > 0 ? colors.gold : colors.text3}>
                      {t('{n}٪', { n: fa(Math.round(ratio * 100)) })}
                    </Txt>
                  </View>
                  <ProgressBar value={ratio} height={10} color={ratio >= 1 ? colors.bull : colors.gold} label={course.title} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 12 }}>
          <Txt w={900} size={16}>
            {t('دستاوردها')}
          </Txt>
          <View style={styles.badges}>
            {achievements.map((a) => (
              <View key={a.title} style={styles.badge} accessible accessibilityLabel={a.earned ? t('{title}، گرفته‌شده', { title: a.title }) : t('{title}، هنوز نه', { title: a.title })}>
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
            {t('هدف روزانه')}
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
                    {t('امتیاز')}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        {admin ? (
          <Pressable onPress={() => router.push('/admin')} accessibilityRole="button" style={styles.accountRow}>
            <Icon name="shield" size={22} color={colors.sky} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt w={800} size={14}>
                {t('پنل مدیریت')}
              </Txt>
              <Txt w={500} size={12} color={colors.text3}>
                {t('گزارش‌ها، کاربران، پیام‌ها و کلید هوش مصنوعی')}
              </Txt>
            </View>
            <Icon name="chevronNext" size={18} color={colors.text3} />
          </Pressable>
        ) : null}

        <InstallRow />

        <ReminderRow />
        <LanguageToggle />

        <Pressable
          onPress={() => game.setSound(!game.sound)}
          accessibilityRole="switch"
          accessibilityState={{ checked: game.sound }}
          accessibilityLabel={t('صدا و لرزش')}
          style={styles.accountRow}
        >
          <Icon name={game.sound ? 'volume' : 'mute'} size={22} color={game.sound ? colors.bull : colors.text3} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={800} size={14}>
              {t('صدا و لرزش')}
            </Txt>
            <Txt w={500} size={12} color={colors.text3}>
              {game.sound ? t('صدای جواب‌ها، صندوق و پایان درس روشنه') : t('خاموشه')}
            </Txt>
          </View>
          <View style={[styles.toggle, game.sound && styles.toggleOn]}>
            <View style={[styles.knob, game.sound && styles.knobOn]} />
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/about')} accessibilityRole="button" style={styles.disclaimer}>
          <Icon name="info" size={20} color={colors.text3} />
          <Txt size={13} lh={1.8} color={colors.text3} style={{ flex: 1 }}>
            {t('چارتون فقط برای آموزشه. ترید واقعی ریسک از دست دادن سرمایه داره و هیچ‌کدوم از مطالب اینجا توصیه‌ی سرمایه‌گذاری نیست.')}
          </Txt>
          <Icon name="chevronNext" size={18} color={colors.text3} />
        </Pressable>

        <Button3D label={t('پاک کردن همه‌ی پیشرفت')} variant="secondary" size={15} onPress={() => setConfirmReset(true)} />
      </ScrollView>

      <MarketPicker visible={pickerOpen} value={game.market} onChange={game.setMarket} onClose={() => setPickerOpen(false)} />
      <AvatarSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <UsernameSheet visible={usernameOpen} onClose={() => setUsernameOpen(false)} />

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Txt w={900} size={19} center>
              {t('همه‌چی پاک بشه؟')}
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {t('امتیاز، درس‌ها، سکه‌ها و حساب شبیه‌ساز از اول شروع می‌شن. این کار برگشت‌پذیر نیست.')}
            </Txt>
            <Button3D label={t('بی‌خیال')} onPress={() => setConfirmReset(false)} style={{ alignSelf: 'stretch' }} />
            <Button3D
              label={t('پاک کن')}
              variant="danger"
              size={17}
              onPress={() => {
                setConfirmReset(false);
                game.resetAll();
                resetTo('/welcome');
              }}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        </View>
      </Modal>
      <ShareSheet card={card} onClose={() => setCard(null)} />
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
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
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
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: colors.sky,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usernameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  badge: {
    width: '24%',
    alignItems: 'center',
    gap: 6,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  toggle: {
    width: 50,
    height: 30,
    padding: 3,
    borderRadius: 15,
    backgroundColor: colors.raised,
    flexDirection: 'row',
  },
  toggleOn: {
    backgroundColor: colors.bull,
    justifyContent: 'flex-end',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text3,
  },
  knobOn: {
    backgroundColor: colors.bullInk,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
