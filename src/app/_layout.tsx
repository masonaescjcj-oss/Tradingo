import { JetBrainsMono_700Bold, JetBrainsMono_800ExtraBold } from '@expo-google-fonts/jetbrains-mono';
import { Lalezar_400Regular } from '@expo-google-fonts/lalezar';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
  Vazirmatn_900Black,
} from '@expo-google-fonts/vazirmatn';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useGame } from '@/store/game';
import { MAX_WIDTH, colors } from '@/theme';

// react-native-web resolves start/end styles from the nearest `dir`, so the root declares it.
const rtlProps = Platform.OS === 'web' ? ({ dir: 'rtl' } as object) : null;

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.lineSoft, primary: colors.bull },
};

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // The whole app is Persian: lay out right-to-left on the web.
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'fa';
  document.body.style.backgroundColor = colors.bg;
}

function useStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useGame.persist.onFinishHydration(onChange),
    () => useGame.persist.hasHydrated(),
    () => false,
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
    Vazirmatn_900Black,
    Lalezar_400Regular,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
  });
  const hydrated = useStoreHydrated();

  useEffect(() => {
    if (!hydrated) return;
    const { rolloverWeek, syncHearts } = useGame.getState();
    rolloverWeek();
    syncHearts();
  }, [hydrated]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <View style={styles.page} {...rtlProps}>
        <View style={styles.column}>
          {fontsLoaded && hydrated ? (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
            </Stack>
          ) : null}
        </View>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  // On wide web screens the app stays a phone-width column.
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.bg,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: colors.lineSoft,
  },
});
