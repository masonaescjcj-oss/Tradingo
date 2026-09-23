import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { login } from '@/lib/auth';
import { normalizeMobile } from '@/lib/phone';
import { colors } from '@/theme';

import { AuthField } from './AuthField';

/** Mobile + password sign-in. */
export function LoginForm({ initialMobile = '', onDone }: { initialMobile?: string; onDone: () => void }) {
  const [mobile, setMobile] = useState(initialMobile);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeMobile(mobile);

  const submit = async () => {
    if (!normalized) {
      setError('یه شماره موبایل درست بنویس؛ مثلاً ۰۹۱۲۳۴۵۶۷۸۹');
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
      />
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
