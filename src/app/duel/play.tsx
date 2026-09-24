import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { DuelGame } from '@/components/duel/DuelGame';
import { DuelResultView } from '@/components/duel/DuelResultView';
import { InviteCard } from '@/components/duel/InviteCard';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { BOT_LEVELS, botResult, compareDuel, newSeed, type BotLevel, type DuelResult, type DuelRounds } from '@/lib/duel';
import { createDuel, duelErrorText, duelsAvailable } from '@/lib/duelApi';
import { loadRounds } from '@/lib/duelData';
import { sessionToken } from '@/lib/cloud';
import { useGame } from '@/store/game';
import { colors, MAX_WIDTH } from '@/theme';

type Phase = { at: 'play' } | { at: 'saving'; mine: DuelResult } | { at: 'invite'; mine: DuelResult; code: string } | { at: 'saveError'; mine: DuelResult; error: string } | { at: 'result'; mine: DuelResult; them: DuelResult; reward: { coins: number; xp: number } };

/** A new duel: against Shamak at a chosen level, or a friend duel you play first and then share. */
export default function DuelPlayScreen() {
  const params = useLocalSearchParams<{ mode?: string; level?: string }>();
  const friend = params.mode === 'friend';
  const level: BotLevel = BOT_LEVELS.some((l) => l.level === params.level) ? (params.level as BotLevel) : 'normal';
  const { width } = useWindowDimensions();
  const colW = Math.min(width, MAX_WIDTH);
  const finishDuel = useGame((s) => s.finishDuel);

  const [seed] = useState(newSeed);
  const [rounds, setRounds] = useState<DuelRounds | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(friend ? null : true);
  const [phase, setPhase] = useState<Phase>({ at: 'play' });
  const signedIn = !!sessionToken();

  useEffect(() => {
    let alive = true;
    loadRounds(seed)
      .then((r) => alive && setRounds(r))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, [seed]);

  useEffect(() => {
    if (!friend) return;
    let alive = true;
    duelsAvailable().then((ok) => alive && setServerOk(ok));
    return () => {
      alive = false;
    };
  }, [friend]);

  const save = (mine: DuelResult) => {
    if (!rounds) return;
    setPhase({ at: 'saving', mine });
    createDuel(rounds, mine).then((res) => setPhase(res.ok ? { at: 'invite', mine, code: res.value.code } : { at: 'saveError', mine, error: res.error }));
  };

  const finish = (mine: DuelResult) => {
    if (!rounds) return;
    if (friend) {
      save(mine);
      return;
    }
    const them = botResult(rounds, level);
    const reward = finishDuel(compareDuel(mine, them).outcome, true);
    setPhase({ at: 'result', mine, them, reward });
  };

  const opponent = friend
    ? { name: t('دوستت') }
    : { name: t('شمعک ({level})', { level: t(BOT_LEVELS.find((l) => l.level === level)?.label ?? '') }), bot: true };
  const title = friend ? t('دوئل با دوست') : t('دوئل با شمعک');

  let body;
  if (friend && !signedIn) {
    body = (
      <Message text={t('برای دوئل با دوستت باید حساب داشته باشی تا نتیجه‌ها روی سرور ذخیره بشه. تا اون موقع می‌تونی با شمعک دوئل کنی.')}>
        <Button3D label={t('ورود یا ساخت حساب')} onPress={() => router.push(useGame.getState().user ? '/account' : '/login')} />
        <Button3D variant="secondary" label={t('دوئل با شمعک')} onPress={() => router.replace('/duel/play?mode=bot')} />
      </Message>
    );
  } else if (friend && serverOk === false) {
    body = (
      <Message text={t('دوئل با دوست هنوز روی سرور فعال نشده. فعلاً با شمعک دوئل کن.')}>
        <Button3D label={t('دوئل با شمعک')} onPress={() => router.replace('/duel/play?mode=bot')} />
      </Message>
    );
  } else if (loadFailed) {
    body = (
      <Message text={t('نمودارهای دوئل آماده نشد. اینترنتت رو چک کن و دوباره امتحان کن.')}>
        <Button3D label={t('برگشت')} onPress={() => router.back()} />
      </Message>
    );
  } else if (!rounds || serverOk == null) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Txt w={800} size={14} color={colors.text2}>
          {t('در حال آماده کردن نمودارهای دوئل…')}
        </Txt>
      </View>
    );
  } else if (phase.at === 'play') {
    body = (
      <DuelGame
        rounds={rounds}
        opponent={opponent}
        width={colW}
        onFinish={finish}
        note={
          friend ? (
            <Txt w={700} size={12.5} lh={1.8} color={colors.text3} center>
              {t('اول خودت بازی می‌کنی، بعد لینکش رو برای دوستت می‌فرستی تا همین دوئل رو بازی کنه.')}
            </Txt>
          ) : undefined
        }
      />
    );
  } else if (phase.at === 'saving') {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Txt w={800} size={14} color={colors.text2}>
          {t('در حال ساختن دوئل…')}
        </Txt>
      </View>
    );
  } else if (phase.at === 'saveError') {
    const mine = phase.mine;
    body = (
      <Message text={duelErrorText(phase.error)}>
        <Button3D label={t('دوباره امتحان کن')} onPress={() => save(mine)} />
      </Message>
    );
  } else if (phase.at === 'invite') {
    body = (
      <View style={styles.pad}>
        <InviteCard code={phase.code} mine={phase.mine} fresh />
      </View>
    );
  } else {
    body = (
      <DuelResultView me={phase.mine} them={phase.them} opponent={opponent} reward={phase.reward}>
        <Button3D label={t('یه دوئل دیگه')} onPress={() => router.replace(`/duel/play?mode=bot&level=${level}`)} />
        <Button3D variant="secondary" label={t('دوئل‌ها')} onPress={() => router.replace('/duel')} />
      </DuelResultView>
    );
  }

  return (
    <Screen>
      <BackHeader title={title} caption={t('دوئل چارتون')} />
      {body}
    </Screen>
  );
}

function Message({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <View style={[styles.pad, { gap: 14 }]}>
      <Txt w={700} size={15} lh={1.9} color={colors.text2} center>
        {text}
      </Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  pad: {
    padding: 16,
  },
});
