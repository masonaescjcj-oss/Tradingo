import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { usd } from '@/utils/format';

import type { Notice } from './text';
import { TONES } from './ui';

/** A short message about the last fill, close or error, floating above the content. A closed trade gets a button for its P&L card. */
export function Toast({ notice, onCard }: { notice: Notice; onCard?: () => void }) {
  const tone = TONES[notice.tone];
  const card = notice.trade && onCard;
  return (
    <View pointerEvents="box-none" style={styles.wrap} accessibilityLiveRegion="polite">
      <View pointerEvents={card ? 'auto' : 'none'} style={[styles.toast, { borderColor: tone.color }]}>
        <Txt w={800} size={13.5} lh={1.6} color={colors.text} style={{ flex: 1 }}>
          {notice.text}
        </Txt>
        {notice.amount != null ? (
          <Txt mono w={800} size={14} color={notice.amount >= 0 ? colors.bull : colors.bearText}>
            {usd(notice.amount, true)}
          </Txt>
        ) : null}
        {card ? (
          <Pressable onPress={onCard} accessibilityRole="button" accessibilityLabel={t('کارت سود این معامله')} hitSlop={8} style={[styles.card, { borderColor: tone.color }]}>
            <Icon name="share" size={14} color={colors.text} strokeWidth={2.4} />
            <Txt w={800} size={12} color={colors.text}>
              {t('کارت')}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 488,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.raised,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
