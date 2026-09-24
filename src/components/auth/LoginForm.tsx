import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { login } from '@/lib/auth';
import { loginMethod, normalizeLogin, type LoginMethod } from '@/lib/login';
import { colors } from '@/theme';

import { AuthField } from './AuthField';
import { LOGIN_INVALID, LoginField, MethodTabs } from './LoginField';

/** Email (the default) or mobile number, and the password. `initialLogin` picks its tab. */
export function LoginForm({ initialLogin = '', onDone }: { initialLogin?: string; onDone: () => void }) {
  const first: LoginMethod = initialLogin ? loginMethod(initialLogin) : 'email';
  const [method, setMethod] = useState<LoginMethod>(first);
  const [typed, setTyped] = useState<Record<LoginMethod, string>>({ email: '', mobile: '', [first]: initialLogin });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeLogin(method, typed[method]);

  const submit = async () => {
    if (!normalized) {
      setError(LOGIN_INVALID[method]);
      return;
    }
    if (!password) {
      setError('رمز عبورت رو بنویس.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await login(normalized, password);
    setBusy(false);
    if (result) setError(result);
    else onDone();
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
      <LoginField method={method} value={typed[method]} onChangeText={(text) => setTyped((t) => ({ ...t, [method]: text }))} />
      <AuthField
        label="رمز عبور"
        icon="lock"
        ltr
        secret
        value={password}
        onChangeText={setPassword}
        placeholder="رمز عبورت"
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      {error ? (
        <View style={styles.error}>
          <Txt w={700} size={13} lh={1.7} color={colors.bearText}>
            {error}
          </Txt>
        </View>
      ) : null}
      <Button3D label={busy ? 'چند لحظه…' : 'ورود'} disabled={busy} onPress={submit} />
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
