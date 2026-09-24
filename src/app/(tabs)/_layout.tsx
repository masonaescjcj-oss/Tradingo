import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

export default function TabsLayout() {
  const ready = useGame((s) => s.onboarded && !s.signedOut);
  // A home-screen shortcut or saved link straight to a tab still starts new learners at the welcome screen.
  if (!ready) return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'یادگیری' }} />
      <Tabs.Screen name="practice" options={{ title: 'تمرین' }} />
      <Tabs.Screen name="simulator" options={{ title: 'شبیه‌ساز' }} />
      <Tabs.Screen name="chat" options={{ title: 'گفتگو' }} />
      <Tabs.Screen name="profile" options={{ title: 'پروفایل' }} />
    </Tabs>
  );
}
