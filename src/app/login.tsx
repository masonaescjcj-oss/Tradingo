import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LoginForm } from '@/components/auth/LoginForm';
import { BackHeader } from '@/components/BackHeader';
import { KeyboardScroll } from '@/components/KeyboardScroll';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { resetTo } from '@/lib/nav';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

/** Sign in with an email or a mobile number and the password. */
export default function LoginScreen() {
  const user = useGame((s) => s.user);
  return (
    <Screen>
      <BackHeader caption={t('حساب کاربری')} title={t('ورود')} />
      <KeyboardScroll contentContainerStyle={styles.content}>
        <View style={styles.mascotRow}>
          <Mascot mood="happy" size={84} />
          <SpeechBubble style={{ flex: 1 }}>
            <Txt w={800} size={16} lh={1.7}>
              {user
                ? t('سلام {name}! رمزت رو بزن و برگرد سر درس‌ها.', { name: user.name })
                : t('خوش برگشتی! با ایمیل یا شماره موبایلت وارد شو.')}
            </Txt>
          </SpeechBubble>
        </View>
        <LoginForm
          initialLogin={user?.login}
          onDone={() => resetTo(useGame.getState().onboarded ? '/(tabs)' : '/onboarding')}
        />
        <Txt size={14} color={colors.text2} center>
          {t('حساب نداری؟')}{' '}
          <Txt w={800} size={14} color={colors.skyText} onPress={() => router.replace(useGame.getState().onboarded ? '/signup' : '/onboarding')}>
            {t('ثبت‌نام کن')}
          </Txt>
        </Txt>
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
