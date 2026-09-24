import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { NameDot } from '@/components/chat/ChatBits';
import { Confetti } from '@/components/Confetti';
import { BoltIcon, CoinIcon, Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { compareDuel, ROUNDS, type DuelOutcome, type DuelResult, type RoundKey } from '@/lib/duel';
import { duelCard, type ShareCard } from '@/lib/shareCard';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

import { OpponentAvatar, ROUND_ICON, type Opponent } from './DuelGame';

const HEADLINE: Record<DuelOutcome, string> = { win: 'بردی!', loss: 'این بار باختی', tie: 'مساوی!' };

function scoreText(r: DuelResult, key: RoundKey): string {
  return key === 'trade' ? usd(r.trade.pnl, true) : key === 'quiz' ? fa(r.quiz.points) : fa(r.chart.points);
}

/** Both players' rounds side by side, who won each, the verdict and the reward. */
export function DuelResultView({
  me,
  them,
  opponent,
  reward,
  children,
}: {
  me: DuelResult;
  them: DuelResult;
  opponent: Opponent;
  reward?: { coins: number; xp: number } | null;
  children?: ReactNode;
}) {
  const myName = useGame((s) => s.name);
  const [card, setCard] = useState<ShareCard | null>(null);
  const c = compareDuel(me, them);
  const color = c.outcome === 'win' ? colors.gold : c.outcome === 'tie' ? colors.sky : colors.bearText;

  const share = () =>
    setCard(duelCard({ name: myName, opponent: opponent.name, outcome: c.outcome, mine: c.mine, theirs: c.theirs, quiz: me.quiz.points, chart: me.chart.points, pnl: me.trade.pnl }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Mascot mood={c.outcome === 'win' ? 'party' : c.outcome === 'tie' ? 'happy' : 'sad'} size={110} />
        <Txt display size={40} color={color} style={{ lineHeight: 54 }}>
          {HEADLINE[c.outcome]}
        </Txt>
        <View style={styles.score}>
          <View style={styles.player}>
            <NameDot name={myName} size={40} />
            <Txt w={800} size={13} numberOfLines={1}>
              {myName}
            </Txt>
          </View>
          {/* Left to right, so each number sits on its player's side (you're on the right). */}
          <Txt mono w={900} size={32} color={color}>
            {`${fa(c.theirs)} - ${fa(c.mine)}`}
          </Txt>
          <View style={styles.player}>
            <OpponentAvatar opponent={opponent} size={40} />
            <Txt w={800} size={13} numberOfLines={1}>
              {opponent.name}
            </Txt>
          </View>
        </View>
      </View>

      <View style={styles.table}>
        {ROUNDS.map((r) => {
          const o = c.rounds[r.key];
          return (
            <View key={r.key} style={styles.row}>
              <Txt mono w={800} size={14} color={o === 'win' ? colors.bullText : colors.text2} style={styles.cell}>
                {scoreText(me, r.key)}
              </Txt>
              <View style={styles.roundName}>
                <Icon name={ROUND_ICON[r.key]} size={16} color={colors.gold} strokeWidth={2.4} />
                <Txt w={800} size={12.5} color={colors.text2}>
                  {r.title}
                </Txt>
                <View style={[styles.badge, { backgroundColor: o === 'win' ? colors.bull : o === 'loss' ? colors.bear : colors.raised }]}>
                  <Txt w={900} size={10.5} color={o === 'win' ? colors.bullInk : o === 'loss' ? colors.bearInk : colors.text2}>
                    {o === 'win' ? 'تو' : o === 'loss' ? 'حریف' : 'مساوی'}
                  </Txt>
                </View>
              </View>
              <Txt mono w={800} size={14} color={o === 'loss' ? colors.bullText : colors.text2} style={styles.cell}>
                {scoreText(them, r.key)}
              </Txt>
            </View>
          );
        })}
        {c.mine === c.theirs && c.outcome !== 'tie' ? (
          <Txt w={700} size={12} color={colors.text3} center>
            راندها مساوی بود؛ سود معامله تعیین‌کننده شد.
          </Txt>
        ) : null}
      </View>

      {reward ? (
        <View style={styles.reward}>
          {reward.coins > 0 ? (
            <>
              <CoinIcon size={22} />
              <Txt w={900} size={15} color={colors.gold}>
                {`+${fa(reward.coins)} سکه`}
              </Txt>
              <BoltIcon size={20} />
              <Txt w={900} size={15} color={colors.gold}>
                {`+${fa(reward.xp)} امتیاز`}
              </Txt>
            </>
          ) : (
            <Txt w={700} size={13} color={colors.text3}>
              جایزه‌ی دوئل‌های امروز تموم شده؛ فردا دوباره جایزه داره.
            </Txt>
          )}
        </View>
      ) : null}

      <Button3D variant="secondary" onPress={share} accessibilityLabel="اشتراک نتیجه‌ی دوئل">
        <View style={styles.shareRow}>
          <Icon name="share" size={18} color={colors.text} strokeWidth={2.6} />
          <Txt w={900} size={16}>
            اشتراک نتیجه
          </Txt>
        </View>
      </Button3D>
      {children}
      {c.outcome === 'win' ? <Confetti /> : null}
      <ShareSheet card={card} onClose={() => setCard(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  top: {
    alignItems: 'center',
    gap: 6,
  },
  score: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  player: {
    width: 96,
    alignItems: 'center',
    gap: 4,
  },
  table: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cell: {
    width: 86,
    textAlign: 'center',
  },
  roundName: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
