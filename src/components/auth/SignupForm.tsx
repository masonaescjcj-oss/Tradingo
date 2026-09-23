import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { MIN_PASSWORD, register } from '@/lib/auth';
import { normalizeMobile } from '@/lib/phone';
import { cloudEnabled } from '@/lib/supabase';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { AuthField } from './AuthField';

type Props = {
  initialName?: string;
  /** Called after the account is created. */
  onDone: (name: string) => void;
  /** Shows a "continue without an account" button. */
  onSkip?: (name: string) => void;
};

/** Name, mobile and password; no verification code for now. */
export function SignupForm({ initialName = '', onDone, onSkip }: Props) {
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeMobile(mobile);
  const nameError = touched && !name.trim() ? 'اسمت رو بنویس.' : null;
  const mobileError = touched && !normalized ? 'یه شماره موبایل درست بنویس؛ مثلاً ۰۹۱۲۳۴۵۶۷۸۹' : null;
  const passwordError = touched && password.length < MIN_PASSWORD ? `رمز باید حداقل ${fa(MIN_PASSWORD)} کاراکتر باشه.` : null;

  const submit = async () => {
    setTouched(true);
    if (!name.trim() || !normalized || password.length < MIN_PASSWORD) return;
    setBusy(true);
    setError(null);
    const result = await register(name, normalized, password);
    setBusy(false);
    if (result) setError(result);
    else onDone(name.trim());
  };

  return (
    <View style={{ gap: 14 }}>
      <AuthField
        label="اسمت"
        icon="user"
        value={name}
        onChangeText={setName}
        placeholder="مثلاً سارا"
        maxLength={20}
        autoComplete="name"
        error={nameError}
        hint="توی لیگ و پروفایلت نشون داده می‌شه."
      />
      <AuthField
        label="شماره موبایل"
        icon="phone"
        ltr
        value={mobile}
        onChangeText={setMobile}
        placeholder="09123456789"
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={16}
        error={mobileError}
        hint="کد تأیید لازم نیست؛ همین الان شروع کن."
      />
      <AuthField
        label="رمز عبور"
        icon="lock"
        ltr
        secret
        value={password}
        onChangeText={setPassword}
        placeholder={`حداقل ${fa(MIN_PASSWORD)} کاراکتر`}
        autoComplete="new-password"
        onSubmitEditing={submit}
        error={passwordError}
      />
      {error ? (
        <View style={styles.error}>
          <Txt w={700} size={13} lh={1.7} color={colors.bearText}>
            {error}
          </Txt>
        </View>
      ) : null}
      <Button3D label={busy ? 'چند لحظه…' : 'ساخت حساب'} disabled={busy} onPress={submit} />
      {onSkip && (
        <Button3D label="فعلاً بدون حساب ادامه می‌دم" variant="secondary" size={16} disabled={busy} onPress={() => onSkip(name.trim())} />
      )}
      <Txt size={12} lh={1.8} color={colors.text3} center>
        با ساخت حساب،{' '}
        <Txt size={12} w={800} color={colors.skyText} onPress={() => router.push('/about')}>
          شرایط استفاده و سلب مسئولیت
        </Txt>{' '}
        رو قبول می‌کنی.{cloudEnabled ? '' : ' فعلاً حساب روی همین دستگاه ذخیره می‌شه.'}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.bearSoft,
  },
});
