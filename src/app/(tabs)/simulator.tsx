import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { CandleChart } from '@/components/CandleChart';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import type { Candle, ChartLevel, Market } from '@/content';
import {
  applyTick,
  formatPrice,
  generateHistory,
  nextPrice,
  positionPnl,
  quote,
  symbolsFor,
  VISIBLE_CANDLES,
  type SymbolSpec,
} from '@/lib/simulator';
import { START_BALANCE, useGame, type ClosedTrade, type Position } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum, usd } from '@/utils/format';
import { useColumnWidth } from '@/utils/layout';

type Series = { candles: Candle[]; price: number; tick: number };

function initialSeries(specs: SymbolSpec[]): Record<string, Series> {
  const out: Record<string, Series> = {};
  for (const spec of specs) {
    const candles = generateHistory(spec, VISIBLE_CANDLES);
    out[spec.id] = { candles, price: candles[candles.length - 1][3], tick: 1 };
  }
  return out;
}

/** Human-readable stop distance: pips for EUR/USD, dollars otherwise. */
function distanceLabel(spec: SymbolSpec, d: number): string {
  if (spec.id === 'EURUSD') return `${fa(Math.round(d / 0.0001))} پیپ`;
  return `${faNum(d)} دلار`;
}

export default function SimulatorScreen() {
  const market = useGame((s) => s.market);
  // A new market gets a fresh set of price series.
  return <Simulator key={market} market={market} />;
}

function Simulator({ market }: { market: Market }) {
  const sim = useGame((s) => s.sim);
  const openPosition = useGame((s) => s.openPosition);
  const closePosition = useGame((s) => s.closePosition);
  const resetSim = useGame((s) => s.resetSim);
  const chartWidth = useColumnWidth() - 32 - 28;

  const specs = useMemo(() => symbolsFor(market), [market]);
  const [series, setSeries] = useState(() => initialSeries(specs));
  const [symbolId, setSymbolId] = useState(specs[0].id);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [useStops, setUseStops] = useState(true);
  const [stopMult, setStopMult] = useState(1);
  const [targetMult, setTargetMult] = useState(2);
  const [confirmReset, setConfirmReset] = useState(false);

  const spec = specs.find((s) => s.id === symbolId) ?? specs[0];
  const current = series[spec.id];

  // Live prices: one tick per second for every symbol.
  useEffect(() => {
    const t = setInterval(() => {
      setSeries((prev) => {
        const next: Record<string, Series> = {};
        for (const s of specs) {
          const cur = prev[s.id];
          if (!cur) continue;
          const price = nextPrice(s, cur.price);
          next[s.id] = { candles: applyTick(cur.candles, price, cur.tick), price, tick: cur.tick + 1 };
        }
        return { ...prev, ...next };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [specs]);

  // Close positions whose stop-loss or take-profit was reached.
  useEffect(() => {
    for (const p of sim.positions) {
      const s = specs.find((x) => x.id === p.symbol);
      const cur = s && series[s.id];
      if (!s || !cur) continue;
      const { bid, ask } = quote(s, cur.price);
      const mark = p.side === 'buy' ? bid : ask;
      const dir = p.side === 'buy' ? 1 : -1;
      const hitStop = p.sl != null && (p.side === 'buy' ? mark <= p.sl : mark >= p.sl);
      const hitTarget = p.tp != null && (p.side === 'buy' ? mark >= p.tp : mark <= p.tp);
      if (hitStop || hitTarget) {
        const exit = hitStop ? p.sl! : p.tp!;
        closePosition(p.id, exit, (exit - p.entry) * dir * p.size * s.contract, hitStop ? 'sl' : 'tp');
      }
    }
  }, [series, sim.positions, specs, closePosition]);

  const { bid, ask } = quote(spec, current.price);
  const size = spec.sizes[sizeIndex];
  const stopDist = spec.defaultStop * stopMult;
  const targetDist = spec.defaultStop * targetMult;
  const riskUsd = stopDist * size * spec.contract;
  const rewardUsd = targetDist * size * spec.contract;

  const openPnl = sim.positions.reduce((sum, p) => {
    const s = specs.find((x) => x.id === p.symbol);
    const cur = s && series[s.id];
    return s && cur ? sum + positionPnl(s, p, cur.price) : sum;
  }, 0);
  const equity = sim.balance + openPnl;
  const totalPnl = equity - START_BALANCE;

  const trade = (side: 'buy' | 'sell') => {
    const entry = side === 'buy' ? ask : bid;
    const dir = side === 'buy' ? 1 : -1;
    openPosition({
      symbol: spec.id,
      side,
      size,
      entry,
      sl: useStops ? entry - dir * stopDist : undefined,
      tp: useStops ? entry + dir * targetDist : undefined,
    });
  };

  const levels: ChartLevel[] = [];
  for (const p of sim.positions.filter((x) => x.symbol === spec.id)) {
    if (p.tp != null) levels.push({ price: p.tp, label: 'سود', value: formatPrice(spec, p.tp), color: colors.bull, ink: colors.bullInk });
    levels.push({ price: p.entry, label: 'ورود', value: formatPrice(spec, p.entry), color: colors.text2, ink: colors.bg });
    if (p.sl != null) levels.push({ price: p.sl, label: 'ضرر', value: formatPrice(spec, p.sl), color: colors.bear, ink: colors.bearInk });
  }
  levels.push({ price: current.price, value: formatPrice(spec, current.price), color: colors.sky, ink: colors.skyInk });

  const firstOpen = current.candles[0][0];
  const change = ((current.price - firstOpen) / firstOpen) * 100;
  const lastTrade = sim.history[0];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Txt display size={32} style={{ lineHeight: 44 }}>
            شبیه‌ساز
          </Txt>
          <View style={styles.virtual}>
            <Icon name="shield" size={13} color={colors.skyText} strokeWidth={2.8} />
            <Txt w={800} size={12} color={colors.skyText}>
              پول مجازی
            </Txt>
          </View>
        </View>
        <Pressable
          onPress={() => setConfirmReset(true)}
          accessibilityRole="button"
          accessibilityLabel="شروع دوباره‌ی حساب آزمایشی"
          style={styles.iconBtn}
        >
          <Icon name="refresh" size={20} color={colors.text2} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balance}>
          <View style={{ gap: 2 }}>
            <Txt w={700} size={12} color={colors.text2}>
              ارزش حساب آزمایشی
            </Txt>
            <Txt mono w={800} size={24}>
              {usd(equity)}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Txt w={700} size={12} color={colors.text2}>
              سود و زیان کل
            </Txt>
            <View style={[styles.pnlChip, { backgroundColor: totalPnl >= 0 ? 'rgba(43,212,125,0.14)' : colors.bearSoft }]}>
              <Txt mono w={800} size={15} color={totalPnl >= 0 ? colors.bull : colors.bearText}>
                {usd(totalPnl, true)}
              </Txt>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {specs.map((s) => {
            const cur = series[s.id];
            const on = s.id === spec.id;
            const ch = cur ? ((cur.price - cur.candles[0][0]) / cur.candles[0][0]) * 100 : 0;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSymbolId(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.symbol, on && styles.symbolOn]}
              >
                <Txt mono w={800} size={13}>
                  {s.label}
                </Txt>
                <Txt mono w={700} size={11} color={ch >= 0 ? colors.bull : colors.bearText}>
                  {`${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Txt mono w={800} size={15}>
              {spec.label}
            </Txt>
            <Txt mono w={800} size={15} color={change >= 0 ? colors.bull : colors.bearText}>
              {formatPrice(spec, current.price)}
            </Txt>
          </View>
          <CandleChart candles={current.candles} lines={levels} ma={8} width={chartWidth} height={200} gutter={104} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelRow}>
            <Txt w={800} size={14} color={colors.text2}>
              {`حجم (${spec.sizeUnit})`}
            </Txt>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {spec.sizes.map((s, i) => (
                <Pressable
                  key={s}
                  onPress={() => setSizeIndex(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: i === sizeIndex }}
                  style={[styles.segmentItem, i === sizeIndex && styles.segmentOn]}
                >
                  <Txt mono w={800} size={13} color={i === sizeIndex ? colors.text : colors.text3}>
                    {String(s)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setUseStops((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: useStops }}
            style={styles.panelRow}
          >
            <Txt w={800} size={14}>
              حد ضرر و حد سود
            </Txt>
            <View style={[styles.switch, useStops && styles.switchOn]}>
              {/* In a right-to-left layout "on" sits at the end (left) edge. */}
              <View style={[styles.knob, { alignSelf: useStops ? 'flex-end' : 'flex-start' }]} />
            </View>
          </Pressable>

          {useStops ? (
            <>
              <Stepper label="حد ضرر" tone={colors.bearText} value={distanceLabel(spec, stopDist)} onMinus={() => setStopMult((m) => Math.max(0.5, m - 0.5))} onPlus={() => setStopMult((m) => Math.min(5, m + 0.5))} />
              <Stepper label="حد سود" tone={colors.bullText} value={distanceLabel(spec, targetDist)} onMinus={() => setTargetMult((m) => Math.max(0.5, m - 0.5))} onPlus={() => setTargetMult((m) => Math.min(10, m + 0.5))} />
              <View style={styles.riskRow}>
                <Txt w={800} size={12} color={colors.bearText}>
                  {`ریسک: ${usd(riskUsd)}`}
                </Txt>
                <Txt w={800} size={12} color={colors.bullText}>
                  {`ریوارد: ${usd(rewardUsd)}`}
                </Txt>
                <View style={styles.rr}>
                  <Txt w={900} size={12} color={colors.gold}>
                    {`نسبت ۱ به ${fa(Number((targetMult / stopMult).toFixed(1)))}`}
                  </Txt>
                </View>
              </View>
            </>
          ) : (
            <Txt w={700} size={13} color={colors.bearText}>
              بدون حد ضرر، ضررت هیچ سقفی نداره.
            </Txt>
          )}

          <View style={styles.tradeRow}>
            <Button3D onPress={() => trade('buy')} height={60} style={{ flex: 1 }} accessibilityLabel={`خرید با قیمت ${formatPrice(spec, ask)}`}>
              <Txt w={900} size={17} color={colors.bullInk}>
                خرید
              </Txt>
              <Txt mono w={800} size={12} color="#0A4A2A">
                {formatPrice(spec, ask)}
              </Txt>
            </Button3D>
            <Button3D variant="danger" onPress={() => trade('sell')} height={60} style={{ flex: 1 }} accessibilityLabel={`فروش با قیمت ${formatPrice(spec, bid)}`}>
              <Txt w={900} size={17} color={colors.bearInk}>
                فروش
              </Txt>
              <Txt mono w={800} size={12} color="#5A0F1C">
                {formatPrice(spec, bid)}
              </Txt>
            </Button3D>
          </View>
          <Txt w={700} size={12} color={colors.text3} center>
            {`اسپرد: ${distanceLabel(spec, spec.spread)} · خرید با Ask، فروش با Bid`}
          </Txt>
        </View>

        <View style={styles.coach}>
          <Mascot mood={lastTrade?.reason === 'sl' ? 'sad' : lastTrade?.reason === 'tp' ? 'party' : 'think'} size={60} />
          <SpeechBubble style={{ flex: 1 }} background={colors.goldCard} border={colors.goldCardLine}>
            <Txt w={800} size={13.5} lh={1.8} color="#FFE3A3">
              {coachMessage(useStops, lastTrade)}
            </Txt>
          </SpeechBubble>
        </View>

        {sim.positions.length > 0 && (
          <View style={{ gap: 10 }}>
            <Txt w={900} size={16}>
              معامله‌های باز
            </Txt>
            {sim.positions.map((p) => {
              const s = specs.find((x) => x.id === p.symbol);
              const cur = s && series[s.id];
              if (!s || !cur) return null;
              const pnl = positionPnl(s, p, cur.price);
              const exitQuote = quote(s, cur.price);
              return (
                <PositionCard
                  key={p.id}
                  position={p}
                  spec={s}
                  pnl={pnl}
                  onClose={() => closePosition(p.id, p.side === 'buy' ? exitQuote.bid : exitQuote.ask, pnl, 'manual')}
                />
              );
            })}
          </View>
        )}

        {sim.history.length > 0 && (
          <View style={{ gap: 8 }}>
            <Txt w={900} size={16}>
              معامله‌های اخیر
            </Txt>
            {sim.history.slice(0, 5).map((t) => (
              <View key={t.id} style={styles.historyRow}>
                <Txt w={800} size={13} color={t.side === 'buy' ? colors.bullText : colors.bearText}>
                  {t.side === 'buy' ? 'خرید' : 'فروش'}
                </Txt>
                <Txt mono w={700} size={12} color={colors.text2}>
                  {specs.find((s) => s.id === t.symbol)?.label ?? t.symbol}
                </Txt>
                <Txt w={700} size={12} color={colors.text3} style={{ flex: 1 }}>
                  {t.reason === 'sl' ? 'حد ضرر خورد' : t.reason === 'tp' ? 'حد سود خورد' : 'بسته شد'}
                </Txt>
                <Txt mono w={800} size={13} color={t.pnl >= 0 ? colors.bull : colors.bearText}>
                  {usd(t.pnl, true)}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Txt w={900} size={19} center>
              حساب آزمایشی از اول شروع بشه؟
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {`همه‌ی معامله‌ها بسته می‌شن و موجودی به ${usd(START_BALANCE)} برمی‌گرده.`}
            </Txt>
            <Button3D
              label="شروع دوباره"
              onPress={() => {
                resetSim();
                setConfirmReset(false);
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="بی‌خیال" variant="secondary" size={17} onPress={() => setConfirmReset(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function coachMessage(useStops: boolean, last: ClosedTrade | undefined): string {
  if (!useStops) return 'بدون حد ضرر؟ یادت باشه قانون طلایی چی بود: هیچ‌وقت بدون حد ضرر وارد نشو!';
  if (last?.reason === 'sl') return 'ضرر کنترل‌شده بخشی از تریده. حد ضررت کارش رو کرد و جلوی ضرر بزرگ‌تر رو گرفت.';
  if (last?.reason === 'tp') return 'آفرین! حد سودت فعال شد. به برنامه‌ت پایبند موندی.';
  return 'اول حجم و حد ضرر و حد سود رو تنظیم کن، بعد خرید یا فروش بزن. این پول واقعی نیست؛ با خیال راحت تمرین کن.';
}

function Stepper({ label, tone, value, onMinus, onPlus }: { label: string; tone: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.panelRow}>
      <Txt w={800} size={14} color={tone}>
        {label}
      </Txt>
      <View style={styles.stepper}>
        <Pressable onPress={onMinus} accessibilityRole="button" accessibilityLabel={`کم کردن ${label}`} style={styles.stepBtn}>
          <Icon name="minus" size={18} color={colors.text} strokeWidth={3} />
        </Pressable>
        <Txt w={900} size={14} center style={{ minWidth: 84 }}>
          {value}
        </Txt>
        <Pressable onPress={onPlus} accessibilityRole="button" accessibilityLabel={`زیاد کردن ${label}`} style={styles.stepBtn}>
          <Icon name="plus" size={18} color={colors.text} strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

function PositionCard({ position: p, spec, pnl, onClose }: { position: Position; spec: SymbolSpec; pnl: number; onClose: () => void }) {
  return (
    <View style={[styles.position, { borderColor: pnl >= 0 ? colors.bullSheetLine : colors.bearSheetLine, backgroundColor: pnl >= 0 ? '#10251B' : '#22121A' }]}>
      <View style={styles.panelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.sideChip, { backgroundColor: p.side === 'buy' ? colors.bull : colors.bear }]}>
            <Txt w={900} size={12} color={p.side === 'buy' ? colors.bullInk : colors.bearInk}>
              {p.side === 'buy' ? 'خرید' : 'فروش'}
            </Txt>
          </View>
          <Txt mono w={800} size={13}>
            {`${spec.label} · ${p.size}`}
          </Txt>
        </View>
        <Txt mono w={800} size={17} color={pnl >= 0 ? colors.bull : colors.bearText}>
          {usd(pnl, true)}
        </Txt>
      </View>
      <View style={styles.levels}>
        <Level label="ورود" value={formatPrice(spec, p.entry)} />
        <Level label="حد ضرر" value={p.sl != null ? formatPrice(spec, p.sl) : '—'} color={colors.bearText} />
        <Level label="حد سود" value={p.tp != null ? formatPrice(spec, p.tp) : '—'} color={colors.bullText} />
      </View>
      <Button3D label="بستن معامله" variant="secondary" height={40} radius={12} edge={4} size={14} onPress={onClose} />
    </View>
  );
}

function Level({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Txt w={700} size={11} color={colors.text2}>
        {label}
      </Txt>
      <Txt mono w={800} size={12} color={color}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  virtual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(90,176,255,0.5)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    paddingBottom: 32,
  },
  balance: {
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pnlChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  symbol: {
    height: 50,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  symbolOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  chartCard: {
    padding: 12,
    gap: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panel: {
    padding: 14,
    gap: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  panelRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  segment: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  segmentItem: {
    minWidth: 56,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: colors.raised,
  },
  switch: {
    width: 50,
    height: 30,
    padding: 3,
    borderRadius: 15,
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  switchOn: {
    backgroundColor: colors.bull,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  rr: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  tradeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  position: {
    padding: 12,
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
  },
  sideChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levels: {
    flexDirection: 'row',
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
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
