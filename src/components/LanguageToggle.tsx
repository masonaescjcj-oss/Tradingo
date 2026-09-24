import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { LANGS, t } from '@/i18n';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

/**
 * فارسی | English. Switching rebuilds every screen in the new language and direction (the root
 * layout keys on it), so this is best placed on a screen people come back to easily.
 */
export function LanguageToggle({ compact }: { compact?: boolean }) {
  const language = useGame((s) => s.language) ?? 'fa';
  return (
    <View style={[styles.row, compact && styles.compact]} accessibilityRole="radiogroup" accessibilityLabel={t('زبان')}>
      {!compact ? (
        <View style={styles.label}>
          <Icon name="chat" size={18} color={colors.text3} />
          <Txt w={800} size={14} color={colors.text2}>
            {t('زبان')}
          </Txt>
        </View>
      ) : null}
      <View style={styles.options}>
        {LANGS.map((l) => {
          const on = l.id === language;
          return (
            <Pressable
              key={l.id}
              onPress={() => useGame.getState().setLanguage(l.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={l.label}
              style={[styles.option, on && styles.optionOn]}
            >
              <Txt w={800} size={13} color={on ? colors.skyText : colors.text2}>
                {l.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  compact: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  options: {
    flexDirection: 'row',
    gap: 6,
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.surfaceDeep,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
});
