import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, AVATARS } from '@/components/Avatar';
import { Button3D } from '@/components/Button3D';
import { Txt } from '@/components/Txt';
import { useCloud } from '@/lib/cloud';
import { useKeyboardOverlap } from '@/lib/keyboard';
import { normalizeUsername, profileErrorText, saveProfile, usernameProblem } from '@/lib/profileApi';
import { useGame } from '@/store/game';
import { colors, fonts } from '@/theme';

/** Choosing a profile picture: the first letter of the name, or one of the drawn pictures. */
export function AvatarSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const name = useGame((s) => s.name);
  const avatar = useGame((s) => s.avatar);
  const username = useGame((s) => s.user?.username);
  const signedIn = useCloud((s) => s.userId != null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (id: number) => {
    if (busy) return;
    const before = avatar;
    useGame.getState().setAvatar(id);
    setError(null);
    // Signed in: everyone sees the new picture in the chat and on the profile.
    if (signedIn && username) {
      setBusy(true);
      const res = await saveProfile(username, id);
      setBusy(false);
      if (!res.ok) {
        useGame.getState().setAvatar(before);
        setError(profileErrorText(res.error));
        return;
      }
    }
    onClose();
  };

  const options = [0, ...AVATARS.map((a) => a.id)];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]} onPress={() => {}}>
          <Txt w={900} size={19}>
            عکس پروفایل
          </Txt>
          <Txt size={13} lh={1.8} color={colors.text2}>
            {signedIn ? 'توی گروه‌ها و پروفایلت برای بقیه دیده می‌شه.' : 'وقتی حساب بسازی، توی گروه‌ها هم دیده می‌شه.'}
          </Txt>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={styles.grid}>
            {options.map((id) => {
              const on = id === avatar;
              const label = id === 0 ? 'حرف اول اسم' : (AVATARS[id - 1]?.label ?? '');
              return (
                <Pressable
                  key={id}
                  onPress={() => pick(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={label}
                  style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && { opacity: 0.75 }]}
                >
                  <Avatar id={id} name={name} size={58} />
                </Pressable>
              );
            })}
          </ScrollView>
          {error ? (
            <Txt w={700} size={13} color={colors.bearText}>
              {error}
            </Txt>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Changing the account's @ID, the unique name people can tell it apart by. */
export function UsernameSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const current = useGame((s) => s.user?.username ?? '');
  const avatar = useGame((s) => s.avatar);
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = normalizeUsername(draft);

  const save = async () => {
    const problem = usernameProblem(clean);
    if (problem) return setError(problem);
    if (clean === current) return onClose();
    setBusy(true);
    const res = await saveProfile(clean, avatar);
    setBusy(false);
    if (!res.ok) return setError(profileErrorText(res.error));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setDraft(current)}>
      <View style={[styles.backdrop, { paddingBottom: keyboard.overlap }]} onLayout={keyboard.onLayout}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="بستن" />
        <View style={[styles.sheet, { paddingBottom: 20 + (keyboard.overlap ? 0 : insets.bottom) }]}>
          <Txt w={900} size={19}>
            آیدی
          </Txt>
          <Txt size={13} lh={1.8} color={colors.text2}>
            با آیدی، بقیه تو رو از هم‌اسم‌هات تشخیص می‌دن. ۳ تا ۲۰ حرف انگلیسی، عدد یا _، که با حرف شروع بشه.
          </Txt>
          <View style={[styles.field, error && { borderColor: colors.bear }]}>
            <Txt mono w={800} size={17} color={colors.text3}>
              @
            </Txt>
            <TextInput
              value={draft}
              onChangeText={(v) => {
                setDraft(v);
                setError(null);
              }}
              onSubmitEditing={save}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              maxLength={21}
              placeholder="trader_ali"
              placeholderTextColor={colors.faint}
              accessibilityLabel="آیدی"
              style={styles.input}
            />
          </View>
          {error ? (
            <Txt w={700} size={13} color={colors.bearText}>
              {error}
            </Txt>
          ) : null}
          <Button3D label={busy ? 'چند لحظه…' : 'ذخیره'} disabled={busy} onPress={save} />
          <Button3D label="بی‌خیال" variant="secondary" size={16} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,8,15,0.7)',
  },
  sheet: {
    gap: 12,
    padding: 20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  option: {
    padding: 4,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionOn: {
    borderColor: colors.bull,
  },
  field: {
    height: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    direction: 'ltr',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 16,
    textAlign: 'left',
    writingDirection: 'ltr',
    outlineWidth: 0,
  },
});
