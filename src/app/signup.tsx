import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SignupForm } from '@/components/auth/SignupForm';
import { BackHeader } from '@/components/BackHeader';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { useGame } from '@/store/game';

/** Creating an account later, for learners who started without one. */
export default function SignupScreen() {
  const name = useGame((s) => s.name);
  return (
    <Screen>
      <BackHeader caption="حساب کاربری" title="ثبت‌نام" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mascotRow}>
          <Mascot mood="happy" size={84} />
          <SpeechBubble style={{ flex: 1 }}>
            <Txt w={800} size={16} lh={1.7}>
              پروفایلت رو بساز؛ همه‌ی پیشرفتت به حسابت وصل می‌شه.
            </Txt>
          </SpeechBubble>
        </View>
        <SignupForm initialName={name === 'تریدر' ? '' : name} onDone={() => router.replace('/(tabs)/profile')} />
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
