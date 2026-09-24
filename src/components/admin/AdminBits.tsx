import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { roomTime, untilText, whenText } from '@/lib/chat';
import type { AdminMessage, AdminUser } from '@/lib/adminApi';
import { colors, fonts } from '@/theme';
import { fa } from '@/utils/format';

export type SheetOption = { label: string; variant?: 'primary' | 'danger' | 'secondary' | 'gold'; run: (reason: string) => void };

/** A confirm-or-choose sheet for admin actions, with an optional note (the reason for a ban). */
export function ActionSheet({
  title,
  body,
  options,
  withReason,
  onClose,
}: {
  title: string;
  body?: string;
  options: SheetOption[];
  withReason?: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Txt w={900} size={17} center>
            {title}
          </Txt>
          {body ? (
            <Txt size={13} lh={1.8} color={colors.text2} center>
              {body}
            </Txt>
          ) : null}
          {withReason ? (
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="دلیل (اختیاری، فقط مدیرها می‌بینن)"
              placeholderTextColor={colors.faint}
              maxLength={200}
              style={adminStyles.input}
            />
          ) : null}
          {options.map((o) => (
            <Button3D key={o.label} label={o.label} variant={o.variant ?? 'primary'} size={15} onPress={() => o.run(reason.trim())} style={{ alignSelf: 'stretch' }} />
          ))}
          <Button3D label="بی‌خیال" variant="secondary" size={15} onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Badge({ label, color, ink }: { label: string; color: string; ink: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Txt w={800} size={11} color={ink}>
        {label}
      </Txt>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SmallButton({ label, onPress, tone = 'normal' }: { label: string; onPress: () => void; tone?: 'normal' | 'danger' | 'good' }) {
  const color = tone === 'danger' ? colors.bearText : tone === 'good' ? colors.bullText : colors.skyText;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.small, tone === 'danger' && styles.smallDanger]}>
      <Txt w={800} size={12.5} color={color}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A message in the panel: where, who, when and what, with its reports and state. */
export function MessageCard({ message: m, actions }: { message: AdminMessage; actions: ReactNode }) {
  return (
    <Card>
      <View style={styles.row}>
        <Txt w={900} size={14} style={{ flex: 1 }} numberOfLines={1}>
          {m.author_name}
        </Txt>
        {m.author_banned ? <Badge label="مسدود" color={colors.bearSoft} ink={colors.bearText} /> : null}
        {m.author_muted ? <Badge label="چت بسته" color={colors.goldSoft} ink={colors.gold} /> : null}
        {m.reports > 0 ? <Badge label={`${fa(m.reports)} گزارش`} color={colors.bearSoft} ink={colors.bearText} /> : null}
        {m.hidden ? <Badge label="پنهان" color={colors.raised} ink={colors.text3} /> : null}
      </View>
      <Txt size={12} color={colors.text3}>
        {`${m.room_title} · ${whenText(m.created_at)}`}
      </Txt>
      <Txt size={14} lh={1.8} color={m.hidden ? colors.text3 : colors.text}>
        {m.kind === 'analysis' && !m.body ? 'تحلیل با نمودار' : m.body}
      </Txt>
      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

/** An account in the panel with its standing. */
export function UserCard({ user: u, actions }: { user: AdminUser; actions: ReactNode }) {
  const mutedFor = u.muted ? (u.muted_until ? untilText(u.muted_until) : 'تا وقتی باز بشه') : '';
  return (
    <Card>
      <View style={styles.row}>
        <Txt w={900} size={15} style={{ flex: 1 }} numberOfLines={1}>
          {u.name}
        </Txt>
        {u.role === 'admin' ? <Badge label="مدیر" color={colors.skySoft} ink={colors.skyText} /> : null}
        {u.banned ? <Badge label="مسدود" color={colors.bearSoft} ink={colors.bearText} /> : null}
        {u.muted ? <Badge label="چت بسته" color={colors.goldSoft} ink={colors.gold} /> : null}
      </View>
      <Txt mono size={12} color={colors.text2} numberOfLines={1}>
        {u.email ?? u.mobile}
      </Txt>
      <Txt size={12} lh={1.7} color={colors.text3}>
        {[
          `عضویت: ${roomTime(u.created_at)}`,
          u.last_seen ? `آخرین بازدید: ${roomTime(u.last_seen)}` : null,
          `${fa(u.messages)} پیام`,
          u.reported ? `${fa(u.reported)} گزارش` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Txt>
      {u.banned && u.ban_reason ? (
        <Txt size={12} color={colors.bearText}>{`دلیل مسدودی: ${u.ban_reason}`}</Txt>
      ) : null}
      {mutedFor ? <Txt size={12} color={colors.gold}>{`چت بسته ${mutedFor}`}</Txt> : null}
      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

export function Segments<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segments} accessibilityRole="tablist">
      {options.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.segment, on && styles.segmentOn]}>
            <Txt w={800} size={12.5} color={on ? colors.skyText : colors.text2} numberOfLines={1}>
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  card: {
    gap: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  smallDanger: {
    borderColor: colors.bearSheetLine,
    backgroundColor: colors.bearSheet,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1.5,
    borderColor: colors.lineSoft,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  segmentOn: {
    backgroundColor: colors.skySoft,
  },
});
