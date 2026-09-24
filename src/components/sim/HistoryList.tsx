import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { t, textStart } from '@/i18n';
import { findSymbol, formatPrice, formatSize } from '@/lib/simulator';
import { tradeR } from '@/lib/stats';
import { LEGACY_LEVERAGE, type ClosedTrade } from '@/lib/trading';
import { useGame, type SimBook } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa, usd } from '@/utils/format';

import { entryText, exitText, reasonText, rText, sideText } from './text';
import { Figure, pnlColor, SectionTitle } from './ui';

/** Closed trades; tapping one shows its details and a short note ("why did I take it?"). */
export function HistoryList({ book, history, limit, title = t('معامله‌های اخیر') }: { book: SimBook; history: ClosedTrade[]; limit?: number; title?: string }) {
  const [showAll, setShowAll] = useState(false);
  if (history.length === 0) return null;
  const shown = limit != null && !showAll ? history.slice(0, limit) : history;
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle
        right={
          <Txt w={700} size={11.5} color={colors.text3}>
            {t('برای یادداشت روی معامله بزن')}
          </Txt>
        }
      >
        {title}
      </SectionTitle>
      {shown.map((trade) => (
        <HistoryRow key={trade.id} book={book} trade={trade} />
      ))}
      {limit != null && history.length > limit ? (
        <Pressable onPress={() => setShowAll((v) => !v)} accessibilityRole="button" style={styles.more}>
          <Txt w={800} size={13} color={colors.skyText}>
            {showAll ? t('نمایش کمتر') : t('نمایش همه ({n})', { n: fa(history.length) })}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function HistoryRow({ book, trade }: { book: SimBook; trade: ClosedTrade }) {
  const simNote = useGame((s) => s.simNote);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(trade.note ?? '');
  const spec = findSymbol(trade.symbol);
  const r = tradeR(trade);
  const save = () => {
    if ((trade.note ?? '') !== draft.trim()) simNote(book, trade.id, draft);
  };
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('{side} {symbol}، {reason}', { side: sideText(trade.side), symbol: spec?.label ?? trade.symbol, reason: reasonText(trade.reason) })}
        style={styles.row}
      >
        <Txt w={800} size={13} color={trade.side === 'buy' ? colors.bullText : colors.bearText}>
          {sideText(trade.side)}
        </Txt>
        <Txt mono w={700} size={12} color={colors.text2}>
          {spec?.label ?? trade.symbol}
        </Txt>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt w={700} size={12} color={trade.reason === 'liquidation' ? colors.flame : colors.text3} numberOfLines={1}>
            {reasonText(trade.reason)}
          </Txt>
          {trade.note ? <Icon name="pencil" size={12} color={colors.gold} strokeWidth={2.4} /> : null}
        </View>
        {r != null ? (
          <Txt w={800} size={11.5} color={colors.text3}>
            {rText(r)}
          </Txt>
        ) : null}
        <Txt mono w={800} size={13} color={pnlColor(trade.pnl)}>
          {usd(trade.pnl, true)}
        </Txt>
      </Pressable>
      {open && spec ? (
        <View style={styles.details}>
          <View style={styles.figures}>
            <Figure label={entryText()} value={formatPrice(spec, trade.entry)} />
            <Figure label={exitText()} value={formatPrice(spec, trade.exit)} />
            <Figure label={t('حجم')} value={`${formatSize(spec, trade.size)} · ${trade.leverage ?? LEGACY_LEVERAGE}x`} />
          </View>
          <View style={styles.figures}>
            <Figure label={t('حد ضرر')} value={trade.sl != null ? formatPrice(spec, trade.sl) : '—'} color={colors.bearText} />
            <Figure label={t('حد سود')} value={trade.tp != null ? formatPrice(spec, trade.tp) : '—'} color={colors.bullText} />
            <Figure label={t('نوع ورود')} value={trade.orderType === 'limit' ? t('لیمیت') : trade.orderType === 'stop' ? t('استاپ') : t('مارکت')} mono={false} />
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={save}
            onSubmitEditing={save}
            placeholder={t('یادداشت: چرا وارد شدی؟ چی یاد گرفتی؟')}
            placeholderTextColor={colors.faint}
            maxLength={200}
            returnKeyType="done"
            style={[styles.input, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }]}
            accessibilityLabel={t('یادداشت معامله')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  details: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  figures: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    outlineWidth: 0,
  },
  more: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
