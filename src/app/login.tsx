import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoginForm } from '@/components/auth/LoginForm';
import { BackHeader } from '@/components/BackHeader';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { resetTo } from '@/lib/nav';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

/** Sign in with mobile and password. */
export default function LoginScreen() {
  const user = useGame((s) => s.user);
  return (
    <Screen>
      <BackHeader caption="حساب کاربری" title="ورود" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mascotRow}>
          <Mascot mood="happy" size={84} />
          <SpeechBubble style={{ flex: 1 }}>
            <Txt w={800} size={16} lh={1.7}>
              {user ? `سلام ${user.name}! رمزت رو بزن و برگرد سر درس‌ها.` : 'خوش برگشتی! با شماره موبایلت وارد شو.'}
            </Txt>
          </SpeechBubble>
        </View>
        <LoginForm
          initialMobile={user?.mobile}
          onDone={() => resetTo(useGame.getState().onboarded ? '/(tabs)' : '/onboarding')}
        />
        <Txt size={14} color={colors.text2} center>
          حساب نداری؟{' '}
          <Txt w={800} size={14} color={colors.skyText} onPress={() => router.replace(useGame.getState().onboarded ? '/signup' : '/onboarding')}>
            ثبت‌نام کن
          </Txt>
        </Txt>
      </ScrollView>
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
