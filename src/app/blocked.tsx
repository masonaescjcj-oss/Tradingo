import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { blockUser, fetchBlocked, profileErrorText, type BlockedUser } from '@/lib/profileApi';
import { colors } from '@/theme';

/** People the learner blocked; unblocking brings their messages back in the groups. */
export default function BlockedScreen() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      fetchBlocked().then((res) => {
        if (!live) return;
        if (res.ok) setUsers(res.value);
        else setError(profileErrorText(res.error));
      });
      return () => {
        live = false;
      };
    }, []),
  );

  const unblock = async (u: BlockedUser) => {
    const res = await blockUser(u.username, false);
    if (!res.ok) return setError(profileErrorText(res.error));
    setUsers((prev) => (prev ?? []).filter((x) => x.username !== u.username));
  };

  return (
    <Screen>
      <BackHeader caption={t('حساب کاربری')} title={t('کاربرهای بلاک‌شده')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Txt size={13.5} lh={1.9} color={colors.text2}>
          {t('پیام‌های کسایی که بلاک کردی توی گروه‌ها برات نشون داده نمی‌شه. اون‌ها نمی‌فهمن که بلاکشون کردی.')}
        </Txt>
        {error ? (
          <Txt w={700} size={13} color={colors.bearText}>
            {error}
          </Txt>
        ) : null}
        {users && !users.length ? (
          <View style={styles.empty}>
            <Mascot mood="happy" size={90} />
            <Txt w={700} size={14} color={colors.text2} center>
              {t('کسی رو بلاک نکردی.')}
            </Txt>
          </View>
        ) : null}
        {(users ?? []).map((u) => (
          <View key={u.username} style={styles.row}>
            <Pressable onPress={() => router.push({ pathname: '/u/[username]', params: { username: u.username } })} style={styles.who} accessibilityRole="button">
              <Avatar id={u.avatar} name={u.name} size={44} />
              <View style={{ flex: 1 }}>
                <Txt w={800} size={15} numberOfLines={1}>
                  {u.name}
                </Txt>
                <Txt mono w={700} size={12} color={colors.text3} numberOfLines={1}>
                  {`@${u.username}`}
                </Txt>
              </View>
            </Pressable>
            <Button3D label={t('رفع بلاک')} variant="secondary" size={14} height={40} onPress={() => unblock(u)} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  who: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
