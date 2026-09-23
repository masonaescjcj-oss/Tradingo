import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { colors } from '@/theme';
import { usd } from '@/utils/format';

import type { Notice } from './text';
import { TONES } from './ui';

/** A short message about the last fill, close or error, floating above the content. */
export function Toast({ notice }: { notice: Notice }) {
  const tone = TONES[notice.tone];
  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.toast, { borderColor: tone.color }]}>
        <Txt w={800} size={13.5} lh={1.6} color={colors.text} style={{ flex: 1 }}>
          {notice.text}
        </Txt>
        {notice.amount != null ? (
          <Txt mono w={800} size={14} color={notice.amount >= 0 ? colors.bull : colors.bearText}>
            {usd(notice.amount, true)}
          </Txt>
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
});
