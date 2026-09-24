import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { quoteParts } from '@/lib/chartMath';
import { formatPrice, formatSize, nudgeSize, quote, type SymbolSpec } from '@/lib/simulator';
import { DEFAULT_LEVERAGE, type PlaceError, type Side, type TradeEvent } from '@/lib/trading';
import { useGame, type SimBook } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/**
 * MetaTrader's one-click bar: sell at the bid, buy at the ask, with the lot size in
 * between. Market orders at the default leverage, without a stop or target.
 */
export function QuickTrade({
  book,
  spec,
  mid,
  mids,
  size,
  onSize,
  onResult,
}: {
  book: SimBook;
  spec: SymbolSpec;
  mid: number;
  mids: Record<string, number>;
  size: number;
  onSize: (size: number) => void;
  onResult: (r: { error?: PlaceError; event?: TradeEvent }) => void;
}) {
  const simPlace = useGame((s) => s.simPlace);
  const { bid, ask } = quote(spec, mid);

  const place = (side: Side) => onResult(simPlace(book, { symbol: spec.id, side, type: 'market', size, leverage: DEFAULT_LEVERAGE }, mid, mids));

  return (
    <View style={styles.bar}>
      <TradeButton side="sell" spec={spec} price={bid} onPress={() => place('sell')} />
      <View style={styles.lot}>
        <StepButton up={false} label={t('کم کردن حجم')} onPress={() => onSize(nudgeSize(spec, size, -1))} />
        <View style={styles.lotValue}>
          <Txt mono w={800} size={15}>
            {formatSize(spec, size)}
          </Txt>
          <Txt w={700} size={10} color={colors.text3}>
            {`${t(spec.sizeUnit)} · ${fa(DEFAULT_LEVERAGE)}×`}
          </Txt>
        </View>
        <StepButton up label={t('زیاد کردن حجم')} onPress={() => onSize(nudgeSize(spec, size, 1))} />
      </View>
      <TradeButton side="buy" spec={spec} price={ask} onPress={() => place('buy')} />
    </View>
  );
}

function TradeButton({ side, spec, price, onPress }: { side: Side; spec: SymbolSpec; price: number; onPress: () => void }) {
  const buy = side === 'buy';
  const tone = buy ? colors.bull : colors.bear;
  const text = formatPrice(spec, price);
  const { head, big, tail } = quoteParts(text, spec.decimals);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={buy ? t('خرید فوری با قیمت {price}', { price: text }) : t('فروش فوری با قیمت {price}', { price: text })}
      style={({ pressed }) => [styles.trade, { borderColor: tone, backgroundColor: buy ? colors.bullSoft : colors.bearSoft }, pressed && styles.pressed]}
    >
      <Txt w={900} size={12} color={buy ? colors.bullText : colors.bearText}>
        {buy ? t('خرید') : t('فروش')}
      </Txt>
      <View style={styles.quote}>
        <Txt mono w={700} size={13} color={colors.text}>
          {head}
        </Txt>
        <Txt mono w={800} size={21} color={colors.text} style={styles.big}>
          {big}
        </Txt>
        {tail ? (
          <Txt mono w={700} size={11} color={colors.text} style={styles.tail}>
            {tail}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

function StepButton({ up, label, onPress }: { up: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
      <View style={up ? undefined : styles.flip}>
        <Icon name="arrowUp" size={15} color={colors.text2} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  trade: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  quote: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  big: {
    lineHeight: 24,
  },
  tail: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  lot: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  lotValue: {
    alignItems: 'center',
  },
  step: {
    width: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
});
