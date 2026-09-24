import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { CHALLENGES, evaluateChallenge, type Challenge } from '@/lib/challenges';
import { challengeCard, type ShareCard } from '@/lib/shareCard';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import type { Notice } from './text';
import { Hint } from './ui';

/** Trading challenges on the live simulator account, with progress and rewards. */
export function ChallengesView({ onNotice }: { onNotice: (n: Notice) => void }) {
  const history = useGame((s) => s.sim.history);
  const records = useGame((s) => s.simChallenges) ?? {};
  const startChallenge = useGame((s) => s.startChallenge);
  const claimChallenge = useGame((s) => s.claimChallenge);
  const name = useGame((s) => s.name);
  const [card, setCard] = useState<ShareCard | null>(null);
  const finished = CHALLENGES.filter((c) => records[c.id]?.completedAt != null).length;
  const share = (c: Challenge) => setCard(challengeCard({ name, title: t(c.title), coins: c.coins, xp: c.xp }));

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <Icon name="trophy" size={26} color={colors.gold} strokeWidth={2.2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt w={900} size={16}>
            {t('{n} از {total} چالش انجام شده', { n: fa(finished), total: fa(CHALLENGES.length), count: CHALLENGES.length })}
          </Txt>
          <Txt w={700} size={12} lh={1.7} color={colors.text2}>
            {t('هر چالش از لحظه‌ای که «شروع» رو بزنی حساب می‌شه و فقط معامله‌های بسته‌شده‌ی شبیه‌ساز زنده رو می‌شمره (نه بازپخش).')}
          </Txt>
        </View>
      </View>

      {CHALLENGES.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          status={evaluateChallenge(c, records[c.id], history)}
          started={records[c.id] != null}
          claimed={records[c.id]?.completedAt != null}
          onStart={() => startChallenge(c.id)}
          onClaim={() => {
            if (!claimChallenge(c.id)) return;
            onNotice({ text: t('چالش «{title}» انجام شد! +{coins} سکه و +{xp} امتیاز', { title: t(c.title), coins: fa(c.coins), xp: fa(c.xp) }), tone: 'gold' });
            share(c);
          }}
          onShare={() => share(c)}
        />
      ))}
      <ShareSheet card={card} onClose={() => setCard(null)} />

      <Hint>{t('چالش‌ها برای تمرین نظم و مدیریت ریسکن. توی بازار واقعی هم همین قانون‌ها (حد ضرر، ریسک کم، ریسک به ریوارد خوب) از سود سریع مهم‌ترن.')}</Hint>
    </View>
  );
}

function ChallengeCard({
  challenge: c,
  status,
  started,
  claimed,
  onStart,
  onClaim,
  onShare,
}: {
  challenge: Challenge;
  status: ReturnType<typeof evaluateChallenge>;
  started: boolean;
  claimed: boolean;
  onStart: () => void;
  onClaim: () => void;
  onShare: () => void;
}) {
  const ready = status.done && !claimed;
  return (
    <View style={[styles.card, claimed && styles.cardDone, ready && styles.cardReady]}>
      <View style={styles.titleRow}>
        <Txt w={900} size={15} style={{ flex: 1 }}>
          {t(c.title)}
        </Txt>
        <View style={styles.reward}>
          <Txt w={800} size={11.5} color={colors.gold}>
            {t('{coins} سکه، {xp} امتیاز', { coins: fa(c.coins), xp: fa(c.xp) })}
          </Txt>
        </View>
      </View>
      <Txt w={500} size={13} lh={1.8} color={colors.text2}>
        {t(c.rules)}
      </Txt>
      {started ? (
        <View style={styles.progressRow}>
          <ProgressBar value={status.progress} height={10} color={status.failed ? colors.bear : claimed || status.done ? colors.gold : colors.bull} label={t(c.title)} />
          <Txt w={800} size={12} color={status.failed ? colors.bearText : colors.text2}>
            {status.label}
          </Txt>
        </View>
      ) : null}
      {claimed ? (
        <View style={styles.doneRow}>
          <Icon name="check" size={16} color={colors.gold} strokeWidth={3} />
          <Txt w={800} size={13} color={colors.gold} style={{ flex: 1 }}>
            {t('انجام شد و جایزه‌ش رو گرفتی')}
          </Txt>
          <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel={t('اشتراک چالش {title}', { title: t(c.title) })} hitSlop={6} style={styles.share}>
            <Icon name="share" size={15} color={colors.text} strokeWidth={2.6} />
            <Txt w={800} size={12.5}>
              {t('اشتراک')}
            </Txt>
          </Pressable>
        </View>
      ) : ready ? (
        <Button3D variant="gold" label={t('دریافت جایزه')} height={42} radius={12} edge={4} size={15} onPress={onClaim} />
      ) : !started ? (
        <Button3D label={t('شروع چالش')} height={42} radius={12} edge={4} size={15} onPress={onStart} />
      ) : status.failed ? (
        <Button3D variant="danger" label={t('دوباره تلاش کن')} height={42} radius={12} edge={4} size={15} onPress={onStart} />
      ) : (
        <Button3D variant="secondary" label={t('از اول شروع کن')} height={38} radius={12} edge={3} size={13} onPress={onStart} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  card: {
    padding: 14,
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardDone: {
    borderColor: colors.goldCardLine,
    opacity: 0.85,
  },
  cardReady: {
    borderColor: colors.gold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reward: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.raised,
  },
});
