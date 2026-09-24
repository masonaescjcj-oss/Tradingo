import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { isEn, t, textStart } from '@/i18n';
import { COUNTRIES, DEFAULT_COUNTRY, findCountry, flagOf, type Country } from '@/lib/countries';
import { useKeyboardOverlap } from '@/lib/keyboard';
import type { LoginMethod } from '@/lib/login';
import { latinDigits } from '@/lib/phone';
import { colors, fonts } from '@/theme';

import { AuthField } from './AuthField';

const METHODS: [LoginMethod, string, IconName][] = [
  ['email', 'ایمیل', 'mail'], // i18n-ignore: translated where shown
  ['mobile', 'شماره موبایل', 'phone'], // i18n-ignore: translated where shown
];

/** What the forms say when the login typed isn't valid (numbers: for the picked country). */
export function loginInvalid(method: LoginMethod, iso: string = DEFAULT_COUNTRY): string {
  if (method === 'email') return t('یه ایمیل درست بنویس؛ مثلاً name@gmail.com');
  return iso === 'IR' ? t('یه شماره موبایل ایران بنویس؛ مثلاً ۰۹۱۲۳۴۵۶۷۸۹') : t('شماره موبایل درست نیست؛ کشور رو درست انتخاب کن و شماره رو بدون کد کشور بنویس.');
}

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
              {t(label)}
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
  /** The picked country for numbers (ISO code); Iran by default. */
  country?: string;
  onCountry?: (iso: string) => void;
  error?: string | null;
  hint?: string;
  onSubmitEditing?: () => void;
};

/** The email field, or the mobile field with the country's flag and code in front (Iran by default). */
export function LoginField({ method, hint, country = DEFAULT_COUNTRY, onCountry, ...field }: FieldProps) {
  const [picking, setPicking] = useState(false);
  if (method === 'email') {
    return (
      <AuthField
        key="email"
        label={t('ایمیل')}
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
  const c = findCountry(country);
  return (
    <>
      <AuthField
        key="mobile"
        label={t('شماره موبایل')}
        icon="phone"
        ltr
        prefix={<CountryCode country={c} onPress={onCountry ? () => setPicking(true) : undefined} />}
        placeholder={c.iso === 'IR' ? '912 345 6789' : t('شماره بدون کد کشور')}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={18}
        returnKeyType="next"
        hint={hint ?? t('برای شماره‌ی کشورهای دیگه، روی پرچم بزن.')}
        {...field}
      />
      {onCountry ? (
        <CountrySheet
          visible={picking}
          current={c.iso}
          onClose={() => setPicking(false)}
          onPick={(iso) => {
            setPicking(false);
            onCountry(iso);
          }}
        />
      ) : null}
    </>
  );
}

/** A country's flag: Iran's drawn (so it looks the same everywhere), the rest as emoji. */
function Flag({ iso }: { iso: string }) {
  if (iso !== 'IR') {
    return (
      <Txt size={18} style={{ lineHeight: 22 }}>
        {flagOf(iso)}
      </Txt>
    );
  }
  return (
    <Svg width={24} height={16} viewBox="0 0 24 16">
      <Rect x={0} y={0} width={24} height={5.4} fill="#239F40" />
      <Rect x={0} y={5.3} width={24} height={5.4} fill="#FFFFFF" />
      <Rect x={0} y={10.6} width={24} height={5.4} fill="#DA0000" />
      <Path d="M12 5.9c-.95.6-1.4 1.4-1.4 2.15 0 .75.55 1.35 1.4 1.55.85-.2 1.4-.8 1.4-1.55 0-.75-.45-1.55-1.4-2.15z" fill="#DA0000" />
    </Svg>
  );
}

/** 🇮🇷 +98 in front of the number; tapping it picks another country. */
function CountryCode({ country, onPress }: { country: Country; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('کشور: {name}، {dial}+. برای تغییر بزن', { name: isEn() ? country.en : country.fa, dial: country.dial })} style={styles.code}>
      {/* In the right-to-left row the first child sits on the right: the arrow, +98, then the flag to its left. */}
      {onPress ? <Icon name="chevronDown" size={14} color={colors.text3} strokeWidth={2.6} /> : null}
      <Txt mono w={700} size={14} color={colors.text2}>
        {`\u200E+${country.dial}`}
      </Txt>
      <Flag iso={country.iso} />
    </Pressable>
  );
}

/** Picking a country for the number: Iran first, then the rest; searchable by name or code. */
function CountrySheet({ visible, current, onPick, onClose }: { visible: boolean; current: string; onPick: (iso: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const [query, setQuery] = useState('');
  const q = latinDigits(query).trim().toLowerCase().replace(/^\+/, '');
  const list = q ? COUNTRIES.filter((c) => c.fa.includes(query.trim()) || c.en.toLowerCase().includes(q) || c.dial.startsWith(q)) : COUNTRIES;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setQuery('')}>
      <View style={[styles.sheetBackdrop, { paddingBottom: keyboard.overlap }]} onLayout={keyboard.onLayout}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('بستن')} />
        <View style={[styles.sheet, { paddingBottom: 12 + (keyboard.overlap ? 0 : insets.bottom) }]}>
          <Txt w={900} size={18}>
            {t('کشور شماره')}
          </Txt>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('جستجوی اسم کشور یا کد')}
            placeholderTextColor={colors.faint}
            autoCorrect={false}
            style={[styles.search, { textAlign: textStart() }]}
          />
          <FlatList
            data={list}
            keyExtractor={(c) => c.iso}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 420 }}
            renderItem={({ item: c }) => {
              const on = c.iso === current;
              return (
                <Pressable onPress={() => onPick(c.iso)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.country, on && styles.countryOn]}>
                  <Flag iso={c.iso} />
                  <View style={{ flex: 1 }}>
                    <Txt w={800} size={14.5}>
                      {isEn() ? c.en : c.fa}
                    </Txt>
                    {/* The English name under the Persian one; in English it would only repeat it. */}
                    {isEn() ? null : (
                      <Txt size={11.5} color={colors.text3}>
                        {c.en}
                      </Txt>
                    )}
                  </View>
                  <Txt mono w={700} size={13} color={colors.text2}>
                    {`\u200E+${c.dial}`}
                  </Txt>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
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
    gap: 6,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,8,15,0.7)',
  },
  sheet: {
    gap: 10,
    padding: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  search: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  countryOn: {
    backgroundColor: colors.skySoft,
  },
});
