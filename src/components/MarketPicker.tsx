import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { Market } from '@/content';
import { colors } from '@/theme';

import { Icon } from './Icon';
import { Txt } from './Txt';

export const MARKETS: { id: Market; title: string; sub: string; badge: string; badgeColor: string; badgeBg: string }[] = [
  { id: 'forex', title: 'فارکس', sub: 'جفت‌ارزها مثل EUR/USD و طلا', badge: '€$', badgeColor: colors.skyText, badgeBg: '#1B3A5C' },
  { id: 'crypto', title: 'کریپتو', sub: 'بیت‌کوین، اتریوم و آلت‌کوین‌ها', badge: '₿', badgeColor: colors.gold, badgeBg: '#3A2E10' },
  { id: 'both', title: 'هر دو', sub: 'مسیر کامل یه تریدر، قدم به قدم', badge: '∞', badgeColor: colors.bull, badgeBg: '#12382A' },
];

export function marketLabel(market: Market) {
  return MARKETS.find((m) => m.id === market)!;
}

/** Selectable market card, used in onboarding and the market switcher. */
export function MarketCard({ market, selected, onPress }: { market: (typeof MARKETS)[number]; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.badge, { backgroundColor: market.badgeBg }]}>
        <Txt mono={market.id !== 'both'} w={800} size={market.id === 'crypto' ? 26 : 18} color={market.badgeColor}>
          {market.badge}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt w={900} size={18}>
          {market.title}
        </Txt>
        <Txt size={13} color={colors.text2}>
          {market.sub}
        </Txt>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <Icon name="check" size={16} color={colors.bg} strokeWidth={3.4} />}
      </View>
    </Pressable>
  );
}

export function MarketPicker({ visible, value, onChange, onClose }: { visible: boolean; value: Market; onChange: (m: Market) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="بستن">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Txt w={900} size={18} style={{ marginBottom: 4 }}>
            کدوم بازار رو یاد می‌گیری؟
          </Txt>
          {MARKETS.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              selected={value === m.id}
              onPress={() => {
                onChange(m.id);
                onClose();
              }}
            />
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 84,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#3A4560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 488,
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.line,
  },
});
