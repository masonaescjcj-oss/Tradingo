import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { Icon, type IconName } from '@/components/Icon';
import { KeyboardScroll } from '@/components/KeyboardScroll';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { dateLocale, t } from '@/i18n';
import { deleteAccount, logout, uploadAccount } from '@/lib/auth';
import { syncNow, useCloud } from '@/lib/cloud';
import { loginText } from '@/lib/login';
import { resetTo } from '@/lib/nav';
import { cloudEnabled } from '@/lib/supabase';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** The learner's account: who they're signed in as, sync status and sign-out. */
export default function AccountScreen() {
  const user = useGame((s) => s.user);
  return (
    <Screen>
      <BackHeader caption={t('پروفایل')} title={t('حساب کاربری')} />
      <KeyboardScroll contentContainerStyle={styles.content}>{user ? <SignedIn /> : <Guest />}</KeyboardScroll>
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
            {t('هنوز حساب نساختی')}
          </Txt>
          <Txt size={14} lh={1.8} color={colors.text2}>
            {cloudEnabled
              ? t('با یه حساب، پیشرفتت به اسم خودت ذخیره می‌شه و روی همه‌ی دستگاه‌ها یکیه. کد تأیید هم لازم نیست.')
              : t('با یه حساب، پیشرفتت به اسم خودت ذخیره می‌شه. کد تأیید هم لازم نیست.')}
          </Txt>
        </View>
      </View>
      <Button3D label={t('ساخت حساب')} onPress={() => router.push('/signup')} />
      <Button3D label={t('حساب دارم؛ ورود')} variant="secondary" size={16} onPress={() => router.push('/login')} />
    </View>
  );
}

function SignedIn() {
  const user = useGame((s) => s.user)!;
  const avatar = useGame((s) => s.avatar);
  const cloud = useCloud();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const since = cloud.lastSyncedAt ? Math.max(0, Math.round((now - cloud.lastSyncedAt) / 60000)) : null;
  const syncText = !user.cloud
    ? t('روی همین دستگاه ذخیره می‌شه')
    : cloud.status === 'syncing'
      ? t('در حال همگام‌سازی…')
      : cloud.status === 'error'
        ? t('همگام‌سازی نشد')
        : since == null
          ? t('به سرور وصله')
          : since < 1
            ? t('همین الان همگام شد')
            : t('{n} دقیقه پیش همگام شد', { n: fa(since), count: since });

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Avatar id={avatar} name={user.name} size={60} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt w={900} size={18}>
            {user.name}
          </Txt>
          {user.username ? (
            <Txt mono w={700} size={13} color={colors.skyText} numberOfLines={1}>
              {`@${user.username}`}
            </Txt>
          ) : null}
          <Txt mono w={700} size={14} color={colors.text2} numberOfLines={1}>
            {loginText(user.login)}
          </Txt>
        </View>
      </View>

      <View style={styles.rows}>
        <Row icon={user.cloud ? 'refresh' : 'phone'} label={t('ذخیره‌ی پیشرفت')} value={syncText} tone={cloud.status === 'error' ? colors.bearText : colors.bullText} />
        <Row icon="clock" label={t('عضویت از')} value={new Date(user.createdAt).toLocaleDateString(dateLocale())} />
      </View>
      {cloud.error && user.cloud ? (
        <Txt size={13} lh={1.7} color={colors.bearText}>
          {cloud.error}
        </Txt>
      ) : null}

      {!user.cloud && cloudEnabled && <MoveToServer />}
      {user.cloud && (
        <Button3D label={t('همگام‌سازی الان')} variant="secondary" size={16} disabled={cloud.status === 'syncing'} onPress={syncNow} />
      )}
      {cloud.userId ? <Button3D label={t('کاربرهای بلاک‌شده')} variant="secondary" size={16} onPress={() => router.push('/blocked')} /> : null}
      <Button3D
        label={t('خروج از حساب')}
        variant="secondary"
        size={16}
        onPress={async () => {
          await logout();
          resetTo('/welcome');
        }}
      />
      <Txt size={12} lh={1.8} color={colors.text3} center>
        {t('بعد از خروج، پیشرفتت روی این دستگاه می‌مونه و با ورود دوباره برمی‌گرده.')}
      </Txt>
      <DeleteAccount />
    </View>
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
      <Button3D label={t('حذف حساب')} variant="secondary" size={15} onPress={() => setOpen(true)} style={{ marginTop: 8 }} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Mascot mood="sad" size={84} />
            <Txt w={900} size={19} center>
              {t('حسابت برای همیشه حذف بشه؟')}
            </Txt>
            <Txt size={13.5} lh={1.9} color={colors.text2} center>
              {t('حساب، پیشرفت ذخیره‌شده روی سرور، امتیاز لیگ، پیام‌هات توی گروه‌ها، دوئل‌هایی که ساختی و پیشرفت روی همین دستگاه پاک می‌شه و برنمی‌گرده.')}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <AuthField
                label={t('برای تأیید، رمز عبورت رو بزن')}
                icon="lock"
                ltr
                secret
                value={password}
                onChangeText={setPassword}
                placeholder={t('رمز عبور')}
                error={error}
              />
            </View>
            <Button3D
              label={busy ? t('در حال حذف…') : t('حذف همیشگی حساب')}
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
            <Button3D label={t('نه، منصرف شدم')} variant="secondary" size={16} onPress={close} style={{ alignSelf: 'stretch' }} />
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
        {t('حسابت فقط روی این دستگاهه')}
      </Txt>
      <Txt size={13} lh={1.8} color={colors.text2}>
        {t('با رمزت حساب رو به سرور منتقل کن تا روی گوشی و مرورگرهای دیگه هم با همین ایمیل یا شماره وارد بشی.')}
      </Txt>
      <AuthField
        label={t('رمز عبور')}
        icon="lock"
        ltr
        secret
        value={password}
        onChangeText={setPassword}
        placeholder={t('رمز عبورت')}
        error={message}
      />
      <Button3D
        label={busy ? t('چند لحظه…') : t('انتقال به سرور')}
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
