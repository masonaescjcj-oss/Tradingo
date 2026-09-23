import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { signIn, signOut, signUp, syncNow, useCloud } from '@/lib/cloud';
import { useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa } from '@/utils/format';

/** Sign in to keep progress in the cloud and play in the real league. */
export default function AccountScreen() {
  const cloud = useCloud();
  const onboarded = useGame((s) => s.onboarded);

  return (
    <Screen>
      <BackHeader caption="حساب کاربری" title={cloud.email ? 'همگام‌سازی' : 'ورود یا ثبت‌نام'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {cloud.status === 'off' ? (
          <Notice mood="think" title="حساب ابری هنوز وصل نشده" body="این نسخه به سرور وصل نیست؛ پیشرفتت فقط روی همین دستگاه ذخیره می‌شه." />
        ) : cloud.email ? (
          <SignedIn onboarded={onboarded} />
        ) : (
          <AuthForm />
        )}
      </ScrollView>
    </Screen>
  );
}

function SignedIn({ onboarded }: { onboarded: boolean }) {
  const cloud = useCloud();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const since = cloud.lastSyncedAt ? Math.max(0, Math.round((now - cloud.lastSyncedAt) / 60000)) : null;
  const statusText =
    cloud.status === 'syncing'
      ? 'در حال همگام‌سازی…'
      : cloud.status === 'error'
        ? 'همگام‌سازی نشد'
        : since == null
          ? 'هنوز همگام‌سازی نشده'
          : since < 1
            ? 'همین الان همگام شد'
            : `${fa(since)} دقیقه پیش همگام شد`;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Icon name="user" size={28} color={colors.skyText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt mono w={700} size={14} numberOfLines={1}>
            {cloud.email}
          </Txt>
          <Txt w={700} size={13} color={cloud.status === 'error' ? colors.bearText : colors.bullText}>
            {statusText}
          </Txt>
        </View>
      </View>
      {cloud.error ? (
        <Txt size={13} lh={1.7} color={colors.bearText}>
          {cloud.error}
        </Txt>
      ) : null}
      <View style={styles.perks}>
        <Perk icon="refresh" text="پیشرفتت روی همه‌ی دستگاه‌ها یکیه" />
        <Perk icon="trophy" text="توی لیگ با بازیکن‌های واقعی رقابت می‌کنی" />
        <Perk icon="shield" text="با پاک شدن مرورگر یا گوشی، پیشرفتت از بین نمی‌ره" />
      </View>
      {!onboarded && <Button3D label="انتخاب مسیر یادگیری" onPress={() => router.replace('/setup')} />}
      {onboarded && <Button3D label="برو به درس‌ها" onPress={() => router.dismissTo('/(tabs)')} />}
      <Button3D label="همگام‌سازی الان" variant="secondary" size={16} disabled={cloud.status === 'syncing'} onPress={syncNow} />
      <Button3D label="خروج از حساب" variant="secondary" size={16} onPress={signOut} />
      <Txt size={12} lh={1.7} color={colors.text3} center>
        بعد از خروج، پیشرفت روی این دستگاه می‌مونه و دفعه‌ی بعد با حسابت ادغام می‌شه.
      </Txt>
    </View>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result === 'confirm') {
      setMessage({ tone: 'info', text: 'یه لینک تأیید به ایمیلت فرستادیم. بعد از تأیید، همین‌جا وارد شو.' });
      setMode('signin');
    } else if (result) {
      setMessage({ tone: 'error', text: result });
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Notice
        mood="happy"
        title="پیشرفتت رو امن نگه دار"
        body="با یه حساب رایگان، درس‌ها و امتیازهات روی همه‌ی دستگاه‌ها ذخیره می‌شه و توی لیگ واقعی بازی می‌کنی."
      />
      <View style={styles.tabs}>
        {(['signin', 'signup'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.tab, mode === m && styles.tabOn]}
          >
            <Txt w={800} size={15} color={mode === m ? colors.skyText : colors.text2}>
              {m === 'signin' ? 'ورود' : 'ثبت‌نام'}
            </Txt>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="ایمیل"
        placeholderTextColor={colors.faint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="ایمیل"
        style={[styles.input, styles.ltr]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="رمز عبور (حداقل ۶ کاراکتر)"
        placeholderTextColor={colors.faint}
        secureTextEntry
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        accessibilityLabel="رمز عبور"
        onSubmitEditing={() => valid && !busy && submit()}
        style={[styles.input, styles.ltr]}
      />
      {message ? (
        <Txt size={14} lh={1.7} color={message.tone === 'error' ? colors.bearText : colors.skyText}>
          {message.text}
        </Txt>
      ) : null}
      <Button3D label={busy ? '…' : mode === 'signin' ? 'ورود' : 'ساخت حساب'} disabled={!valid || busy} onPress={submit} />
    </View>
  );
}

function Notice({ mood, title, body }: { mood: 'happy' | 'think'; title: string; body: string }) {
  return (
    <View style={styles.notice}>
      <Mascot mood={mood} size={80} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt w={900} size={17}>
          {title}
        </Txt>
        <Txt size={14} lh={1.8} color={colors.text2}>
          {body}
        </Txt>
      </View>
    </View>
  );
}

function Perk({ icon, text }: { icon: 'refresh' | 'trophy' | 'shield'; text: string }) {
  return (
    <View style={styles.perk}>
      <Icon name={icon} size={20} color={colors.bull} />
      <Txt w={700} size={14} style={{ flex: 1 }}>
        {text}
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabOn: {
    backgroundColor: colors.skySoft,
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    outlineWidth: 0,
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skySoft,
  },
  perks: {
    gap: 10,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
