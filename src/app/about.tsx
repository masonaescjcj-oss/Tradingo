import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { allCourses } from '@/content';
import { LEGAL } from '@/content/legal';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

const SECTIONS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'info',
    title: 'فقط برای آموزش',
    body: 'چارتون یه اپ آموزشیه. هیچ‌کدوم از درس‌ها، مثال‌ها، نمودارها و سناریوها توصیه‌ی خرید، فروش یا سرمایه‌گذاری روی هیچ دارایی‌ای نیست و چارتون کارگزار یا مشاور مالی نیست.',
  },
  {
    icon: 'shield',
    title: 'ریسک واقعیه',
    body: 'معامله‌ی فارکس، ارز دیجیتال، طلا و قراردادهای اهرمی ریسک بالایی داره و ممکنه کل سرمایه‌ت رو از دست بدی. با اهرم، ضرر می‌تونه خیلی سریع اتفاق بیفته. فقط با پولی معامله کن که از دست دادنش زندگیت رو به هم نمی‌ریزه.',
  },
  {
    icon: 'candles',
    title: 'نمودارها و قیمت‌ها',
    body: 'نمودارهای درس‌ها برای آموزش ساخته شدن و قیمت‌هاشون نمونه‌ست، نه قیمت واقعی بازار. شبیه‌ساز با پول مجازی کار می‌کنه و نتیجه‌ی خوب توی شبیه‌ساز تضمینی برای نتیجه‌ی خوب توی بازار واقعی نیست.',
  },
  {
    icon: 'book',
    title: 'درستی محتوا',
    body: 'محتوا با دقت نوشته و بررسی شده، ولی ممکنه خطا داشته باشه یا با گذشت زمان قدیمی بشه (مثل ساعت سشن‌ها یا قوانین کارگزارها). اگه جایی اشتباه دیدی، خوشحال می‌شیم خبرمون کنی.',
  },
  {
    icon: 'user',
    title: 'حریم خصوصی',
    body: 'بدون حساب کاربری، پیشرفتت فقط روی همین دستگاه ذخیره می‌شه. اگه وارد حسابت بشی، پیشرفت، اسم و امتیازت برای همگام‌سازی و لیگ روی سرور ذخیره می‌شه و اسم و امتیاز هفتگیت به بقیه‌ی بازیکن‌های لیگ نشون داده می‌شه.',
  },
];

/** What Chartoon is, the full risk disclaimer and a note on data. */
export default function AboutScreen() {
  const lessons = allCourses().reduce((n, c) => n + c.units.reduce((m, u) => m + u.lessons.length, 0), 0);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen>
      <BackHeader caption="چارتون" title="درباره و سلب مسئولیت" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Mascot mood="happy" size={96} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt display size={30} color={colors.bull}>
              چارتون
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2}>
              {`ترید رو مثل یه بازی یاد بگیر: ${fa(allCourses().length)} دوره و ${fa(lessons)} درس کوتاه، از صفر تا استراتژی‌های پیشرفته.`}
            </Txt>
          </View>
        </View>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <View style={styles.cardHead}>
              <Icon name={s.icon} size={20} color={colors.gold} />
              <Txt w={900} size={16}>
                {s.title}
              </Txt>
            </View>
            <Txt size={14} lh={1.9} color={colors.text2}>
              {s.body}
            </Txt>
          </View>
        ))}
        {Object.values(LEGAL).map((doc) => (
          <Pressable key={doc.id} onPress={() => router.push(`/legal/${doc.id}`)} accessibilityRole="link" style={styles.link}>
            <Icon name="book" size={20} color={colors.skyText} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt w={900} size={15}>
                {doc.title}
              </Txt>
              <Txt w={500} size={12.5} color={colors.text3}>
                {doc.summary}
              </Txt>
            </View>
            <Icon name="chevronBack" size={18} color={colors.text3} />
          </Pressable>
        ))}
        <Txt mono size={12} color={colors.text3} center>
          {`v${version}`}
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 48,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
