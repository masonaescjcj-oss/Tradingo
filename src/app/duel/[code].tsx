import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { NameDot } from '@/components/chat/ChatBits';
import { DuelGame } from '@/components/duel/DuelGame';
import { DuelResultView } from '@/components/duel/DuelResultView';
import { InviteCard } from '@/components/duel/InviteCard';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { sessionToken } from '@/lib/cloud';
import { compareDuel, type DuelResult } from '@/lib/duel';
import { duelErrorText, getDuel, normalizeCode, submitDuel, type DuelInfo } from '@/lib/duelApi';
import { useGame } from '@/store/game';
import { colors, MAX_WIDTH } from '@/theme';

type View_ =
  | { at: 'loading' }
  | { at: 'error'; error: string }
  | { at: 'info'; duel: DuelInfo }
  | { at: 'play'; duel: DuelInfo }
  | { at: 'submitting'; duel: DuelInfo; mine: DuelResult; error: string | null };

/** A friend duel by its invite code: play it, wait for the friend, or see how it went. */
export default function DuelCodeScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeCode(String(params.code ?? ''));
  const { width } = useWindowDimensions();
  const colW = Math.min(width, MAX_WIDTH);
  const finishDuel = useGame((s) => s.finishDuel);
  const [view, setView] = useState<View_>({ at: 'loading' });
  const [reward, setReward] = useState<{ coins: number; xp: number } | null>(null);
  const signedIn = !!sessionToken();

  // A finished duel pays its reward the first time either player sees the result.
  const show = (duel: DuelInfo) => {
    if (duel.status === 'done' && duel.role && duel.creatorResult && duel.opponentResult) {
      const mine = duel.role === 'creator' ? duel.creatorResult : duel.opponentResult;
      const theirs = duel.role === 'creator' ? duel.opponentResult : duel.creatorResult;
      setReward(finishDuel(compareDuel(mine, theirs).outcome, false, duel.code));
    }
    setView({ at: 'info', duel });
  };

  const loaded = useEffectEvent((duel: DuelInfo) => show(duel));

  useEffect(() => {
    let alive = true;
    getDuel(code).then((res) => {
      if (!alive) return;
      if (res.ok) loaded(res.value);
      else setView({ at: 'error', error: res.error });
    });
    return () => {
      alive = false;
    };
  }, [code]);

  const submit = (duel: DuelInfo, mine: DuelResult) => {
    setView({ at: 'submitting', duel, mine, error: null });
    submitDuel(code, mine).then((res) => {
      if (res.ok) show(res.value);
      else setView({ at: 'submitting', duel, mine, error: res.error });
    });
  };

  let body: ReactNode;
  if (view.at === 'loading') {
    body = <Center text="در حال باز کردن دوئل…" />;
  } else if (view.at === 'error') {
    body = (
      <Message text={duelErrorText(view.error)}>
        <Button3D label="دوئل‌ها" onPress={() => router.replace('/duel')} />
      </Message>
    );
  } else if (view.at === 'play' && view.duel.rounds) {
    const duel = view.duel;
    body = <DuelGame rounds={duel.rounds!} opponent={{ name: duel.creatorName }} width={colW} onFinish={(mine) => submit(duel, mine)} />;
  } else if (view.at === 'submitting') {
    const { duel, mine, error } = view;
    body = error ? (
      <Message text={duelErrorText(error)}>
        {error === 'network' || error === 'server' ? <Button3D label="دوباره امتحان کن" onPress={() => submit(duel, mine)} /> : null}
        <Button3D variant="secondary" label="دوئل‌ها" onPress={() => router.replace('/duel')} />
      </Message>
    ) : (
      <Center text="در حال ثبت نتیجه…" />
    );
  } else {
    const duel = view.duel;
    const mine = duel.role === 'creator' ? duel.creatorResult : duel.role === 'opponent' ? duel.opponentResult : null;
    const theirs = duel.role === 'creator' ? duel.opponentResult : duel.role === 'opponent' ? duel.creatorResult : null;
    if (duel.status === 'done' && mine && theirs) {
      body = (
        <DuelResultView me={mine} them={theirs} opponent={{ name: (duel.role === 'creator' ? duel.opponentName : duel.creatorName) ?? 'حریف' }} reward={reward}>
          <Button3D label="دوئل جدید با دوست" onPress={() => router.replace('/duel/play?mode=friend')} />
          <Button3D variant="secondary" label="دوئل‌ها" onPress={() => router.replace('/duel')} />
        </DuelResultView>
      );
    } else if (duel.role === 'creator' && duel.status === 'open') {
      body = (
        <View style={styles.pad}>
          <InviteCard code={duel.code} mine={duel.creatorResult} />
        </View>
      );
    } else if (duel.status === 'expired') {
      body = (
        <Message text={duelErrorText('expired')}>
          <Button3D label="دوئل‌ها" onPress={() => router.replace('/duel')} />
        </Message>
      );
    } else if (duel.status === 'open' && duel.rounds) {
      body = (
        <View style={[styles.pad, { gap: 16 }]}>
          <View style={styles.invite}>
            <NameDot name={duel.creatorName} size={64} />
            <Txt display size={28} color={colors.gold} center>
              {`${duel.creatorName} تو رو به دوئل دعوت کرده!`}
            </Txt>
            <Txt w={700} size={14} lh={1.8} color={colors.text2} center>
              سه راند: سؤال سرعتی، پیش‌بینی نمودار و معامله‌ی ۶۰ ثانیه‌ای. همون چیزی که اون بازی کرده رو تو هم بازی می‌کنی.
            </Txt>
          </View>
          {signedIn ? (
            <Button3D label="قبول و شروع" onPress={() => setView({ at: 'play', duel })} />
          ) : (
            <>
              <Txt w={700} size={13.5} lh={1.8} color={colors.text3} center>
                برای ثبت نتیجه باید وارد حسابت بشی.
              </Txt>
              <Button3D label="ورود یا ساخت حساب" onPress={() => router.push(useGame.getState().user ? '/account' : '/login')} />
            </>
          )}
        </View>
      );
    } else {
      body = (
        <Message text={duelErrorText('taken')}>
          <Button3D label="دوئل‌ها" onPress={() => router.replace('/duel')} />
        </Message>
      );
    }
  }

  return (
    <Screen>
      <BackHeader title="دوئل با دوست" caption={code ? `کد ${code}` : 'دوئل تریدینگو'} />
      {body}
    </Screen>
  );
}

function Center({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
      <Txt w={800} size={14} color={colors.text2}>
        {text}
      </Txt>
    </View>
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
  invite: {
    alignItems: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
});
