import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { REPLAY_SPEEDS, REPLAY_TOTAL, replayFinished, replayView } from '@/lib/replay';
import { findSymbol, type SymbolSpec } from '@/lib/simulator';
import { emptyAccount, summarize, type ClosedTrade } from '@/lib/trading';
import { START_BALANCE, useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

import { AccountBar } from './AccountBar';
import { ChartPanel } from './ChartPanel';
import { HistoryList } from './HistoryList';
import { OrderTicket } from './OrderTicket';
import { PositionsList } from './PositionsList';
import { eventNotice, ltr, pickNotice, placeErrorText, type Notice } from './text';
import { Card, Hint, pnlColor, Row, Segment } from './ui';

type Speed = (typeof REPLAY_SPEEDS)[number];

/**
 * Market replay: a generated history frozen at a random point. The learner reveals it
 * candle by candle (or plays it) and trades on a separate practice account.
 */
export function ReplayView({
  specs,
  chartWidth,
  onNotice,
  onInfo,
}: {
  specs: SymbolSpec[];
  chartWidth: number;
  onNotice: (n: Notice) => void;
  onInfo: () => void;
}) {
  const replay = useGame((s) => s.simReplay) ?? { session: null, account: emptyAccount(START_BALANCE) };
  const replayStart = useGame((s) => s.replayStart);
  const replayStep = useGame((s) => s.replayStep);
  const replayEnd = useGame((s) => s.replayEnd);
  const [symbolId, setSymbolId] = useState(specs[0].id);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  const { session, account } = replay;
  const spec = session ? findSymbol(session.symbol) : undefined;
  const finished = session ? replayFinished(session) : false;

  const step = (count: number) => {
    const events = replayStep(count);
    const notice = pickNotice(events);
    if (notice) onNotice(notice);
    return events;
  };

  const tick = useEffectEvent(() => {
    step(1);
    const s = useGame.getState().simReplay?.session;
    if (!s || replayFinished(s)) setPlaying(false);
  });

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => tick(), 1000 / speed);
    return () => clearInterval(t);
  }, [playing, speed]);

  const start = (symbol: string) => {
    setPlaying(false);
    replayStart(symbol, Math.floor(Math.random() * 2 ** 31));
  };

  if (!session || !spec) {
    return (
      <>
        <Card>
          <Txt w={900} size={18}>
            بازپخش بازار
          </Txt>
          <Txt size={13.5} lh={1.85} color={colors.text2}>
            یه تاریخچه‌ی قیمت ساخته می‌شه و نمودار یه جای تصادفی ازش متوقف می‌شه. آینده رو نمی‌بینی؛ کندل به کندل جلو می‌ری، تحلیل می‌کنی و معامله می‌کنی. نتیجه‌ها توی یه حساب جدا ثبت می‌شه و به موجودی شبیه‌ساز زنده کاری نداره.
          </Txt>
          <Txt w={800} size={13.5} color={colors.text2}>
            نماد رو انتخاب کن
          </Txt>
          <View style={styles.symbols}>
            {specs.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSymbolId(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: s.id === symbolId }}
                style={[styles.symbol, s.id === symbolId && styles.symbolOn]}
              >
                <Txt mono w={800} size={13}>
                  {s.label}
                </Txt>
              </Pressable>
            ))}
          </View>
          <Button3D label="شروع بازپخش" onPress={() => start(symbolId)} />
        </Card>
        <Hint>بازپخش جای خوبیه برای تمرین سفارش‌های لیمیت و استاپ و حد ضرر، بدون اینکه منتظر بازار بمونی. قیمت‌ها ساختگی‌ان ولی رفتارشون شبیه بازار واقعیه: روند، رنج و نوسان.</Hint>
        <HistoryList book="replay" history={account.history} limit={5} title="معامله‌های بازپخش" />
      </>
    );
  }

  const view = replayView(spec, session);
  const mids = { [spec.id]: view.price };
  const summary = summarize(account, mids);
  const played = session.cursor - session.start;
  const total = REPLAY_TOTAL - session.start;
  const sessionResult = summary.equity - session.startBalance;
  const onClosed = (t: ClosedTrade) => onNotice(eventNotice({ kind: 'closed', trade: t }));

  const badge = (
    <View style={styles.badge}>
      <Icon name="clock" size={12} color={colors.gold} strokeWidth={2.6} />
      <Txt w={800} size={11} color={colors.gold}>
        بازپخش
      </Txt>
    </View>
  );

  return (
    <>
      <AccountBar summary={summary} startBalance={START_BALANCE} title="ارزش حساب بازپخش" onInfo={onInfo} />

      <ChartPanel spec={spec} candles={view.candles} price={view.price} account={account} width={chartWidth} badge={badge} />

      <Card>
        <Row>
          <Txt w={800} size={13.5}>
            {`کندل ${fa(played)} از ${fa(total)}`}
          </Txt>
          <View style={styles.result}>
            <Txt w={700} size={11.5} color={colors.text2}>
              این بازپخش
            </Txt>
            <Txt mono w={800} size={13} color={pnlColor(sessionResult)}>
              {usd(sessionResult, true)}
            </Txt>
          </View>
        </Row>
        <ProgressBar value={played / total} height={10} color={colors.gold} label="پیشرفت بازپخش" />
        {finished ? (
          <>
            <Txt w={800} size={14} lh={1.8} color={colors.gold}>
              {`بازپخش تموم شد! نتیجه: ${ltr(usd(sessionResult, true))}. معامله‌های باز با آخرین قیمت بسته می‌شن.`}
            </Txt>
            <Button3D
              label="بازپخش جدید"
              onPress={() => start(spec.id)}
            />
          </>
        ) : (
          <>
            <View style={styles.controls}>
              <Button3D variant="secondary" height={44} radius={12} edge={4} style={{ flex: 1 }} onPress={() => step(1)} accessibilityLabel="یک کندل جلو">
                <Txt w={900} size={14}>
                  +۱ کندل
                </Txt>
              </Button3D>
              <Button3D variant="secondary" height={44} radius={12} edge={4} style={{ flex: 1 }} onPress={() => step(10)} accessibilityLabel="ده کندل جلو">
                <Txt w={900} size={14}>
                  +۱۰ کندل
                </Txt>
              </Button3D>
              <Button3D
                variant={playing ? 'gold' : 'primary'}
                height={44}
                radius={12}
                edge={4}
                style={{ flex: 1.2 }}
                onPress={() => setPlaying((p) => !p)}
                accessibilityLabel={playing ? 'توقف پخش' : 'پخش خودکار'}
              >
                <View style={styles.playLabel}>
                  {playing ? <PauseGlyph /> : <Icon name="play" size={16} color={colors.bullInk} strokeWidth={2.6} />}
                  <Txt w={900} size={14} color={playing ? colors.goldInk : colors.bullInk}>
                    {playing ? 'توقف' : 'پخش'}
                  </Txt>
                </View>
              </Button3D>
            </View>
            <Row>
              <Txt w={800} size={13} color={colors.text2}>
                سرعت پخش
              </Txt>
              <View style={{ width: 170 }}>
                <Segment
                  label="سرعت پخش"
                  value={speed}
                  onChange={setSpeed}
                  small
                  options={REPLAY_SPEEDS.map((s) => ({ value: s, label: `${fa(s)}×`, hint: `${fa(s)} کندل در ثانیه` }))}
                />
              </View>
            </Row>
          </>
        )}
      </Card>

      {!finished && (
        <OrderTicket
          book="replay"
          spec={spec}
          mid={view.price}
          mids={mids}
          summary={summary}
          onInfo={onInfo}
          onResult={(r) => onNotice(r.error ? { text: placeErrorText(r.error), tone: 'bear' } : r.event ? eventNotice(r.event) : { text: 'ثبت شد', tone: 'sky' })}
        />
      )}

      <PositionsList book="replay" account={account} mids={mids} onClosed={onClosed} />
      <HistoryList book="replay" history={account.history} limit={5} title="معامله‌های بازپخش" />

      <Button3D
        variant="secondary"
        label="پایان این بازپخش"
        height={44}
        size={15}
        onPress={() => {
          setPlaying(false);
          replayEnd();
        }}
      />
    </>
  );
}

function PauseGlyph() {
  return (
    <View style={styles.pause}>
      <View style={styles.pauseBar} />
      <View style={styles.pauseBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  symbols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symbol: {
    height: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  symbolOn: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 7,
    backgroundColor: colors.goldSoft,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  playLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pause: {
    flexDirection: 'row',
    gap: 3,
  },
  pauseBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.goldInk,
  },
});
