import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { colors, fonts } from '@/theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: IconName;
  /** Numbers and passwords are typed left to right. */
  ltr?: boolean;
  /** Adds a show/hide button and hides the text. */
  secret?: boolean;
  hint?: string;
  error?: string | null;
  /** Shown at the start of a left-to-right value (the country code of a number), after a divider. */
  prefix?: ReactNode;
};

/** A labelled text field with an icon, used by sign-up and login. */
export function AuthField({ label, icon, ltr, secret, hint, error, prefix, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const border = error ? colors.bear : focused ? colors.sky : colors.line;
  return (
    <View style={{ gap: 6 }}>
      <Txt w={800} size={13} color={colors.text2}>
        {label}
      </Txt>
      <View style={[styles.box, { borderColor: border }]}>
        <Icon name={icon} size={20} color={focused ? colors.skyText : colors.text3} />
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={colors.faint}
          secureTextEntry={secret && !shown}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, ltr ? styles.ltr : styles.rtl]}
        />
        {prefix ? (
          <>
            <View style={styles.divider} />
            {prefix}
          </>
        ) : null}
        {secret && (
          <Pressable
            onPress={() => setShown((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'پنهان کردن رمز' : 'نمایش رمز'}
            hitSlop={8}
          >
            <Txt w={800} size={12} color={colors.skyText}>
              {shown ? 'پنهان' : 'نمایش'}
            </Txt>
          </Pressable>
        )}
      </View>
      {error ? (
        <Txt w={700} size={12} color={colors.bearText}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt size={12} color={colors.text3}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    outlineWidth: 0,
  },
  divider: {
    width: 1.5,
    height: 26,
    borderRadius: 1,
    backgroundColor: colors.line,
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
