import { Pressable, StyleSheet, View } from 'react-native';

import { HeartIcon, Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

type Props = {
  progress: number;
  onClose: () => void;
  hearts?: number;
  secondsLeft?: number;
  /** Opens the problem report for the step on screen. */
  onReport?: () => void;
};

export function LessonHeader({ progress, onClose, hearts, secondsLeft, onReport }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="خروج از درس" style={styles.close}>
        <Icon name="close" size={26} color={colors.text3} strokeWidth={2.8} />
      </Pressable>
      <ProgressBar value={progress} label="پیشرفت درس" />
      {onReport ? (
        <Pressable onPress={onReport} accessibilityRole="button" accessibilityLabel="گزارش مشکل این مرحله" hitSlop={6} style={styles.flag}>
          <Icon name="flag" size={20} color={colors.text3} strokeWidth={2.4} />
        </Pressable>
      ) : null}
      {secondsLeft != null ? (
        <View style={styles.counter} accessible accessibilityLabel={`${fa(secondsLeft)} ثانیه مونده`}>
          <Icon name="clock" size={20} color={secondsLeft <= 10 ? colors.bear : colors.gold} strokeWidth={2.6} />
          <Txt w={900} size={16} color={secondsLeft <= 10 ? colors.bear : colors.gold}>
            {fa(secondsLeft)}
          </Txt>
        </View>
      ) : hearts != null ? (
        <View style={styles.counter} accessible accessibilityLabel={`${fa(hearts)} قلب`}>
          <HeartIcon />
          <Txt w={900} size={16} color={colors.bear}>
            {fa(hearts)}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 40,
  },
});
