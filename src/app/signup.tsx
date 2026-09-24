import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SignupForm } from '@/components/auth/SignupForm';
import { BackHeader } from '@/components/BackHeader';
import { KeyboardScroll } from '@/components/KeyboardScroll';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { useGame } from '@/store/game';

/** Creating an account later, for learners who started without one. */
export default function SignupScreen() {
  const name = useGame((s) => s.name);
  return (
    <Screen>
      <BackHeader caption={t('حساب کاربری')} title={t('ثبت‌نام')} />
      <KeyboardScroll contentContainerStyle={styles.content}>
        <View style={styles.mascotRow}>
          <Mascot mood="happy" size={84} />
          <SpeechBubble style={{ flex: 1 }}>
            <Txt w={800} size={16} lh={1.7}>
              {t('پروفایلت رو بساز؛ همه‌ی پیشرفتت به حسابت وصل می‌شه.')}
            </Txt>
          </SpeechBubble>
        </View>
        <SignupForm
          initialName={name === 'تریدر' ? '' : name} // i18n-ignore
          onDone={() => router.replace('/(tabs)/profile')}
        />
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 48,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
