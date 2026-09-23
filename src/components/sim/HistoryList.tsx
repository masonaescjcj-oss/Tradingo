import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { findSymbol, formatPrice, formatSize } from '@/lib/simulator';
import { tradeR } from '@/lib/stats';
import { LEGACY_LEVERAGE, type ClosedTrade } from '@/lib/trading';
import { useGame, type SimBook } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa, usd } from '@/utils/format';

import { reasonText, rText, sideText } from './text';
import { Figure, pnlColor, SectionTitle } from './ui';

/** Closed trades; tapping one shows its details and a short note ("why did I take it?"). */
export function HistoryList({ book, history, limit, title = 'معامله‌های اخیر' }: { book: SimBook; history: ClosedTrade[]; limit?: number; title?: string }) {
  const [showAll, setShowAll] = useState(false);
  if (history.length === 0) return null;
  const shown = limit != null && !showAll ? history.slice(0, limit) : history;
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle
        right={
          <Txt w={700} size={11.5} color={colors.text3}>
            برای یادداشت روی معامله بزن
          </Txt>
        }
      >
        {title}
      </SectionTitle>
      {shown.map((t) => (
        <HistoryRow key={t.id} book={book} trade={t} />
      ))}
      {limit != null && history.length > limit ? (
        <Pressable onPress={() => setShowAll((v) => !v)} accessibilityRole="button" style={styles.more}>
          <Txt w={800} size={13} color={colors.skyText}>
            {showAll ? 'نمایش کمتر' : `نمایش همه (${fa(history.length)})`}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function HistoryRow({ book, trade: t }: { book: SimBook; trade: ClosedTrade }) {
  const simNote = useGame((s) => s.simNote);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(t.note ?? '');
  const spec = findSymbol(t.symbol);
  const r = tradeR(t);
  const save = () => {
    if ((t.note ?? '') !== draft.trim()) simNote(book, t.id, draft);
  };
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${sideText(t.side)} ${spec?.label ?? t.symbol}، ${reasonText(t.reason)}`}
        style={styles.row}
      >
        <Txt w={800} size={13} color={t.side === 'buy' ? colors.bullText : colors.bearText}>
          {sideText(t.side)}
        </Txt>
        <Txt mono w={700} size={12} color={colors.text2}>
          {spec?.label ?? t.symbol}
        </Txt>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt w={700} size={12} color={t.reason === 'liquidation' ? colors.flame : colors.text3} numberOfLines={1}>
            {reasonText(t.reason)}
          </Txt>
          {t.note ? <Icon name="pencil" size={12} color={colors.gold} strokeWidth={2.4} /> : null}
        </View>
        {r != null ? (
          <Txt w={800} size={11.5} color={colors.text3}>
            {rText(r)}
          </Txt>
        ) : null}
        <Txt mono w={800} size={13} color={pnlColor(t.pnl)}>
          {usd(t.pnl, true)}
        </Txt>
      </Pressable>
      {open && spec ? (
        <View style={styles.details}>
          <View style={styles.figures}>
            <Figure label="ورود" value={formatPrice(spec, t.entry)} />
            <Figure label="خروج" value={formatPrice(spec, t.exit)} />
            <Figure label="حجم" value={`${formatSize(spec, t.size)} · ${t.leverage ?? LEGACY_LEVERAGE}x`} />
          </View>
          <View style={styles.figures}>
            <Figure label="حد ضرر" value={t.sl != null ? formatPrice(spec, t.sl) : '—'} color={colors.bearText} />
            <Figure label="حد سود" value={t.tp != null ? formatPrice(spec, t.tp) : '—'} color={colors.bullText} />
            <Figure label="نوع ورود" value={t.orderType === 'limit' ? 'لیمیت' : t.orderType === 'stop' ? 'استاپ' : 'مارکت'} mono={false} />
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={save}
            onSubmitEditing={save}
            placeholder="یادداشت: چرا وارد شدی؟ چی یاد گرفتی؟"
            placeholderTextColor={colors.faint}
            maxLength={200}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="یادداشت معامله"
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
    textAlign: 'right',
    writingDirection: 'rtl',
    outlineWidth: 0,
  },
  more: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
