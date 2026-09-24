import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { CoachAvatar, NameDot } from '@/components/chat/ChatBits';
import { ROUND_ICON } from '@/components/duel/DuelGame';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { sessionToken } from '@/lib/cloud';
import { BOT_LEVELS, compareDuel, ROUNDS, type BotLevel } from '@/lib/duel';
import { duelsAvailable, myDuels, normalizeCode, type DuelSummary } from '@/lib/duelApi';
import { DUEL_REWARDS_PER_DAY, useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { dayKey } from '@/utils/date';
import { fa } from '@/utils/format';

/** Duels: against Shamak, or a friend by invite link or code, and the list of your friend duels. */
export default function DuelHubScreen() {
  const stats = useGame((s) => s.duels);
  const [level, setLevel] = useState<BotLevel>('normal');
  const [code, setCode] = useState('');
  const [list, setList] = useState<DuelSummary[] | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const signedIn = !!sessionToken();
  const rewardsLeft = Math.max(0, DUEL_REWARDS_PER_DAY - (stats?.rewardDay === dayKey() ? stats.rewarded : 0));

  // Refreshes the friend duels whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      duelsAvailable().then((ok) => {
        if (!alive) return;
        setOnline(ok);
        if (ok && sessionToken()) myDuels().then((res) => alive && res.ok && setList(res.value));
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const joinCode = normalizeCode(code);

  return (
    <Screen>
      <BackHeader title="دوئل چارتون" caption="سه راند، سه مهارت" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <Icon name="swords" size={34} color={colors.gold} strokeWidth={2.2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt display size={26} color={colors.gold}>
                دوئل
              </Txt>
              <Txt w={700} size={13} color={colors.text2}>
                {stats?.played ? `${fa(stats.wins)} برد · ${fa(stats.losses)} باخت · ${fa(stats.ties)} مساوی` : 'اولین دوئلت رو بزن!'}
              </Txt>
            </View>
          </View>
          {ROUNDS.map((r, i) => (
            <View key={r.key} style={styles.round}>
              <View style={styles.roundIcon}>
                <Icon name={ROUND_ICON[r.key]} size={18} color={colors.gold} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt w={900} size={14}>
                  {`${fa(i + 1)}. ${r.title}`}
                </Txt>
                <Txt w={500} size={12} lh={1.6} color={colors.text2}>
                  {r.hint}
                </Txt>
              </View>
            </View>
          ))}
          <Txt w={700} size={11.5} color={colors.text3}>
            {rewardsLeft ? `امروز ${fa(rewardsLeft)} دوئل دیگه سکه و امتیاز جایزه داره.` : 'جایزه‌ی دوئل‌های امروز تموم شده؛ ولی بازی‌کردن آزاده.'}
          </Txt>
        </View>

        <Section title="با شمعک">
          <View style={styles.card}>
            <View style={styles.row}>
              <CoachAvatar size={44} />
              <Txt w={700} size={13} lh={1.7} color={colors.text2} style={{ flex: 1 }}>
                هر وقت کسی نبود، شمعک پایه‌ی دوئله. سطحش رو انتخاب کن.
              </Txt>
            </View>
            <View style={styles.levels}>
              {BOT_LEVELS.map((l) => {
                const on = l.level === level;
                return (
                  <Pressable
                    key={l.level}
                    onPress={() => setLevel(l.level)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${l.label}: ${l.hint}`}
                    style={[styles.level, on && styles.levelOn]}
                  >
                    <Txt w={900} size={14} color={on ? colors.skyInk : colors.text}>
                      {l.label}
                    </Txt>
                    <Txt w={700} size={10.5} color={on ? colors.skyInk : colors.text3}>
                      {l.hint}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button3D label="دوئل با شمعک" onPress={() => router.push(`/duel/play?mode=bot&level=${level}`)} />
          </View>
        </Section>

        <Section title="با دوستت">
          <View style={styles.card}>
            <Txt w={700} size={13} lh={1.7} color={colors.text2}>
              اول خودت بازی کن، بعد لینک دوئل رو برای دوستت بفرست. اون همون راندها رو بازی می‌کنه و نتیجه برای هر دوتون میاد.
            </Txt>
            {online === false ? (
              <Txt w={700} size={12.5} color={colors.gold}>
                دوئل با دوست هنوز روی سرور فعال نشده.
              </Txt>
            ) : null}
            <Button3D variant="gold" label="ساختن دوئل و دعوت دوست" onPress={() => router.push('/duel/play?mode=friend')} disabled={online === false} />
            <View style={styles.join}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(normalizeCode(t))}
                placeholder="کد دوئل دوستت"
                placeholderTextColor={colors.faint}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                accessibilityLabel="کد دوئل"
                style={[styles.input, !code && styles.inputEmpty]}
                onSubmitEditing={() => joinCode.length === 6 && router.push(`/duel/${joinCode}`)}
              />
              <Button3D label="برو" height={46} radius={12} edge={4} size={15} disabled={joinCode.length !== 6} onPress={() => router.push(`/duel/${joinCode}`)} />
            </View>
          </View>
        </Section>

        {signedIn && online ? (
          <Section title="دوئل‌های من">
            {list == null ? (
              <Txt w={700} size={13} color={colors.text3}>
                در حال گرفتن دوئل‌ها…
              </Txt>
            ) : list.length === 0 ? (
              <Txt w={700} size={13} color={colors.text3}>
                هنوز دوئلی با دوستات نداشتی.
              </Txt>
            ) : (
              list.map((d) => <DuelRow key={d.code} duel={d} />)
            )}
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function DuelRow({ duel }: { duel: DuelSummary }) {
  const result = duel.status === 'done' && duel.mine && duel.theirs ? compareDuel(duel.mine, duel.theirs) : null;
  const tone = result ? (result.outcome === 'win' ? colors.bull : result.outcome === 'loss' ? colors.bear : colors.sky) : colors.line;
  const label =
    duel.status === 'expired'
      ? 'منقضی شد'
      : result
        ? `${result.outcome === 'win' ? 'بردی' : result.outcome === 'loss' ? 'باختی' : 'مساوی'}، ${fa(result.mine)} به ${fa(result.theirs)}`
        : duel.role === 'creator'
          ? 'منتظر حریف'
          : 'در جریان';
  return (
    <Pressable
      onPress={() => router.push(`/duel/${duel.code}`)}
      accessibilityRole="button"
      accessibilityLabel={`دوئل ${duel.code}: ${label}`}
      style={({ pressed }) => [styles.duel, { borderColor: tone }, duel.status === 'expired' && { opacity: 0.55 }, pressed && { opacity: 0.8 }]}
    >
      {duel.otherName ? <NameDot name={duel.otherName} size={40} /> : <View style={styles.waiting}><Icon name="clock" size={20} color={colors.text3} /></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w={900} size={14.5} numberOfLines={1}>
          {duel.otherName ?? 'هنوز کسی بازی نکرده'}
        </Txt>
        <Txt w={700} size={12.5} color={result ? tone : colors.text3}>
          {label}
        </Txt>
      </View>
      <Txt mono w={800} size={12} color={colors.text3}>
        {duel.code}
      </Txt>
      <Icon name="chevronBack" size={18} color={colors.text3} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt w={900} size={16} color={colors.text2}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  hero: {
    gap: 10,
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  round: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levels: {
    flexDirection: 'row',
    gap: 8,
  },
  level: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  levelOn: {
    borderColor: colors.sky,
    backgroundColor: colors.sky,
  },
  join: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
    color: colors.text,
    fontFamily: fonts.monoHeavy,
    fontSize: 17,
    letterSpacing: 3,
    textAlign: 'center',
    outlineWidth: 0,
  },
  inputEmpty: {
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0,
  },
  duel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  waiting: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
});
