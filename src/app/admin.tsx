import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdminTabsHeader } from '@/components/admin/AdminHeader';
import { AiTab, LogTab, MessagesTab, RoomsTab, Stat, UsersTab } from '@/components/admin/AdminTabs';
import { BackHeader } from '@/components/BackHeader';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { adminAvailable, adminErrorText, fetchOverview, type AdminOverview, type AdminRoom, type AdminUser } from '@/lib/adminApi';
import { useCloud } from '@/lib/cloud';
import { colors } from '@/theme';

type AdminTab = 'reports' | 'rooms' | 'users' | 'messages' | 'ai' | 'log';

/** The admin panel: reports, accounts, messages, the AI key and a log of admin actions. */
export default function AdminScreen() {
  const admin = useCloud((s) => s.admin);
  const [tab, setTab] = useState<AdminTab>('reports');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [account, setAccount] = useState<AdminUser | null>(null);
  const [room, setRoom] = useState<AdminRoom | null>(null);
  const [missing, setMissing] = useState(false);

  const notify = useCallback((text: string) => setNotice(text), []);
  const refresh = useCallback(async () => {
    if (!(await adminAvailable())) return setMissing(true);
    const res = await fetchOverview();
    if (res.ok) setOverview(res.value);
    else setNotice(adminErrorText(res.error));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!admin || missing) {
    return (
      <Screen>
        <BackHeader title={t('پنل مدیریت')} />
        <View style={styles.center}>
          <Mascot mood="think" size={110} />
          <Txt size={15} lh={1.9} color={colors.text2} center>
            {missing ? t('بخش مدیریت هنوز روی سرور نصب نشده.') : t('این بخش فقط برای مدیرهاست.')}
          </Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader caption={t('چارتون')} title={t('پنل مدیریت')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {overview ? (
          <View style={styles.stats}>
            <Stat label={t('گزارش باز')} value={overview.open_reports} tone={overview.open_reports ? colors.bearText : colors.text} />
            <Stat label={t('کاربر')} value={overview.accounts} />
            <Stat label={t('کاربر جدید امروز')} value={overview.new_today} />
            <Stat label={t('پیام امروز')} value={overview.messages_today} />
            <Stat label={t('چت بسته')} value={overview.muted} />
            <Stat label={t('مسدود')} value={overview.banned} />
          </View>
        ) : null}

        <AdminTabsHeader
          tab={tab}
          reports={overview?.open_reports ?? 0}
          onChange={(next) => {
            setTab(next);
            if (next !== 'messages') {
              setAccount(null);
              setRoom(null);
            }
          }}
        />

        {notice ? (
          <Pressable onPress={() => setNotice(null)} style={styles.notice}>
            <Txt w={700} size={13} color={colors.gold}>
              {notice}
            </Txt>
          </Pressable>
        ) : null}

        {tab === 'reports' ? <MessagesTab reported notify={notify} onChanged={refresh} /> : null}
        {tab === 'messages' ? <MessagesTab reported={false} account={account} room={room} notify={notify} onChanged={refresh} /> : null}
        {tab === 'rooms' ? (
          <RoomsTab
            notify={notify}
            onChanged={refresh}
            onShowMessages={(r) => {
              setAccount(null);
              setRoom(r);
              setTab('messages');
            }}
          />
        ) : null}
        {tab === 'users' ? (
          <UsersTab
            notify={notify}
            onChanged={refresh}
            onShowMessages={(u) => {
              setRoom(null);
              setAccount(u);
              setTab('messages');
            }}
          />
        ) : null}
        {tab === 'ai' && overview ? <AiTab key={overview.ai.key_updated_at ?? 'none'} status={overview.ai} notify={notify} onSaved={() => void refresh()} /> : null}
        {tab === 'log' && overview ? <LogTab log={overview.log} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notice: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.goldCard,
    borderWidth: 1.5,
    borderColor: colors.goldCardLine,
  },
});
