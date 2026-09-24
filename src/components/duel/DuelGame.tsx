import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { CoachAvatar, NameDot } from '@/components/chat/ChatBits';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { ROUNDS, type DuelResult, type DuelRounds, type RoundKey } from '@/lib/duel';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { ChartRound } from './ChartRound';
import { QuizRound } from './QuizRound';
import { TradeRound } from './TradeRound';

export const ROUND_ICON: Record<RoundKey, IconName> = { quiz: 'bulb', chart: 'target', trade: 'candles' };

export type Opponent = { name: string; bot?: boolean };

export function OpponentAvatar({ opponent, size = 44 }: { opponent: Opponent; size?: number }) {
  return opponent.bot ? <CoachAvatar size={size} /> : <NameDot name={opponent.name} size={size} />;
}

type Stage = { at: 'intro' } | { at: 'round'; index: number } | { at: 'between'; index: number };

/** Plays a duel's three rounds in order and hands back the player's result. */
export function DuelGame({ rounds, opponent, width, note, onFinish }: { rounds: DuelRounds; opponent: Opponent; width: number; note?: ReactNode; onFinish: (r: DuelResult) => void }) {
  const myName = useGame((s) => s.name);
  const [stage, setStage] = useState<Stage>({ at: 'intro' });
  const [result, setResult] = useState<Partial<DuelResult>>({});

  const done = <K extends RoundKey>(key: K, value: DuelResult[K], index: number) => {
    const next = { ...result, [key]: value };
    setResult(next);
    if (index + 1 >= ROUNDS.length) onFinish(next as DuelResult);
    else setStage({ at: 'between', index: index + 1 });
  };

  if (stage.at === 'round') {
    const key = ROUNDS[stage.index].key;
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RoundDots current={stage.index} />
        {key === 'quiz' ? (
          <QuizRound questions={rounds.quiz} onDone={(r) => done('quiz', r, stage.index)} />
        ) : key === 'chart' ? (
          <ChartRound chart={rounds.chart} onDone={(r) => done('chart', r, stage.index)} />
        ) : (
          <TradeRound trade={rounds.trade} width={width} onDone={(r) => done('trade', r, stage.index)} />
        )}
      </ScrollView>
    );
  }

  const index = stage.at === 'between' ? stage.index : 0;
  const round = ROUNDS[index];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {stage.at === 'intro' ? (
        <View style={styles.versus}>
          <View style={styles.side}>
            <NameDot name={myName} size={56} />
            <Txt w={900} size={15} numberOfLines={1}>
              {myName}
            </Txt>
          </View>
          <View style={styles.vs}>
            <Icon name="swords" size={30} color={colors.gold} strokeWidth={2.4} />
            <Txt display size={24} color={colors.gold}>
              دوئل
            </Txt>
          </View>
          <View style={styles.side}>
            <OpponentAvatar opponent={opponent} size={56} />
            <Txt w={900} size={15} numberOfLines={1}>
              {opponent.name}
            </Txt>
          </View>
        </View>
      ) : (
        <RoundDots current={index} />
      )}

      {stage.at === 'intro' ? (
        <View style={{ gap: 10 }}>
          {ROUNDS.map((r, i) => (
            <RoundCard key={r.key} index={i} title={r.title} hint={r.hint} icon={ROUND_ICON[r.key]} />
          ))}
          {note}
          <Txt w={700} size={12.5} lh={1.8} color={colors.text3} center>
            هر راند رو هر کی امتیاز بیشتری بگیره می‌بره. دو راند از سه، یعنی بردی!
          </Txt>
        </View>
      ) : (
        <View style={styles.between}>
          <View style={styles.bigIcon}>
            <Icon name={ROUND_ICON[round.key]} size={40} color={colors.gold} strokeWidth={2.2} />
          </View>
          <Txt w={800} size={14} color={colors.text3}>
            {`راند ${fa(index + 1)} از ${fa(ROUNDS.length)}`}
          </Txt>
          <Txt display size={34} color={colors.gold}>
            {round.title}
          </Txt>
          <Txt w={700} size={14.5} lh={1.8} color={colors.text2} center>
            {round.hint}
          </Txt>
        </View>
      )}
      <Button3D label={stage.at === 'intro' ? 'شروع دوئل' : 'بریم'} onPress={() => setStage({ at: 'round', index })} />
    </ScrollView>
  );
}

function RoundCard({ index, title, hint, icon }: { index: number; title: string; hint: string; icon: IconName }) {
  return (
    <View style={styles.roundCard}>
      <View style={styles.roundIcon}>
        <Icon name={icon} size={22} color={colors.gold} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w={900} size={15}>
          {`${fa(index + 1)}. ${title}`}
        </Txt>
        <Txt w={500} size={12.5} lh={1.6} color={colors.text2}>
          {hint}
        </Txt>
      </View>
    </View>
  );
}

export function RoundDots({ current }: { current: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`راند ${fa(current + 1)} از ${fa(ROUNDS.length)}`}>
      {ROUNDS.map((r, i) => (
        <View key={r.key} style={[styles.dot, i < current && styles.dotDone, i === current && styles.dotNow]}>
          <Icon name={ROUND_ICON[r.key]} size={14} color={i <= current ? colors.goldInk : colors.faint} strokeWidth={2.6} />
          <Txt w={800} size={11.5} color={i <= current ? colors.goldInk : colors.faint}>
            {r.title}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  side: {
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  vs: {
    alignItems: 'center',
    gap: 2,
  },
  roundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  roundIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  between: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 30,
  },
  bigIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.raised,
  },
  dotDone: {
    backgroundColor: colors.goldEdge,
  },
  dotNow: {
    backgroundColor: colors.gold,
  },
});
