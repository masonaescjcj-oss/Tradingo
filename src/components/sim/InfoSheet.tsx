import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { MAINTENANCE } from '@/lib/trading';
import { colors } from '@/theme';

import { faPct } from './text';

type Section = { title: string; body: string };

/** Built when shown, in the app's language. */
const sections = (): Section[] => [
  {
    title: t('نوع سفارش'),
    body: [
      t('مارکت: همین الان با قیمت بازار وارد می‌شی.'),
      t('لیمیت: «با قیمت بهتر وارد شو». خرید لیمیت پایین‌تر از قیمت فعلی و فروش لیمیت بالاتر از اون گذاشته می‌شه.'),
      t('استاپ: «وقتی قیمت شکست، وارد شو». خرید استاپ بالاتر از قیمت فعلی و فروش استاپ پایین‌تر گذاشته می‌شه.'),
      t('سفارش‌های لیمیت و استاپ تا وقتی قیمت بهشون نرسه منتظر می‌مونن و هر وقت خواستی می‌تونی لغوشون کنی.'),
    ].join('\n'),
  },
  {
    title: t('اهرم (Leverage)'),
    body: [
      t('با اهرم ۱۰، با ۱۰۰ دلار از پول خودت معامله‌ی ۱٬۰۰۰ دلاری باز می‌کنی. سود و ضرر به اندازه‌ی کل معامله حساب می‌شه، نه فقط پول خودت.'),
      t('اهرم به‌تنهایی ریسک رو زیاد نمی‌کنه اگه حجم رو با حد ضرر تنظیم کنی؛ ولی نقطه‌ی لیکوئید رو نزدیک‌تر می‌کنه.'),
    ].join('\n'),
  },
  {
    title: t('مارجین (وجه تضمین)'),
    body: [
      t('مارجین لازم = ارزش معامله ÷ اهرم. این پول تا وقتی معامله بازه کنار گذاشته می‌شه.'),
      t('ارزش حساب (Equity) = موجودی + سود و زیان معامله‌های باز.'),
      t('مارجین آزاد = ارزش حساب − مارجین درگیر. معامله‌ی جدید فقط وقتی باز می‌شه که مارجین آزاد کافی باشه.'),
      t('سطح مارجین = ارزش حساب ÷ مارجین درگیر × ۱۰۰٪. هرچی پایین‌تر، حسابت شکننده‌تره.'),
    ].join('\n'),
  },
  {
    title: t('لیکوئید شدن'),
    body: [
      t('توی این شبیه‌ساز هر معامله مارجین خودش رو داره. اگه ضرر یه معامله به {pct} مارجینش برسه، معامله خودکار بسته می‌شه و اون ضرر قطعی می‌شه.', { pct: faPct(MAINTENANCE, 0) }),
      t('یعنی با اهرم ۱۰ حرکت {pct10} خلاف جهتت کافیه، با اهرم ۲۰ فقط {pct20}. قیمت لیکوئید هر معامله کنار حد ضرر و حد سودش نشون داده می‌شه.', {
        pct10: faPct(MAINTENANCE / 10),
        pct20: faPct(MAINTENANCE / 20, 2),
      }),
      t('اگه حد ضررت از نقطه‌ی لیکوئید دورتر باشه، قبل از حد ضرر لیکوئید می‌شی. کارگزارهای واقعی قانون‌های پیچیده‌تری دارن، ولی ایده همینه.'),
    ].join('\n'),
  },
  {
    title: t('حجم با درصد ریسک'),
    body: [
      t('حجم = مبلغ ریسک ÷ فاصله‌ی حد ضرر. مثلاً ۱٪ از ۱۰٬۰۰۰ دلار یعنی ۱۰۰ دلار ریسک؛ اگه حد ضرر ۲۰ پیپ (۲۰۰ دلار برای هر لات) باشه، حجم می‌شه ۰٫۵ لات.'),
      t('این‌طوری مهم نیست حد ضررت دور باشه یا نزدیک؛ اگه بخوره، همون درصدی که انتخاب کردی رو از دست می‌دی.'),
    ].join('\n'),
  },
  {
    title: t('ابزار نمودار'),
    body: [
      t('MA میانگین قیمت چند کندل اخیره و جهت روند رو نرم‌تر نشون می‌ده. بولینگر محدوده‌ی نوسان معمول قیمته. RSI بالای ۷۰ یعنی خرید هیجانی و زیر ۳۰ فروش هیجانی. حجم نشون می‌ده هر کندل چقدر معامله شده.'),
      t('با «+ سطح» خط‌های افقی خودت رو روی حمایت و مقاومت بذار.'),
    ].join('\n'),
  },
];

/** Plain-language help for order types, leverage, margin and liquidation. */
export function InfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('بستن راهنما')} />
        <View style={styles.sheet}>
          <Txt w={900} size={19}>
            {t('راهنمای شبیه‌ساز')}
          </Txt>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
            {sections().map((s) => (
              <View key={s.title} style={{ gap: 4 }}>
                <Txt w={900} size={15} color={colors.gold}>
                  {s.title}
                </Txt>
                <Txt size={13.5} lh={1.85} color={colors.text2}>
                  {s.body}
                </Txt>
              </View>
            ))}
            <Txt w={700} size={12} lh={1.7} color={colors.text3}>
              {t('همه‌ی این‌ها برای آموزشه و پول مجازیه؛ پیشنهاد خرید یا فروش نیست.')}
            </Txt>
          </ScrollView>
          <Button3D label={t('فهمیدم')} onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 488,
    maxHeight: '88%',
    gap: 12,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
});
