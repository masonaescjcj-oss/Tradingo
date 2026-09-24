import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { useNow } from '@/components/useNow';
import { t } from '@/i18n';
import { applyUpdate, promptInstall } from '@/lib/pwa';
import { showInstallNudge, useInstallNudge, usePwa, type InstallMode } from '@/lib/pwaState';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

const OFFLINE_NOTE = 'بعد از نصب، درس‌ها و شبیه‌ساز بدون اینترنت هم باز می‌شن؛ لیگ، دوئل با دوست و گفتگو اینترنت لازم دارن.'; // i18n-ignore: translated where shown

const HINT: Record<Exclude<InstallMode, null>, string> = {
  prompt: 'مثل یه اپ جدا باز می‌شه و بدون اینترنت هم کار می‌کنه.', // i18n-ignore: translated where shown
  ios: 'با دکمه‌ی اشتراک سافاری به صفحه‌ی اصلی اضافه‌ش کن.', // i18n-ignore: translated where shown
  manual: 'از منوی مرورگر «نصب برنامه» رو بزن.', // i18n-ignore: translated where shown
};

/** Installs through the browser's prompt, or opens the steps where there's no prompt. */
function useInstall() {
  const mode = usePwa((s) => s.mode);
  const [help, setHelp] = useState(false);
  const install = () => {
    if (mode === 'prompt') void promptInstall();
    else setHelp(true);
  };
  const sheet = <InstallHelp mode={mode} visible={help} onClose={() => setHelp(false)} />;
  return { mode, install, sheet };
}

/** A settings row for installing the web app; hidden on native and once installed. */
export function InstallRow() {
  const installed = usePwa((s) => s.installed);
  const { mode, install, sheet } = useInstall();
  if (Platform.OS !== 'web' || installed || !mode) return null;
  return (
    <>
      <Pressable onPress={install} accessibilityRole="button" style={styles.row}>
        <Icon name="phone" size={22} color={colors.bull} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt w={800} size={14}>
            {t('نصب اپ چارتون')}
          </Txt>
          <Txt w={500} size={12} lh={1.6} color={colors.text3}>
            {t(HINT[mode])}
          </Txt>
        </View>
        <Icon name="chevronBack" size={18} color={colors.text3} />
      </Pressable>
      {sheet}
    </>
  );
}

/** A slim banner under the path's header for learners who keep coming back; closing it hides it for two weeks. */
export function InstallBanner() {
  const installed = usePwa((s) => s.installed);
  const lessons = useGame((s) => Object.values(s.completed).filter((r) => !r.skipped).length);
  const dismissedAt = useInstallNudge((s) => s.dismissedAt);
  const dismiss = useInstallNudge((s) => s.dismiss);
  const { mode, install, sheet } = useInstall();
  const now = useNow(Platform.OS === 'web', 60_000);
  if (Platform.OS !== 'web' || !showInstallNudge({ mode, installed, dismissedAt, now, lessons })) return null;
  return (
    <View style={styles.banner}>
      <Mascot mood="happy" size={38} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt w={900} size={14}>
          {t('چارتون رو نصب کن')}
        </Txt>
        <Txt w={500} size={11.5} lh={1.6} color={colors.text2} numberOfLines={2}>
          {mode ? t(HINT[mode]) : ''}
        </Txt>
      </View>
      <Button3D label={t('نصب')} height={38} radius={11} edge={3} size={14} onPress={install} style={{ minWidth: 64 }} />
      <Pressable onPress={() => dismiss(Date.now())} accessibilityRole="button" accessibilityLabel={t('بعداً')} hitSlop={10}>
        <Icon name="close" size={18} color={colors.text3} />
      </Pressable>
      {sheet}
    </View>
  );
}

/** Step-by-step install for browsers without a prompt (Safari on iOS, other phone browsers). */
function InstallHelp({ mode, visible, onClose }: { mode: InstallMode; visible: boolean; onClose: () => void }) {
  const steps =
    mode === 'ios'
      ? [
          t('توی سافاری، دکمه‌ی اشتراک رو بزن (مربعی که فلش رو به بالا داره).'),
          t('«Add to Home Screen» یا «افزودن به صفحه‌ی اصلی» رو انتخاب کن.'),
          t('«Add» یا «افزودن» رو بزن؛ شمعک روی صفحه‌ی اصلی گوشیت میاد.'),
        ]
      : [
          t('منوی مرورگر (سه نقطه‌ی بالا یا پایین صفحه) رو باز کن.'),
          t('«Install app»، «نصب برنامه» یا «Add to Home screen» رو بزن.'),
          t('تأیید کن تا آیکون چارتون روی گوشیت بیاد.'),
        ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Mascot mood="party" size={84} />
          <Txt w={900} size={18} center>
            {t('چارتون رو به صفحه‌ی اصلی اضافه کن')}
          </Txt>
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            {steps.map((s, i) => (
              <View key={s} style={styles.step}>
                <View style={styles.stepNum}>
                  <Txt w={900} size={14} color={colors.bullInk}>
                    {fa(i + 1)}
                  </Txt>
                </View>
                <Txt w={700} size={14} lh={1.8} style={{ flex: 1 }}>
                  {s}
                </Txt>
                {mode === 'ios' && i === 0 ? <Icon name="share" size={20} color={colors.sky} /> : null}
              </View>
            ))}
          </View>
          <Txt w={500} size={12.5} lh={1.8} color={colors.text3} center>
            {t(OFFLINE_NOTE)}
          </Txt>
          <Button3D label={t('فهمیدم')} onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}

/** Tells the learner a new release is ready; it swaps in only when they tap. */
export function UpdateBanner() {
  const ready = usePwa((s) => s.updateReady);
  const [hidden, setHidden] = useState(false);
  const insets = useSafeAreaInsets();
  if (!ready || hidden) return null;
  return (
    <View style={[styles.update, { top: insets.top + 10 }]} accessibilityLiveRegion="polite">
      <Icon name="refresh" size={20} color={colors.sky} />
      <Txt w={800} size={13.5} style={{ flex: 1 }}>
        {t('نسخه‌ی تازه‌ی چارتون آماده‌ست')}
      </Txt>
      <Button3D label={t('به‌روزرسانی')} height={36} radius={10} edge={3} size={13.5} onPress={applyUpdate} />
      <Pressable onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel={t('بستن')} hitSlop={8}>
        <Icon name="close" size={18} color={colors.text3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5,8,15,0.75)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
  },
  update: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.raised,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
