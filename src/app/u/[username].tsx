import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { CourseBadge } from '@/components/CourseBadge';
import { Hexagon } from '@/components/Hexagon';
import { BoltIcon, FlameIcon, Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { courseProgress, findCourse } from '@/content';
import { dateLocale, t } from '@/i18n';
import { useCloud } from '@/lib/cloud';
import { LEAGUES } from '@/lib/league';
import { blockUser, fetchProfile, profileErrorText, type PublicProfile } from '@/lib/profileApi';
import { colors } from '@/theme';
import { fa, faNum } from '@/utils/format';

/** A learner's public profile, opened from the chat: picture, name, @ID and what they've learned. */
export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<{ profile?: PublicProfile; error?: string }>({});

  useEffect(() => {
    let live = true;
    fetchProfile(String(username ?? '')).then((res) => {
      if (!live) return;
      setState(res.ok ? { profile: res.value } : { error: profileErrorText(res.error) });
    });
    return () => {
      live = false;
    };
  }, [username]);

  const p = state.profile;
  return (
    <Screen>
      <BackHeader caption={t('چارتون')} title={t('پروفایل')} />
      {!p ? (
        <View style={styles.center}>
          <Mascot mood="think" size={100} />
          <Txt w={700} size={15} lh={1.9} color={colors.text2} center>
            {state.error ?? t('چند لحظه…')}
          </Txt>
        </View>
      ) : (
        <ProfileBody profile={p} onChange={(next) => setState({ profile: next })} />
      )}
    </Screen>
  );
}

function ProfileBody({ profile: p, onChange }: { profile: PublicProfile; onChange: (p: PublicProfile) => void }) {
  const signedIn = useCloud((s) => s.userId != null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Block or unblock this person: their messages stop (or start again) showing in your groups.
  const toggleBlock = async () => {
    setBusy(true);
    const res = await blockUser(p.username, !p.blocked);
    setBusy(false);
    if (!res.ok) return setNote(profileErrorText(res.error));
    onChange({ ...p, blocked: res.value.blocked });
    setNote(
      res.value.blocked
        ? t('بلاک شد؛ پیام‌هاش دیگه توی گروه‌ها برات نشون داده نمی‌شه.')
        : t('از بلاک دراومد؛ پیام‌هاش دوباره نشون داده می‌شه.'),
    );
  };

  const completed = Object.fromEntries(p.completed.map((id) => [id, true]));
  const courses = p.enrolled.flatMap((id) => findCourse(id) ?? []);
  const league = LEAGUES[p.league];
  const joined = p.createdAt ? new Date(p.createdAt).toLocaleDateString(dateLocale(), { year: 'numeric', month: 'long' }) : '';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Avatar id={p.avatar} name={p.name} size={104} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt w={900} size={24} center>
            {p.name}
          </Txt>
          <Txt mono w={700} size={14} color={colors.skyText}>
            {`@${p.username}`}
          </Txt>
          {joined ? (
            <Txt size={12.5} color={colors.text3} center>
              {t('عضو چارتون از {date}', { date: joined })}
            </Txt>
          ) : null}
        </View>
      </View>

      <View style={styles.stats}>
        <Stat icon={<FlameIcon size={26} />} value={fa(p.streak)} label={t('روز پیاپی')} />
        <Stat icon={<BoltIcon size={26} />} value={faNum(p.xp)} label={t('کل امتیاز')} />
        <Stat icon={<Icon name="book" size={26} color={colors.bull} />} value={fa(p.completed.length)} label={t('درس تموم‌شده')} />
        <Stat icon={<Hexagon size={24} color={league.color} />} value={t(league.name)} label={t('لیگ')} />
        <Stat icon={<Icon name="trophy" size={26} color={colors.gold} />} value={fa(p.bestStreak)} label={t('بهترین رکورد')} />
        <Stat icon={<Icon name="swords" size={26} color={colors.sky} />} value={fa(p.duelWins)} label={t('برد دوئل')} />
      </View>

      {courses.length ? (
        <View style={styles.card}>
          <Txt w={900} size={16}>
            {t('دوره‌ها')}
          </Txt>
          {courses.map((c) => {
            const prog = courseProgress(c, completed);
            const finished = prog.total > 0 && prog.done === prog.total;
            return (
              <View key={c.id} style={styles.course}>
                <CourseBadge course={c} size={40} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.courseTitle}>
                    <Txt w={800} size={14} numberOfLines={1} style={{ flex: 1 }}>
                      {c.title}
                    </Txt>
                    <Txt w={800} size={12} color={finished ? colors.bullText : colors.text3}>
                      {finished ? t('تموم شده') : t('{done} از {total}', { done: fa(prog.done), total: fa(prog.total) })}
                    </Txt>
                  </View>
                  <ProgressBar value={prog.total ? prog.done / prog.total : 0} height={8} color={finished ? colors.gold : colors.bull} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {p.mine ? <Button3D label={t('ویرایش پروفایل')} variant="secondary" size={16} onPress={() => router.push('/(tabs)/profile')} /> : null}
      {!p.mine && signedIn ? (
        <Button3D
          label={busy ? t('چند لحظه…') : p.blocked ? t('رفع بلاک {name}', { name: p.name }) : t('بلاک کردن {name}', { name: p.name })}
          variant={p.blocked ? 'secondary' : 'danger'}
          size={15}
          disabled={busy}
          onPress={toggleBlock}
        />
      ) : null}
      {note ? (
        <Txt w={700} size={13} lh={1.8} color={colors.text2} center>
          {note}
        </Txt>
      ) : null}
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <View style={{ flexShrink: 1 }}>
        <Txt w={900} size={18} numberOfLines={1}>
          {value}
        </Txt>
        <Txt size={12} color={colors.text2} numberOfLines={1}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  identity: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexBasis: '46%',
    flexGrow: 1,
    height: 66,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  card: {
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  course: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courseTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
