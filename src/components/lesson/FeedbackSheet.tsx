import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { FlameIcon, Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

type Props = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: string;
  combo?: number;
  onContinue: () => void;
};

const PRAISE = ['آفرین! درست گفتی', 'عالی بود!', 'دقیقاً همینه!', 'مثل یه تریدر حرفه‌ای!'];

export function FeedbackSheet({ correct, correctAnswer, explanation, combo = 0, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(80));
  const praise = PRAISE[combo % PRAISE.length];

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: false, friction: 8, tension: 90 }).start();
  }, [slide]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.sheet,
        {
          paddingBottom: Math.max(insets.bottom, 20) + 8,
          backgroundColor: correct ? colors.bullSheet : colors.bearSheet,
          borderTopColor: correct ? colors.bullSheetLine : colors.bearSheetLine,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.badge, { backgroundColor: correct ? colors.bull : colors.bear }]}>
          <Icon name={correct ? 'check' : 'close'} size={20} color={correct ? colors.bullInk : colors.bearInk} strokeWidth={3.6} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt w={900} size={22} color={correct ? colors.bull : '#FF7A8A'}>
            {correct ? praise : 'این بار نه!'}
          </Txt>
          {!correct && correctAnswer ? (
            <Txt w={800} size={14} color="#FFB3BD">
              {`جواب درست: ${correctAnswer}`}
            </Txt>
          ) : null}
        </View>
        {correct && combo >= 3 ? (
          <View style={styles.combo}>
            <FlameIcon size={16} />
            <Txt w={900} size={13} color={colors.flame}>
              {`${fa(combo)} تا پشت سر هم`}
            </Txt>
          </View>
        ) : (
          <Mascot mood={correct ? 'happy' : 'sad'} size={52} />
        )}
      </View>
      {explanation ? (
        <Txt size={15} lh={1.9} color={correct ? '#CFEFDC' : '#F3C9CF'}>
          {explanation}
        </Txt>
      ) : null}
      <Button3D label={correct ? 'ادامه' : 'فهمیدم'} variant={correct ? 'primary' : 'danger'} onPress={onContinue} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderTopWidth: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,148,51,0.15)',
  },
});
