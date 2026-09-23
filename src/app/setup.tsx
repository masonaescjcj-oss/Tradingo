import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { MARKETS, MarketCard } from '@/components/MarketPicker';
import { Mascot } from '@/components/Mascot';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import type { Market } from '@/content';
import { useGame, type Level } from '@/store/game';
import { colors } from '@/theme';

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'new', label: 'تازه‌کارم', hint: 'از اول اول شروع می‌کنیم.' },
  { id: 'some', label: 'یه چیزایی بلدم', hint: 'واحد «مبانی بازار» رو رد می‌کنیم.' },
  { id: 'pro', label: 'قبلاً ترید کردم', hint: 'مستقیم می‌ری سراغ نمودارها و مدیریت ریسک.' },
];

export default function Setup() {
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const [market, setMarket] = useState<Market>('forex');
  const [level, setLevel] = useState<Level>('new');

  const done = () => {
    finishOnboarding(market, level);
    router.replace('/(tabs)');
  };

  return (
    <Screen style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="بازگشت" style={styles.back}>
          <Icon name="chevronBack" size={26} color={colors.text3} strokeWidth={2.6} />
        </Pressable>
        <ProgressBar value={0.5} label="مرحله‌ی ۲ از ۴" />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mascotRow}>
          <Mascot mood="think" size={84} />
          <SpeechBubble style={{ flex: 1 }}>
            <Txt w={800} size={17} lh={1.7}>
              می‌خوای کدوم بازار رو یاد بگیری؟
            </Txt>
          </SpeechBubble>
        </View>
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {MARKETS.map((m) => (
            <MarketCard key={m.id} market={m} selected={market === m.id} onPress={() => setMarket(m.id)} />
          ))}
        </View>
        <View style={{ gap: 10, marginTop: 6 }}>
          <Txt w={800} size={15} color={colors.text2}>
            چقدر با ترید آشنایی؟
          </Txt>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {LEVELS.map((l) => {
              const on = level === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setLevel(l.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Txt w={800} size={15} color={on ? colors.skyText : colors.text}>
                    {l.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Txt size={13} color={colors.text3}>
            {LEVELS.find((l) => l.id === level)!.hint}
          </Txt>
        </View>
      </ScrollView>
      <Button3D label="ادامه" onPress={done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingVertical: 18,
    gap: 18,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    height: 46,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
});
