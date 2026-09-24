import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { formatPrice, formatSize, quote, type SymbolSpec } from '@/lib/simulator';
import {
  DEFAULT_LEVERAGE,
  LEVERAGES,
  liquidationMove,
  requiredMargin,
  riskSize,
  type OrderRequest,
  type OrderType,
  type PlaceError,
  type Side,
  type Summary,
  type TradeEvent,
} from '@/lib/trading';
import { useGame, type SimBook } from '@/store/game';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

import { distanceLabel, faDec, faPct, ltr, orderText } from './text';
import { Card, Hint, Row, Segment, Stepper, Toggle } from './ui';

const RISKS = [0.5, 1, 2, 3];

type SizeMode = 'fixed' | 'risk';

/**
 * Order form: market / limit / stop, leverage, size (fixed or from a risk percentage),
 * stop-loss and take-profit, with the margin and risk it implies.
 */
export function OrderTicket({
  book,
  spec,
  mid,
  mids,
  summary,
  onResult,
  onInfo,
}: {
  book: SimBook;
  spec: SymbolSpec;
  mid: number;
  mids: Record<string, number>;
  summary: Summary;
  onResult: (r: { error?: PlaceError; event?: TradeEvent }) => void;
  onInfo: () => void;
}) {
  const simPlace = useGame((s) => s.simPlace);
  const [type, setType] = useState<OrderType>('market');
  const [offsetMult, setOffsetMult] = useState(1);
  const [leverage, setLeverage] = useState<number>(DEFAULT_LEVERAGE);
  const [sizeMode, setSizeMode] = useState<SizeMode>('fixed');
  const [sizeIndex, setSizeIndex] = useState(0);
  const [riskPct, setRiskPct] = useState(1);
  const [useSl, setUseSl] = useState(true);
  const [useTp, setUseTp] = useState(true);
  const [slMult, setSlMult] = useState(1);
  const [tpMult, setTpMult] = useState(2);

  const slOn = useSl || sizeMode === 'risk';
  const slDist = spec.defaultStop * slMult;
  const tpDist = spec.defaultStop * tpMult;
  const offset = spec.defaultStop * offsetMult;
  const size = sizeMode === 'fixed' ? spec.sizes[sizeIndex] : riskSize(spec, summary.equity, riskPct, slDist);
  const margin = requiredMargin(spec, size, mid, leverage);
  const riskUsd = slDist * size * spec.contract;
  const rewardUsd = tpDist * size * spec.contract;
  const liqMove = liquidationMove(leverage);
  const stopPastLiquidation = slOn && slDist >= mid * liqMove;
  const noMargin = margin > summary.freeMargin;
  const { bid, ask } = quote(spec, mid);
  const round = (v: number) => Number(v.toFixed(spec.decimals));

  const priceFor = (side: Side) => {
    const dir = side === 'buy' ? 1 : -1;
    const base = side === 'buy' ? ask : bid;
    if (type === 'market') return base;
    return round(type === 'limit' ? base - dir * offset : base + dir * offset);
  };

  const place = (side: Side) => {
    const dir = side === 'buy' ? 1 : -1;
    const entry = priceFor(side);
    const req: OrderRequest = {
      symbol: spec.id,
      side,
      type,
      size,
      price: type === 'market' ? undefined : entry,
      sl: slOn ? round(entry - dir * slDist) : undefined,
      tp: useTp ? round(entry + dir * tpDist) : undefined,
      leverage,
    };
    onResult(simPlace(book, req, mid, mids));
  };

  return (
    <Card>
      <Row>
        <Txt w={900} size={15}>
          {t('سفارش جدید')}
        </Txt>
        <Pressable onPress={onInfo} accessibilityRole="button" accessibilityLabel={t('راهنمای نوع سفارش، اهرم و لیکوئید')} hitSlop={8} style={styles.help}>
          <Icon name="info" size={15} color={colors.skyText} strokeWidth={2.4} />
          <Txt w={800} size={12} color={colors.skyText}>
            {t('راهنما')}
          </Txt>
        </Pressable>
      </Row>

      <Segment
        label={t('نوع سفارش')}
        value={type}
        onChange={setType}
        options={[
          { value: 'market', label: t('مارکت') },
          { value: 'limit', label: t('لیمیت') },
          { value: 'stop', label: t('استاپ') },
        ]}
      />
      <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
        {type === 'market'
          ? t('همین الان با قیمت بازار وارد می‌شی: خرید با Ask، فروش با Bid.')
          : type === 'limit'
            ? t('منتظر قیمت بهتر می‌مونی: خرید پایین‌تر از قیمت فعلی، فروش بالاتر.')
            : t('وقتی قیمت شکست وارد می‌شی: خرید بالاتر از قیمت فعلی، فروش پایین‌تر.')}
      </Txt>

      {type !== 'market' && (
        <Row>
          <Txt w={800} size={13.5} color={colors.text2}>
            {t('فاصله از قیمت فعلی')}
          </Txt>
          <Stepper
            label={t('فاصله‌ی سفارش')}
            value={distanceLabel(spec, offset)}
            onMinus={() => setOffsetMult((m) => Math.max(0.25, m - 0.25))}
            onPlus={() => setOffsetMult((m) => Math.min(10, m + 0.25))}
          />
        </Row>
      )}

      <View style={{ gap: 6 }}>
        <Row>
          <Txt w={800} size={13.5} color={colors.text2}>
            {t('اهرم')}
          </Txt>
          <Txt w={700} size={11.5} color={leverage >= 20 ? colors.bearText : colors.text3}>
            {t('لیکوئید با {pct} حرکت خلاف جهت', { pct: faPct(liqMove, 2) })}
          </Txt>
        </Row>
        <Segment
          label={t('اهرم')}
          value={leverage}
          onChange={setLeverage}
          small
          options={LEVERAGES.map((l) => ({ value: l, label: `${fa(l)}×`, hint: t('اهرم {n} برابر', { n: fa(l) }) }))}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Row>
          <Txt w={800} size={13.5} color={colors.text2}>
            {t('حجم ({unit})', { unit: t(spec.sizeUnit) })}
          </Txt>
          <View style={{ width: 170 }}>
            <Segment
              label={t('روش تعیین حجم')}
              value={sizeMode}
              onChange={setSizeMode}
              small
              options={[
                { value: 'fixed', label: t('ثابت') },
                { value: 'risk', label: t('درصد ریسک') },
              ]}
            />
          </View>
        </Row>
        {sizeMode === 'fixed' ? (
          <Segment
            label={t('حجم')}
            value={sizeIndex}
            onChange={setSizeIndex}
            options={spec.sizes.map((s, i) => ({ value: i, label: formatSize(spec, s), mono: true }))}
          />
        ) : (
          <>
            <Segment
              label={t('درصد ریسک از ارزش حساب')}
              value={riskPct}
              onChange={setRiskPct}
              options={RISKS.map((r) => ({ value: r, label: t('{n}٪', { n: faDec(r) }), hint: t('ریسک {n} درصد', { n: faDec(r) }) }))}
            />
            <Row>
              <Txt w={700} size={12} color={colors.text3} style={{ flex: 1 }}>
                {t('{amount} ریسک ÷ فاصله‌ی حد ضرر =', { amount: ltr(usd((summary.equity * riskPct) / 100)) })}
              </Txt>
              <View style={styles.sizeOut}>
                <Txt mono w={800} size={13} color={size > 0 ? colors.text : colors.bearText}>
                  {formatSize(spec, size)}
                </Txt>
                <Txt w={700} size={12} color={colors.text2}>
                  {t(spec.sizeUnit)}
                </Txt>
              </View>
            </Row>
          </>
        )}
      </View>

      <StopRow
        label={t('حد ضرر')}
        tone={colors.bearText}
        on={slOn}
        locked={sizeMode === 'risk'}
        onToggle={() => setUseSl((v) => !v)}
        value={distanceLabel(spec, slDist)}
        onMinus={() => setSlMult((m) => Math.max(0.25, m - 0.25))}
        onPlus={() => setSlMult((m) => Math.min(10, m + 0.25))}
      />
      <StopRow
        label={t('حد سود')}
        tone={colors.bullText}
        on={useTp}
        onToggle={() => setUseTp((v) => !v)}
        value={distanceLabel(spec, tpDist)}
        onMinus={() => setTpMult((m) => Math.max(0.25, m - 0.25))}
        onPlus={() => setTpMult((m) => Math.min(20, m + 0.25))}
      />

      <View style={styles.summary}>
        <SummaryItem label={t('مارجین لازم')} value={usd(margin)} color={noMargin ? colors.bearText : colors.text} />
        <SummaryItem label={t('ریسک')} value={slOn ? usd(riskUsd) : t('بی‌سقف')} color={colors.bearText} mono={slOn} />
        <SummaryItem label={t('ریوارد')} value={useTp ? usd(rewardUsd) : '—'} color={colors.bullText} />
        {slOn && useTp ? (
          <View style={styles.rr}>
            <Txt w={900} size={12} color={colors.gold}>
              {t('۱ به {n}', { n: faDec(tpMult / slMult) })}
            </Txt>
          </View>
        ) : null}
      </View>

      {!slOn && <Hint tone="bear">{t('بدون حد ضرر، ضررت سقفی نداره تا جایی که لیکوئید بشی.')}</Hint>}
      {stopPastLiquidation && <Hint tone="bear">{t('حد ضررت از نقطه‌ی لیکوئید دورتره؛ قبل از رسیدن به حد ضرر لیکوئید می‌شی! اهرم رو کم کن.')}</Hint>}
      {noMargin && <Hint tone="bear">{t('مارجین آزادت ({amount}) برای این حجم کافی نیست.', { amount: ltr(usd(summary.freeMargin)) })}</Hint>}
      {sizeMode === 'risk' && size === 0 && <Hint tone="gold">{t('با این ریسک و حد ضرر، حجم از حداقل کمتر می‌شه. ریسک رو بیشتر یا حد ضرر رو نزدیک‌تر کن.')}</Hint>}

      <View style={styles.tradeRow}>
        {(['buy', 'sell'] as const).map((side) => {
          const p = priceFor(side);
          return (
            <Button3D
              key={side}
              variant={side === 'buy' ? 'primary' : 'danger'}
              onPress={() => place(side)}
              height={58}
              style={{ flex: 1 }}
              accessibilityLabel={t('{order} با قیمت {price}', { order: orderText(type, side), price: formatPrice(spec, p) })}
            >
              <Txt w={900} size={type === 'market' ? 17 : 15} color={side === 'buy' ? colors.bullInk : colors.bearInk}>
                {type === 'market' ? (side === 'buy' ? t('خرید') : t('فروش')) : orderText(type, side)}
              </Txt>
              <Txt mono w={800} size={12} color={side === 'buy' ? '#0A4A2A' : '#5A0F1C'}>
                {formatPrice(spec, p)}
              </Txt>
            </Button3D>
          );
        })}
      </View>
      <Txt w={700} size={11.5} color={colors.text3} center>
        {t('اسپرد: {spread} · خرید با Ask، فروش با Bid', { spread: distanceLabel(spec, spec.spread) })}
      </Txt>
    </Card>
  );
}

function StopRow({
  label,
  tone,
  on,
  locked,
  onToggle,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  tone: string;
  on: boolean;
  locked?: boolean;
  onToggle: () => void;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <Row>
      <Pressable
        onPress={locked ? undefined : onToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: on, disabled: locked }}
        accessibilityLabel={locked ? t('{label} (برای حجم با درصد ریسک لازمه)', { label }) : label}
        style={styles.stopLabel}
      >
        <Toggle on={on} />
        <View>
          <Txt w={800} size={13.5} color={on ? tone : colors.text3}>
            {label}
          </Txt>
          {locked ? (
            <Txt w={700} size={10} color={colors.text3}>
              {t('برای درصد ریسک لازمه')}
            </Txt>
          ) : null}
        </View>
      </Pressable>
      {on ? (
        <Stepper label={label} value={value} onMinus={onMinus} onPlus={onPlus} />
      ) : (
        <Txt w={700} size={12} color={colors.text3}>
          {t('خاموش')}
        </Txt>
      )}
    </Row>
  );
}

function SummaryItem({ label, value, color, mono = true }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <View style={{ gap: 1 }}>
      <Txt w={700} size={11} color={colors.text2}>
        {label}
      </Txt>
      <Txt mono={mono} w={800} size={12.5} color={color}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.bg,
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
  sizeOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
