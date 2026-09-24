import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { MIN_PASSWORD, register } from '@/lib/auth';
import { DEFAULT_COUNTRY } from '@/lib/countries';
import { normalizeLogin, type LoginMethod } from '@/lib/login';
import { cloudEnabled } from '@/lib/supabase';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { AuthField } from './AuthField';
import { LoginField, loginInvalid, MethodTabs } from './LoginField';

type Props = {
  initialName?: string;
  /** Called after the account is created. */
  onDone: (name: string) => void;
  /** Shows a "continue without an account" button. */
  onSkip?: (name: string) => void;
};

/** Email (the default) or mobile number, name and password; no verification code for now. */
export function SignupForm({ initialName = '', onDone, onSkip }: Props) {
  const [method, setMethod] = useState<LoginMethod>('email');
  const [typed, setTyped] = useState<Record<LoginMethod, string>>({ email: '', mobile: '' });
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeLogin(method, typed[method], country);
  const nameError = touched && !name.trim() ? t('اسمت رو بنویس.') : null;
  const loginError = touched && !normalized ? loginInvalid(method, country) : null;
  const passwordError = touched && password.length < MIN_PASSWORD ? t('رمز باید حداقل {n} کاراکتر باشه.', { n: fa(MIN_PASSWORD) }) : null;

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
      <MethodTabs
        method={method}
        onChange={(m) => {
          setMethod(m);
          setError(null);
        }}
      />
      <AuthField
        label={t('اسمت')}
        icon="user"
        value={name}
        onChangeText={setName}
        placeholder={t('مثلاً سارا')}
        maxLength={20}
        autoComplete="name"
        error={nameError}
        hint={t('توی لیگ و پروفایلت نشون داده می‌شه.')}
      />
      <LoginField
        method={method}
        value={typed[method]}
        onChangeText={(text) => setTyped((prev) => ({ ...prev, [method]: text }))}
        country={country}
        onCountry={setCountry}
        error={loginError}
        hint={method === 'email' ? t('به هیچ کاربری نشون داده نمی‌شه؛ کد تأیید هم لازم نیست.') : t('کد تأیید لازم نیست؛ برای شماره‌ی کشورهای دیگه روی پرچم بزن.')}
      />
      <AuthField
        label={t('رمز عبور')}
        icon="lock"
        ltr
        secret
        value={password}
        onChangeText={setPassword}
        placeholder={t('حداقل {n} کاراکتر', { n: fa(MIN_PASSWORD) })}
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
      <Button3D label={busy ? t('چند لحظه…') : t('ساخت حساب')} disabled={busy} onPress={submit} />
      {onSkip && (
        <Button3D label={t('فعلاً بدون حساب ادامه می‌دم')} variant="secondary" size={16} disabled={busy} onPress={() => onSkip(name.trim())} />
      )}
      <Txt size={12} lh={1.8} color={colors.text3} center>
        {t('با ساخت حساب،')}{' '}
        <Txt size={12} w={800} color={colors.skyText} onPress={() => router.push('/legal/terms')}>
          {t('شرایط استفاده')}
        </Txt>{' '}
        {t('و')}{' '}
        <Txt size={12} w={800} color={colors.skyText} onPress={() => router.push('/legal/privacy')}>
          {t('سیاست حریم خصوصی')}
        </Txt>
        {t(' رو قبول می‌کنی.')}
        {cloudEnabled ? '' : t(' فعلاً حساب روی همین دستگاه ذخیره می‌شه.')}
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
