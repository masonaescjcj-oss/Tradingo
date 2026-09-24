import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { BoltIcon, CoinIcon, FlameIcon, HeartIcon, Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { useNow } from '@/components/useNow';
import { MAX_FREEZES, streakRepair } from '@/lib/progress';
import { boostLeftMs, PRICES, type BuyResult, type ShopItemId } from '@/lib/shop';
import { playSfx } from '@/lib/sfx';
import { heartsNow, MAX_HEARTS, useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum } from '@/utils/format';

const RESULT_TEXT: Record<Exclude<BuyResult, 'ok'>, string> = {
  coins: 'سکه‌ت کافی نیست. با درس، مأموریت و صندوق سکه جمع کن.', // i18n-ignore: translated where shown
  full: 'فعلاً جا نداری؛ اول از قبلی‌ها استفاده کن.', // i18n-ignore: translated where shown
  unavailable: 'الان چیزی برای ترمیم نیست.', // i18n-ignore: translated where shown
};

const DONE_TEXT: Record<ShopItemId, string> = {
  freeze: 'یخ شعله اضافه شد! اگه یه روز نیای، شعله‌ت می‌مونه.', // i18n-ignore: translated where shown
  repair: 'شعله‌ت دوباره روشن شد!', // i18n-ignore: translated where shown
  boost: 'امتیاز دو برابر روشن شد. برو درس بخون!', // i18n-ignore: translated where shown
  hearts: 'قلب‌هات پر شد!', // i18n-ignore: translated where shown
};

const EARN: { text: string; amount: string }[] = [
  { text: 'تموم کردن درس تازه', amount: '۱۰ تا ۱۵' }, // i18n-ignore: translated where shown
  { text: 'رسیدن به هدف روزانه', amount: '۲۰' }, // i18n-ignore: translated where shown
  { text: 'صندوق‌های مسیر و مأموریت‌ها', amount: '۲۰ تا ۱۵۰' }, // i18n-ignore: translated where shown
  { text: 'قبولی آزمون استادی', amount: '۲۰' }, // i18n-ignore: translated where shown
  { text: 'چالش‌های شبیه‌ساز', amount: 'تا ۱۰۰' }, // i18n-ignore: translated where shown
];

/** The coin shop: streak freezes and repair, double XP, and a heart refill. */
export default function ShopScreen() {
  const game = useGame();
  const buy = useGame((s) => s.buy);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);
  const now = useNow(game.boostUntil > 0, 15_000, game.boostUntil);

  const freezes = game.freezes ?? 0;
  const repair = streakRepair(game);
  const boostMin = Math.ceil(boostLeftMs(game.boostUntil, now) / 60_000);
  const heartsFull = heartsNow(game).hearts >= MAX_HEARTS;

  const purchase = (id: ShopItemId) => {
    const result = buy(id);
    if (result === 'ok') playSfx('chest');
    else playSfx('wrong');
    setNotice(result === 'ok' ? { text: t(DONE_TEXT[id]), good: true } : { text: t(RESULT_TEXT[result]), good: false });
  };

  return (
    <Screen>
      <BackHeader
        caption={t('سکه‌هات رو خرج کن')}
        title={t('فروشگاه')}
        right={
          <View style={styles.balance} accessible accessibilityLabel={t('{n} سکه داری', { n: faNum(game.coins), count: game.coins })}>
            <CoinIcon size={20} />
            <Txt w={900} size={16} color={colors.gold}>
              {faNum(game.coins)}
            </Txt>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {notice ? (
          <View style={[styles.notice, notice.good ? styles.noticeGood : styles.noticeBad]} accessibilityLiveRegion="polite">
            <Txt w={800} size={13.5} lh={1.6} color={notice.good ? colors.bullText : colors.bearText}>
              {notice.text}
            </Txt>
          </View>
        ) : null}

        <Section title={t('شعله')}>
          {repair ? (
            <Item
              icon={<FlameIcon size={30} />}
              tint={colors.flame}
              title={t('ترمیم شعله')}
              text={t('شعله‌ت خاموش شده، ولی هنوز دیر نیست. با ترمیم به {n} روز برمی‌گرده.', { n: fa(repair.streak), count: repair.streak })}
              price={PRICES.repair}
              onBuy={() => purchase('repair')}
              highlight
            />
          ) : null}
          <Item
            icon={<Icon name="snow" size={28} color={colors.sky} strokeWidth={2.4} />}
            tint={colors.sky}
            title={t('یخ شعله')}
            text={t('اگه یه روز نتونستی بیای، شعله‌ت خاموش نمی‌شه. خودش خودکار استفاده می‌شه.')}
            price={PRICES.freeze}
            onBuy={() => purchase('freeze')}
            disabled={freezes >= MAX_FREEZES}
            extra={
              <View style={styles.slots}>
                {Array.from({ length: MAX_FREEZES }, (_, i) => (
                  <View key={i} style={[styles.slot, i < freezes && styles.slotOn]}>
                    <Icon name="snow" size={13} color={i < freezes ? colors.skyInk : colors.faint} strokeWidth={2.6} />
                  </View>
                ))}
                <Txt w={800} size={12} color={colors.text3}>
                  {freezes >= MAX_FREEZES ? t('پره') : t('{done} از {total}', { done: fa(freezes), total: fa(MAX_FREEZES) })}
                </Txt>
              </View>
            }
          />
        </Section>

        <Section title={t('قدرت‌ها')}>
          <Item
            icon={<BoltIcon size={28} />}
            tint={colors.gold}
            title={t('امتیاز دو برابر')}
            text={t('۱۵ دقیقه هر درس، تمرین و آزمون دو برابر امتیاز می‌ده. برای بالا رفتن توی لیگ عالیه.')}
            price={PRICES.boost}
            onBuy={() => purchase('boost')}
            extra={
              boostMin > 0 ? (
                <Txt w={800} size={12} color={colors.gold}>
                  {t('روشنه؛ {n} دقیقه مونده. دوباره بخری، ۱۵ دقیقه اضافه می‌شه.', { n: fa(boostMin), count: boostMin })}
                </Txt>
              ) : null
            }
          />
          <Item
            icon={<HeartIcon size={28} />}
            tint={colors.bear}
            title={t('پر کردن قلب‌ها')}
            text={t('همه‌ی قلب‌هات یه‌جا پر می‌شن تا بدون صبر درس بعدی رو شروع کنی.')}
            price={PRICES.hearts}
            onBuy={() => purchase('hearts')}
            disabled={heartsFull}
            extra={
              heartsFull ? (
                <Txt w={800} size={12} color={colors.text3}>
                  {t('قلب‌هات پره')}
                </Txt>
              ) : null
            }
          />
        </Section>

        <Section title={t('سکه از کجا بیارم؟')}>
          <View style={styles.earn}>
            {EARN.map((e) => (
              <View key={e.text} style={styles.earnRow}>
                <Txt w={700} size={13.5} color={colors.text2} style={{ flex: 1 }}>
                  {t(e.text)}
                </Txt>
                <CoinIcon size={16} />
                <Txt w={900} size={13.5} color={colors.gold}>
                  {t(e.amount)}
                </Txt>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt w={900} size={16} color={colors.text2}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function Item({
  icon,
  tint,
  title,
  text,
  price,
  onBuy,
  disabled,
  extra,
  highlight,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  text: string;
  price: number;
  onBuy: () => void;
  disabled?: boolean;
  extra?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.item, highlight && { borderColor: tint }]}>
      <View style={[styles.itemIcon, { borderColor: tint }]}>{icon}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt w={900} size={15.5}>
          {title}
        </Txt>
        <Txt w={500} size={12.5} lh={1.7} color={colors.text2}>
          {text}
        </Txt>
        {extra}
      </View>
      <Button3D variant={disabled ? 'disabled' : 'gold'} disabled={disabled} height={40} radius={12} edge={4} onPress={onBuy} accessibilityLabel={t('خرید {item}، {n} سکه', { item: title, n: fa(price), count: price })}>
        <View style={styles.price}>
          <CoinIcon size={16} />
          <Txt w={900} size={15} color={disabled ? '#6D7894' : colors.goldInk}>
            {fa(price)}
          </Txt>
        </View>
      </Button3D>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 22,
    paddingBottom: 40,
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  notice: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
  },
  noticeGood: {
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  noticeBad: {
    borderColor: colors.bearSheetLine,
    backgroundColor: colors.bearSheet,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.surfaceDeep,
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  slot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  slotOn: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
  earn: {
    padding: 14,
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
