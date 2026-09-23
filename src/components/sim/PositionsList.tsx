import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { findSymbol, formatPrice, formatSize } from '@/lib/simulator';
import { LEGACY_LEVERAGE, liquidationPrice, openPnl, positionMargin, type Account, type ClosedTrade, type PendingOrder, type Position } from '@/lib/trading';
import { useGame, type SimBook } from '@/store/game';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

import { orderText, sideText } from './text';
import { Figure, pnlColor, SectionTitle, VIOLET } from './ui';

/** Open positions and pending orders of one account, with close / cancel buttons. */
export function PositionsList({
  book,
  account,
  mids,
  onClosed,
}: {
  book: SimBook;
  account: Pick<Account, 'positions' | 'orders'>;
  mids: Record<string, number>;
  onClosed: (trade: ClosedTrade) => void;
}) {
  const simClose = useGame((s) => s.simClose);
  const simCancel = useGame((s) => s.simCancel);
  if (account.positions.length === 0 && account.orders.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {account.positions.length > 0 && <SectionTitle>{`معامله‌های باز (${fa(account.positions.length)})`}</SectionTitle>}
      {account.positions.map((p) => {
        const mid = mids[p.symbol];
        return (
          <PositionCard
            key={p.id}
            position={p}
            mid={mid}
            onClose={() => {
              if (mid == null) return;
              const trade = simClose(book, p.id, mid);
              if (trade) onClosed(trade);
            }}
          />
        );
      })}
      {account.orders.length > 0 && <SectionTitle>{`سفارش‌های در انتظار (${fa(account.orders.length)})`}</SectionTitle>}
      {account.orders.map((o) => (
        <OrderCard key={o.id} order={o} mid={mids[o.symbol]} onCancel={() => simCancel(book, o.id)} />
      ))}
    </View>
  );
}

function PositionCard({ position: p, mid, onClose }: { position: Position; mid: number | undefined; onClose: () => void }) {
  const spec = findSymbol(p.symbol);
  if (!spec) return null;
  const pnl = mid != null ? openPnl(spec, p, mid) : 0;
  const margin = positionMargin(spec, p);
  return (
    <View style={[styles.card, { borderColor: pnl >= 0 ? colors.bullSheetLine : colors.bearSheetLine, backgroundColor: pnl >= 0 ? '#10251B' : '#22121A' }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <View style={[styles.sideChip, { backgroundColor: p.side === 'buy' ? colors.bull : colors.bear }]}>
            <Txt w={900} size={12} color={p.side === 'buy' ? colors.bullInk : colors.bearInk}>
              {sideText(p.side)}
            </Txt>
          </View>
          <Txt mono w={800} size={13}>
            {`${spec.label} · ${formatSize(spec, p.size)} · ${p.leverage ?? LEGACY_LEVERAGE}x`}
          </Txt>
        </View>
        <Txt mono w={800} size={17} color={pnlColor(pnl)}>
          {usd(pnl, true)}
        </Txt>
      </View>
      <View style={styles.levels}>
        <Figure label="ورود" value={formatPrice(spec, p.entry)} />
        <Figure label="حد ضرر" value={p.sl != null ? formatPrice(spec, p.sl) : '—'} color={colors.bearText} />
        <Figure label="حد سود" value={p.tp != null ? formatPrice(spec, p.tp) : '—'} color={colors.bullText} />
      </View>
      <View style={styles.levels}>
        <Figure label="لیکوئید" value={formatPrice(spec, liquidationPrice(spec, p))} color={colors.flame} />
        <Figure label="مارجین" value={usd(margin)} />
        <Figure label="ریسک اولیه" value={p.risk != null ? usd(p.risk) : '—'} />
      </View>
      <Button3D label="بستن معامله" variant="secondary" height={40} radius={12} edge={4} size={14} onPress={onClose} />
    </View>
  );
}

function OrderCard({ order: o, mid, onCancel }: { order: PendingOrder; mid: number | undefined; onCancel: () => void }) {
  const spec = findSymbol(o.symbol);
  if (!spec) return null;
  return (
    <View style={[styles.card, styles.orderCard]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <View style={[styles.sideChip, { backgroundColor: VIOLET }]}>
            <Txt w={900} size={12} color="#1E1240">
              {orderText(o.type, o.side)}
            </Txt>
          </View>
          <Txt mono w={800} size={13}>
            {`${spec.label} · ${formatSize(spec, o.size)} · ${o.leverage}x`}
          </Txt>
        </View>
        <Button3D label="لغو" variant="secondary" height={32} radius={10} edge={3} size={13} onPress={onCancel} accessibilityLabel="لغو سفارش" />
      </View>
      <View style={styles.levels}>
        <Figure label="قیمت سفارش" value={formatPrice(spec, o.price)} color={VIOLET} />
        <Figure label="حد ضرر" value={o.sl != null ? formatPrice(spec, o.sl) : '—'} color={colors.bearText} />
        <Figure label="حد سود" value={o.tp != null ? formatPrice(spec, o.tp) : '—'} color={colors.bullText} />
      </View>
      {mid != null ? (
        <Txt w={700} size={11.5} color={colors.text3}>
          {`${o.side === 'buy' ? 'وقتی Ask' : 'وقتی Bid'} به ${formatPrice(spec, o.price)} برسه پر می‌شه.`}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
  },
  orderCard: {
    borderColor: 'rgba(167,139,250,0.45)',
    backgroundColor: '#1A1830',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
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
});
