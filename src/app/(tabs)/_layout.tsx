import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'یادگیری' }} />
      <Tabs.Screen name="practice" options={{ title: 'تمرین' }} />
      <Tabs.Screen name="simulator" options={{ title: 'شبیه‌ساز' }} />
      <Tabs.Screen name="league" options={{ title: 'لیگ' }} />
      <Tabs.Screen name="profile" options={{ title: 'پروفایل' }} />
    </Tabs>
  );
}
