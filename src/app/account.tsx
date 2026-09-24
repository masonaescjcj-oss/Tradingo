import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { deleteAccount, logout, uploadAccount } from '@/lib/auth';
import { resetTo } from '@/lib/nav';
import { adminErrorText, claimAdmin, roomsAvailable } from '@/lib/adminApi';
import { refreshStatus, syncNow, useCloud } from '@/lib/cloud';
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

      {!user.cloud && cloudEnabled && <MoveToServer />}
      {user.cloud && (
        <Button3D label="همگام‌سازی الان" variant="secondary" size={16} disabled={cloud.status === 'syncing'} onPress={syncNow} />
      )}
      {cloud.userId && !cloud.admin && <AdminCode />}
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
      <DeleteAccount />
    </View>
  );
}

/** Becoming an admin with the one-time setup code made on the server (no phone number needed). */
function AdminCode() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    roomsAvailable().then((ok) => live && setAvailable(ok));
    return () => {
      live = false;
    };
  }, []);
  if (!available) return null;
  const close = () => {
    setOpen(false);
    setCode('');
    setError(null);
  };
  return (
    <>
      <Txt size={13} w={800} color={colors.skyText} center onPress={() => setOpen(true)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
        کد راه‌اندازی مدیریت دارم
      </Txt>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Icon name="shield" size={40} color={colors.sky} />
            <Txt w={900} size={18} center>
              مدیر چارتون شو
            </Txt>
            <Txt size={13.5} lh={1.9} color={colors.text2} center>
              کدی که از سرور گرفتی رو وارد کن تا همین حساب مدیر بشه. هر کد فقط یه بار کار می‌کنه.
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <AuthField label="کد راه‌اندازی" icon="lock" ltr value={code} onChangeText={setCode} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false} error={error} />
            </View>
            <Button3D
              label={busy ? 'در حال بررسی…' : 'تأیید'}
              size={16}
              disabled={busy || !code.trim()}
              onPress={async () => {
                setBusy(true);
                const res = await claimAdmin(code);
                if (res.ok) await refreshStatus();
                setBusy(false);
                if (!res.ok) {
                  setError(adminErrorText(res.error));
                  return;
                }
                close();
                router.push('/admin');
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={close} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Deleting the account for good, confirmed with the password. */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setPassword('');
    setError(null);
  };
  return (
    <>
      <Button3D label="حذف حساب" variant="secondary" size={15} onPress={() => setOpen(true)} style={{ marginTop: 8 }} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Mascot mood="sad" size={84} />
            <Txt w={900} size={19} center>
              حسابت برای همیشه حذف بشه؟
            </Txt>
            <Txt size={13.5} lh={1.9} color={colors.text2} center>
              حساب، پیشرفت ذخیره‌شده روی سرور، امتیاز لیگ، پیام‌هات توی گروه‌ها، دوئل‌هایی که ساختی و پیشرفت روی همین دستگاه پاک می‌شه و برنمی‌گرده.
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <AuthField label="برای تأیید، رمز عبورت رو بزن" icon="lock" ltr secret value={password} onChangeText={setPassword} placeholder="رمز عبور" error={error} />
            </View>
            <Button3D
              label={busy ? 'در حال حذف…' : 'حذف همیشگی حساب'}
              variant="danger"
              size={16}
              disabled={busy || !password}
              onPress={async () => {
                setBusy(true);
                const err = await deleteAccount(password);
                setBusy(false);
                if (err) {
                  setError(err);
                  return;
                }
                close();
                resetTo('/welcome');
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="نه، منصرف شدم" variant="secondary" size={16} onPress={close} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

/** For accounts made before the server was ready: register them on the server with the same password. */
function MoveToServer() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <View style={styles.move}>
      <Txt w={900} size={15}>
        حسابت فقط روی این دستگاهه
      </Txt>
      <Txt size={13} lh={1.8} color={colors.text2}>
        با رمزت حساب رو به سرور منتقل کن تا روی گوشی و مرورگرهای دیگه هم با همین شماره وارد بشی.
      </Txt>
      <AuthField label="رمز عبور" icon="lock" ltr secret value={password} onChangeText={setPassword} placeholder="رمز عبورت" error={message} />
      <Button3D
        label={busy ? 'چند لحظه…' : 'انتقال به سرور'}
        size={16}
        disabled={busy || !password}
        onPress={async () => {
          setBusy(true);
          setMessage(await uploadAccount(password));
          setBusy(false);
        }}
      />
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
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5,8,15,0.75)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  move: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
