import { StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { summarize, type Account, type ClosedTrade } from '@/lib/trading';
import { START_BALANCE, useGame } from '@/store/game';
import { colors } from '@/theme';

import { AccountBar } from './AccountBar';
import { HistoryList } from './HistoryList';
import { PositionsList } from './PositionsList';
import { eventNotice, type Notice } from './text';
import { Hint } from './ui';

/**
 * The practice account, like MetaTrader's Trade and History tabs: balance and margin,
 * open positions and pending orders, then closed trades.
 */
export function TradesView({ mids, onNotice, onInfo }: { mids: Record<string, number>; onNotice: (n: Notice) => void; onInfo: () => void }) {
  const sim = useGame((s) => s.sim);
  const orders = useGame((s) => s.simOrders) ?? [];
  const account: Account = { ...sim, orders };
  const summary = summarize(account, mids);
  const lastTrade = sim.history[0];
  const idle = sim.positions.length === 0 && orders.length === 0;

  const onClosed = (t: ClosedTrade) => onNotice(eventNotice({ kind: 'closed', trade: t }));

  return (
    <>
      <AccountBar summary={summary} startBalance={START_BALANCE} title="ارزش حساب آزمایشی" onInfo={onInfo} />
      {idle ? <Hint>معامله یا سفارش بازی نداری. از تب «نمودار» با دکمه‌های خرید و فروش یا فرم سفارش، یه معامله باز کن.</Hint> : null}
      <PositionsList book="live" account={account} mids={mids} onClosed={onClosed} />
      {/* The coach talks about the last trade or the margin, so it waits for the first trade. */}
      {lastTrade || !idle ? (
        <View style={styles.coach}>
          <Mascot mood={lastTrade?.reason === 'sl' || lastTrade?.reason === 'liquidation' ? 'sad' : lastTrade?.reason === 'tp' ? 'party' : 'think'} size={60} />
          <SpeechBubble style={{ flex: 1 }} background={colors.goldCard} border={colors.goldCardLine}>
            <Txt w={800} size={13.5} lh={1.8} color="#FFE3A3">
              {coachMessage(lastTrade, summary.marginLevel)}
            </Txt>
          </SpeechBubble>
        </View>
      ) : null}
      <HistoryList book="live" history={sim.history} limit={20} title="تاریخچه" />
    </>
  );
}

function coachMessage(last: ClosedTrade | undefined, marginLevel: number | null): string {
  if (marginLevel != null && marginLevel < 200) return 'سطح مارجینت پایینه! یعنی ضرر معامله‌های بازت داره به مارجینشون نزدیک می‌شه. اهرم و حجمت رو چک کن.';
  if (last?.reason === 'liquidation') return 'لیکوئید شدی! اهرم بالا یعنی فاصله‌ی کم تا لیکوئید. با حد ضرر و اهرم کمتر، این اتفاق نمی‌افته.';
  if (last?.reason === 'sl') return 'ضرر کنترل‌شده بخشی از تریده. حد ضررت کارش رو کرد و جلوی ضرر بزرگ‌تر رو گرفت.';
  if (last?.reason === 'tp') return 'آفرین! حد سودت فعال شد. به برنامه‌ت پایبند موندی.';
  return 'اول نوع سفارش، اهرم، حجم و حد ضرر و سود رو تنظیم کن، بعد خرید یا فروش بزن. این پول واقعی نیست؛ با خیال راحت تمرین کن.';
}

const styles = StyleSheet.create({
  coach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
