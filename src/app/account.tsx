import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { logout } from '@/lib/auth';
import { resetTo } from '@/lib/nav';
import { syncNow, useCloud } from '@/lib/cloud';
import { formatMobile } from '@/lib/phone';
import { cloudEnabled } from '@/lib/supabase';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** The learner's account: who they're signed in as, sync status and sign-out. */
export default function AccountScreen() {
  const user = useGame((s) => s.user);
  return (
    <Screen>
      <BackHeader caption="پروفایل" title="حساب کاربری" />
      <ScrollView contentContainerStyle={styles.content}>{user ? <SignedIn /> : <Guest />}</ScrollView>
    </Screen>
  );
}

function Guest() {
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.notice}>
        <Mascot mood="think" size={84} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt w={900} size={17}>
            هنوز حساب نساختی
          </Txt>
          <Txt size={14} lh={1.8} color={colors.text2}>
            با یه حساب، پیشرفتت به اسم خودت ذخیره می‌شه{cloudEnabled ? ' و روی همه‌ی دستگاه‌ها یکیه' : ''}. کد تأیید هم لازم نیست.
          </Txt>
        </View>
      </View>
      <Button3D label="ساخت حساب" onPress={() => router.push('/signup')} />
      <Button3D label="حساب دارم؛ ورود" variant="secondary" size={16} onPress={() => router.push('/login')} />
    </View>
  );
}

function SignedIn() {
  const user = useGame((s) => s.user)!;
  const cloud = useCloud();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const since = cloud.lastSyncedAt ? Math.max(0, Math.round((now - cloud.lastSyncedAt) / 60000)) : null;
  const syncText = !user.cloud
    ? 'روی همین دستگاه ذخیره می‌شه'
    : cloud.status === 'syncing'
      ? 'در حال همگام‌سازی…'
      : cloud.status === 'error'
        ? 'همگام‌سازی نشد'
        : since == null
          ? 'به سرور وصله'
          : since < 1
            ? 'همین الان همگام شد'
            : `${fa(since)} دقیقه پیش همگام شد`;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Txt display size={30} color={colors.skyText}>
            {user.name.charAt(0)}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt w={900} size={18}>
            {user.name}
          </Txt>
          <Txt mono w={700} size={14} color={colors.text2}>
            {formatMobile(user.mobile)}
          </Txt>
        </View>
      </View>

      <View style={styles.rows}>
        <Row icon={user.cloud ? 'refresh' : 'phone'} label="ذخیره‌ی پیشرفت" value={syncText} tone={cloud.status === 'error' ? colors.bearText : colors.bullText} />
        <Row icon="clock" label="عضویت از" value={new Date(user.createdAt).toLocaleDateString('fa-IR')} />
      </View>
      {cloud.error && user.cloud ? (
        <Txt size={13} lh={1.7} color={colors.bearText}>
          {cloud.error}
        </Txt>
      ) : null}

      {user.cloud && (
        <Button3D label="همگام‌سازی الان" variant="secondary" size={16} disabled={cloud.status === 'syncing'} onPress={syncNow} />
      )}
      <Button3D
        label="خروج از حساب"
        variant="secondary"
        size={16}
        onPress={async () => {
          await logout();
          resetTo('/welcome');
        }}
      />
      <Txt size={12} lh={1.8} color={colors.text3} center>
        بعد از خروج، پیشرفتت روی این دستگاه می‌مونه و با ورود دوباره برمی‌گرده.
      </Txt>
    </View>
  );
}

function Row({ icon, label, value, tone = colors.text }: { icon: IconName; label: string; value: string; tone?: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={colors.text3} />
      <Txt w={700} size={14} color={colors.text2} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt w={800} size={14} color={tone}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skySoft,
  },
  rows: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
