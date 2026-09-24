import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { LoginMethod } from '@/lib/login';
import { colors } from '@/theme';

import { AuthField } from './AuthField';

const METHODS: [LoginMethod, string, IconName][] = [
  ['email', 'ایمیل', 'mail'],
  ['mobile', 'شماره موبایل', 'phone'],
];

/** What the forms say when the login typed isn't valid. */
export const LOGIN_INVALID: Record<LoginMethod, string> = {
  email: 'یه ایمیل درست بنویس؛ مثلاً name@gmail.com',
  mobile: 'یه شماره موبایل ایران بنویس؛ مثلاً ۰۹۱۲۳۴۵۶۷۸۹',
};

/** Email (the default) or mobile number, as two tabs at the top of the sign-in and sign-up forms. */
export function MethodTabs({ method, onChange }: { method: LoginMethod; onChange: (m: LoginMethod) => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {METHODS.map(([key, label, icon]) => {
        const on = key === method;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <Icon name={icon} size={18} color={on ? colors.skyText : colors.text3} />
            <Txt w={800} size={14} color={on ? colors.skyText : colors.text2}>
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

type FieldProps = {
  method: LoginMethod;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  hint?: string;
  onSubmitEditing?: () => void;
};

/** The email field, or the mobile field with Iran's code in front (the only country for now). */
export function LoginField({ method, hint, ...field }: FieldProps) {
  if (method === 'email') {
    return (
      <AuthField
        key="email"
        label="ایمیل"
        icon="mail"
        ltr
        placeholder="name@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={254}
        returnKeyType="next"
        hint={hint}
        {...field}
      />
    );
  }
  return (
    <AuthField
      key="mobile"
      label="شماره موبایل"
      icon="phone"
      ltr
      prefix={<IranCode />}
      placeholder="912 345 6789"
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      maxLength={16}
      returnKeyType="next"
      hint={hint ?? 'فعلاً فقط شماره‌های ایران'}
      {...field}
    />
  );
}

/** 🇮🇷 +98, drawn so it looks the same on every phone and browser. */
function IranCode() {
  return (
    <View style={styles.code} accessible accessibilityLabel="ایران، ۹۸+">
      {/* In the right-to-left row the first child sits on the right: +98, then the flag to its left. */}
      <Txt mono w={700} size={14} color={colors.text2}>
        {'‎+98'}
      </Txt>
      <Svg width={24} height={16} viewBox="0 0 24 16">
        <Rect x={0} y={0} width={24} height={5.4} fill="#239F40" />
        <Rect x={0} y={5.3} width={24} height={5.4} fill="#FFFFFF" />
        <Rect x={0} y={10.6} width={24} height={5.4} fill="#DA0000" />
        <Path d="M12 5.9c-.95.6-1.4 1.4-1.4 2.15 0 .75.55 1.35 1.4 1.55.85-.2 1.4-.8 1.4-1.55 0-.75-.45-1.55-1.4-2.15z" fill="#DA0000" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  tab: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
});
