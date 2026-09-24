import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import {
  actOnUser,
  adminErrorText,
  fetchAdminMessages,
  fetchUsers,
  logDetail,
  logText,
  moderateMessage,
  saveAiSettings,
  deleteRoom,
  fetchRooms,
  type AdminLogEntry,
  type AdminMessage,
  type AdminRoom,
  type AdminUser,
  type AiStatus,
  type UserAction,
  type UserFilter,
} from '@/lib/adminApi';
import { whenText } from '@/lib/chat';
import { useCloud } from '@/lib/cloud';
import { latinDigits } from '@/lib/phone';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { ActionSheet, adminStyles, Badge, Card, MessageCard, Segments, SmallButton, UserCard, type SheetOption } from './AdminBits';

type Sheet = { title: string; body?: string; options: SheetOption[]; withReason?: boolean } | null;
type Notify = (text: string) => void;

const MUTE_CHOICES: [string, number | null][] = [
  ['۱ ساعت', 1],
  ['۲۴ ساعت', 24],
  ['۷ روز', 24 * 7],
  ['تا وقتی خودم باز کنم', null],
];

/** The account actions shared by the reports, messages and users tabs. */
function useUserActions(notify: Notify, onChanged: (u: AdminUser) => void) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const run = async (id: string, action: UserAction, opts: { hours?: number | null; reason?: string } = {}, done?: string) => {
    setSheet(null);
    const res = await actOnUser(id, action, opts);
    if (!res.ok) return notify(adminErrorText(res.error));
    onChanged(res.value);
    if (done) notify(done);
  };
  const ask = {
    mute: (id: string, name: string) =>
      setSheet({
        title: `چت ${name} بسته بشه؟`,
        body: 'پیام‌ها رو می‌تونه بخونه ولی نمی‌تونه پیام بفرسته یا گروه بسازه.',
        options: MUTE_CHOICES.map(([label, hours]) => ({ label, variant: 'secondary' as const, run: (reason) => run(id, 'mute', { hours, reason }, `چت ${name} بسته شد.`) })),
        withReason: true,
      }),
    ban: (id: string, name: string) =>
      setSheet({
        title: `حساب ${name} مسدود بشه؟`,
        body: 'از همه‌ی دستگاه‌ها خارج می‌شه، دیگه نمی‌تونه وارد بشه، همه‌ی پیام‌هاش پنهان می‌شه و از لیگ این هفته بیرون می‌ره.',
        options: [{ label: 'مسدود کن', variant: 'danger', run: (reason) => run(id, 'ban', { reason }, `${name} مسدود شد.`) }],
        withReason: true,
      }),
    purge: (id: string, name: string) =>
      setSheet({
        title: `همه‌ی پیام‌های ${name} پاک بشه؟`,
        options: [{ label: 'پاک کن', variant: 'danger', run: () => run(id, 'purge', {}, `پیام‌های ${name} پاک شد.`) }],
      }),
    role: (id: string, name: string, admin: boolean) =>
      setSheet({
        title: admin ? `دسترسی مدیری ${name} برداشته بشه؟` : `${name} مدیر بشه؟`,
        body: admin ? undefined : 'مدیرها به همین پنل، حذف پیام، بستن چت، مسدود کردن و کلید هوش مصنوعی دسترسی دارن.',
        options: [{ label: admin ? 'بردار' : 'مدیر کن', variant: admin ? 'danger' : 'primary', run: () => run(id, admin ? 'remove_admin' : 'make_admin') }],
      }),
    unmute: (id: string) => run(id, 'unmute'),
    unban: (id: string) => run(id, 'unban'),
  };
  const element = sheet ? <ActionSheet {...sheet} onClose={() => setSheet(null)} /> : null;
  return { ask, element };
}

function Empty({ text }: { text: string }) {
  return (
    <Txt size={14} color={colors.text3} center style={{ paddingVertical: 32 }}>
      {text}
    </Txt>
  );
}

/** Reported messages waiting for a decision, most reported first; or the latest messages. */
export function MessagesTab({
  reported,
  account,
  room,
  notify,
  onChanged,
}: {
  reported: boolean;
  account?: AdminUser | null;
  room?: AdminRoom | null;
  notify: Notify;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<AdminMessage[] | null>(null);
  const [more, setMore] = useState(true);
  const load = async (before?: number) => {
    const res = await fetchAdminMessages({ reported, account: account?.id, room: room?.id, before });
    if (!res.ok) return notify(adminErrorText(res.error));
    setMore(res.value.length === 50 && !reported);
    setItems((prev) => (before && prev ? [...prev, ...res.value] : res.value));
  };
  useEffect(() => {
    let live = true;
    fetchAdminMessages({ reported, account: account?.id, room: room?.id }).then((res) => {
      if (!live) return;
      if (!res.ok) return notify(adminErrorText(res.error));
      setMore(res.value.length === 50 && !reported);
      setItems(res.value);
    });
    return () => {
      live = false;
    };
  }, [reported, account?.id, room?.id, notify]);

  const patchAuthor = (u: AdminUser) =>
    setItems((prev) => prev?.map((m) => (m.author_id === u.id ? { ...m, author_muted: u.muted, author_banned: u.banned, hidden: u.banned || m.hidden } : m)) ?? null);
  const { ask, element } = useUserActions(notify, (u) => {
    patchAuthor(u);
    onChanged();
  });

  const decide = async (m: AdminMessage, action: 'delete' | 'keep') => {
    const res = await moderateMessage(m.id, action);
    if (!res.ok) return notify(adminErrorText(res.error));
    setItems((prev) => (reported ? prev?.filter((x) => x.id !== m.id) : prev?.map((x) => (x.id === m.id ? { ...x, hidden: action === 'delete', reviewed_at: new Date().toISOString() } : x))) ?? null);
    onChanged();
  };

  if (!items) return <ActivityIndicator color={colors.bull} style={{ marginTop: 32 }} />;
  return (
    <View style={styles.list}>
      {account ? <Txt w={800} size={13} color={colors.text2}>{`پیام‌های ${account.name}`}</Txt> : null}
      {room ? (
        <View style={styles.roomHead}>
          <Txt w={800} size={13} color={colors.text2} style={{ flex: 1 }}>{`پیام‌های گروه «${room.title}»، پنهان‌شده‌ها هم هستن`}</Txt>
          <SmallButton label="رفتن به گروه" onPress={() => router.push(`/chat/${room.id}`)} />
        </View>
      ) : null}
      {items.length === 0 ? <Empty text={reported ? 'گزارشی نمونده 🎉' : 'پیامی نیست.'} /> : null}
      {items.map((m) => (
        <MessageCard
          key={m.id}
          message={m}
          actions={
            <>
              {!m.hidden ? <SmallButton label="حذف پیام" tone="danger" onPress={() => decide(m, 'delete')} /> : <SmallButton label="برگردوندن پیام" onPress={() => decide(m, 'keep')} />}
              {reported && !m.hidden ? <SmallButton label="مشکلی نداره" tone="good" onPress={() => decide(m, 'keep')} /> : null}
              {m.author_id && !m.author_muted && !m.author_banned ? <SmallButton label="بستن چت نویسنده" onPress={() => ask.mute(m.author_id!, m.author_name)} /> : null}
              {m.author_id && !m.author_banned ? <SmallButton label="مسدود کردن نویسنده" tone="danger" onPress={() => ask.ban(m.author_id!, m.author_name)} /> : null}
            </>
          }
        />
      ))}
      {more && items.length > 0 ? <Button3D label="پیام‌های قدیمی‌تر" variant="secondary" size={14} onPress={() => load(items[items.length - 1].id)} /> : null}
      {element}
    </View>
  );
}

const FILTERS: [UserFilter, string][] = [
  ['all', 'همه'],
  ['reported', 'گزارش‌شده'],
  ['muted', 'چت بسته'],
  ['banned', 'مسدود'],
  ['admins', 'مدیرها'],
];

/** Accounts: search by name, email or mobile, filter by standing, and act on them. */
export function UsersTab({ notify, onChanged, onShowMessages }: { notify: Notify; onChanged: () => void; onShowMessages: (u: AdminUser) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [items, setItems] = useState<AdminUser[] | null>(null);
  useEffect(() => {
    let live = true;
    // Waits for a pause in typing before searching.
    const t = setTimeout(() => {
      fetchUsers(query, filter).then((res) => {
        if (!live) return;
        if (!res.ok) return notify(adminErrorText(res.error));
        setItems(res.value);
      });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, filter, notify]);
  const myLogin = useCloud((s) => s.login);
  const { ask, element } = useUserActions(notify, (u) => {
    setItems((prev) => prev?.map((x) => (x.id === u.id ? u : x)) ?? null);
    onChanged();
  });

  return (
    <View style={styles.list}>
      <TextInput value={query} onChangeText={setQuery} placeholder="جستجوی اسم، ایمیل یا شماره" placeholderTextColor={colors.faint} style={adminStyles.input} />
      <View style={styles.chips}>
        {FILTERS.map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} accessibilityRole="radio" accessibilityState={{ checked: filter === key }} style={[styles.chip, filter === key && styles.chipOn]}>
            <Txt w={800} size={12} color={filter === key ? colors.skyText : colors.text2}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>
      {!items ? <ActivityIndicator color={colors.bull} style={{ marginTop: 24 }} /> : null}
      {items && items.length === 0 ? <Empty text="کسی پیدا نشد." /> : null}
      {items?.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          actions={
            <>
              <SmallButton label="پیام‌ها" onPress={() => onShowMessages(u)} />
              {/* Nothing to do to your own account here; the server refuses it anyway. */}
              {(u.email ?? u.mobile) === myLogin ? null : (
                <>
                  {u.muted ? <SmallButton label="باز کردن چت" tone="good" onPress={() => ask.unmute(u.id)} /> : u.role !== 'admin' && !u.banned ? <SmallButton label="بستن چت" onPress={() => ask.mute(u.id, u.name)} /> : null}
                  {u.banned ? <SmallButton label="رفع مسدودی" tone="good" onPress={() => ask.unban(u.id)} /> : u.role !== 'admin' ? <SmallButton label="مسدود کردن" tone="danger" onPress={() => ask.ban(u.id, u.name)} /> : null}
                  {u.messages > 0 ? <SmallButton label="پاک کردن پیام‌ها" tone="danger" onPress={() => ask.purge(u.id, u.name)} /> : null}
                  {!u.banned ? <SmallButton label={u.role === 'admin' ? 'برداشتن مدیری' : 'مدیر کردن'} onPress={() => ask.role(u.id, u.name, u.role === 'admin')} /> : null}
                </>
              )}
            </>
          }
        />
      ))}
      {element}
    </View>
  );
}

/**
 * Every group, official ones first: its numbers, its messages (hidden ones too, via the
 * messages tab), the group itself, and deleting a group learners made.
 */
export function RoomsTab({ notify, onChanged, onShowMessages }: { notify: Notify; onChanged: () => void; onShowMessages: (r: AdminRoom) => void }) {
  const [items, setItems] = useState<AdminRoom[] | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  useEffect(() => {
    let live = true;
    fetchRooms().then((res) => {
      if (!live) return;
      if (!res.ok) return notify(adminErrorText(res.error));
      setItems(res.value);
    });
    return () => {
      live = false;
    };
  }, [notify]);

  const remove = (r: AdminRoom) =>
    setSheet({
      title: `گروه «${r.title}» حذف بشه؟`,
      body: 'گروه با همه‌ی پیام‌هاش برای همیشه پاک می‌شه و اعضاش ازش بیرون می‌رن.',
      options: [
        {
          label: 'حذف گروه',
          variant: 'danger',
          run: async () => {
            setSheet(null);
            const res = await deleteRoom(r.id);
            if (!res.ok) return notify(adminErrorText(res.error));
            setItems((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
            notify(`گروه «${r.title}» حذف شد.`);
            onChanged();
          },
        },
      ],
    });

  if (!items) return <ActivityIndicator color={colors.bull} style={{ marginTop: 32 }} />;
  return (
    <View style={styles.list}>
      {items.length === 0 ? <Empty text="گروهی نیست." /> : null}
      {items.map((r) => (
        <Card key={r.id}>
          <View style={styles.roomHead}>
            <Txt w={900} size={15} style={{ flex: 1 }} numberOfLines={1}>
              {r.title}
            </Txt>
            {r.official ? <Badge label="رسمی" color={colors.skySoft} ink={colors.skyText} /> : null}
            {r.open_reports > 0 ? <Badge label={`${fa(r.open_reports)} گزارش`} color={colors.bearSoft} ink={colors.bearText} /> : null}
          </View>
          <Txt size={12} lh={1.7} color={colors.text3}>
            {[
              r.official ? null : `سازنده: ${r.owner_name ?? 'حساب حذف‌شده'}`,
              `${fa(r.member_count)} عضو`,
              `${fa(r.messages)} پیام`,
              r.hidden ? `${fa(r.hidden)} پنهان` : null,
              r.messages ? `آخرین پیام: ${whenText(r.last_message_at)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
          <View style={styles.actionsRow}>
            <SmallButton label="پیام‌ها" onPress={() => onShowMessages(r)} />
            <SmallButton label="رفتن به گروه" onPress={() => router.push(`/chat/${r.id}`)} />
            {!r.official ? <SmallButton label="حذف گروه" tone="danger" onPress={() => remove(r)} /> : null}
          </View>
        </Card>
      ))}
      {sheet ? <ActionSheet {...sheet} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

/** The AI assistant's key, provider, model and daily limit. The key is write-only here. */
export function AiTab({ status, notify, onSaved }: { status: AiStatus; notify: Notify; onSaved: (s: AiStatus) => void }) {
  const [provider, setProvider] = useState<'anthropic' | 'openai'>(status.provider);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(status.model ?? '');
  const [baseUrl, setBaseUrl] = useState(status.base_url ?? '');
  const [limit, setLimit] = useState(status.daily_limit ? String(status.daily_limit) : '');
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const save = async (clearKey = false) => {
    setConfirmClear(false);
    const n = Number(latinDigits(limit));
    setSaving(true);
    const res = await saveAiSettings({ key: clearKey ? '' : key, clearKey, provider, model, baseUrl: provider === 'openai' ? baseUrl : '', dailyLimit: limit.trim() ? n : null });
    setSaving(false);
    if (!res.ok) return notify(adminErrorText(res.error));
    setKey('');
    onSaved(res.value);
    notify(clearKey ? 'کلید حذف شد.' : 'تنظیمات ذخیره شد؛ از پیام بعدی دستیار اعمال می‌شه.');
  };

  return (
    <View style={styles.list}>
      <Card>
        <Txt w={900} size={15}>
          وضعیت کلید
        </Txt>
        <Txt size={13} lh={1.8} color={status.key_set ? colors.bullText : colors.text2}>
          {status.key_set
            ? `کلید ثبت شده (…${status.key_hint ?? ''})${status.key_updated_at ? ` · ${whenText(status.key_updated_at)}` : ''}`
            : 'اینجا کلیدی ثبت نشده؛ اگه کلید توی Secrets داشبورد Supabase باشه، از همون استفاده می‌شه.'}
        </Txt>
      </Card>

      <Txt w={800} size={13} color={colors.text2}>
        سرویس
      </Txt>
      <Segments
        value={provider}
        options={[
          ['anthropic', 'Anthropic (Claude)'],
          ['openai', 'سازگار با OpenAI'],
        ]}
        onChange={setProvider}
      />
      <Txt w={800} size={13} color={colors.text2}>
        کلید API جدید
      </Txt>
      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder={status.key_set ? 'خالی بذاری، همون کلید قبلی می‌مونه' : 'کلید رو اینجا بذار'}
        placeholderTextColor={colors.faint}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={[adminStyles.input, styles.ltr]}
      />
      <Txt w={800} size={13} color={colors.text2}>
        مدل
      </Txt>
      <TextInput
        value={model}
        onChangeText={setModel}
        placeholder={provider === 'anthropic' ? 'پیش‌فرض: claude-sonnet-5' : 'مثلاً gpt-4o-mini'}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        style={[adminStyles.input, styles.ltr]}
      />
      {provider === 'openai' ? (
        <>
          <Txt w={800} size={13} color={colors.text2}>
            آدرس API
          </Txt>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.example.com/v1"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[adminStyles.input, styles.ltr]}
          />
        </>
      ) : null}
      <Txt w={800} size={13} color={colors.text2}>
        سقف پیام هر کاربر در روز
      </Txt>
      <TextInput value={limit} onChangeText={setLimit} placeholder="پیش‌فرض: ۴۰" placeholderTextColor={colors.faint} keyboardType="number-pad" style={adminStyles.input} />
      <Button3D label={saving ? 'در حال ذخیره…' : 'ذخیره'} size={16} disabled={saving} onPress={() => save()} style={{ marginTop: 4 }} />
      {status.key_set ? <SmallButton label="حذف کلید ثبت‌شده" tone="danger" onPress={() => setConfirmClear(true)} /> : null}
      <Txt size={12} lh={1.8} color={colors.text3}>
        کلید فقط روی سرور ذخیره می‌شه و هیچ‌جا نمایش داده نمی‌شه (حتی اینجا فقط چهار حرف آخرش). هر تغییر توی «سابقه» ثبت می‌شه.
      </Txt>
      {confirmClear ? (
        <ActionSheet
          title="کلید ثبت‌شده حذف بشه؟"
          body="دستیار تا وقتی کلید جدید بذاری (یا کلید Secrets داشبورد باشه) کار نمی‌کنه."
          options={[{ label: 'حذف کن', variant: 'danger', run: () => save(true) }]}
          onClose={() => setConfirmClear(false)}
        />
      ) : null}
    </View>
  );
}

/** What admins did, newest first. */
export function LogTab({ log }: { log: AdminLogEntry[] }) {
  if (!log.length) return <Empty text="هنوز کاری ثبت نشده." />;
  return (
    <View style={styles.list}>
      {log.map((l) => (
        <View key={l.id} style={styles.logRow}>
          <Txt size={13} lh={1.8}>
            <Txt w={900} size={13}>
              {l.admin_name}
            </Txt>
            {` ${logText(l.action, l.target_name)}`}
          </Txt>
          {l.detail ? (
            <Txt size={12} color={colors.text3} numberOfLines={2}>
              {logDetail(l.action, l.detail)}
            </Txt>
          ) : null}
          <Txt size={11} color={colors.faint}>
            {whenText(l.created_at)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Txt w={900} size={20} color={tone ?? colors.text}>
        {fa(value)}
      </Txt>
      <Txt w={700} size={11} color={colors.text3} center>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  roomHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  list: {
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  logRow: {
    gap: 2,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
