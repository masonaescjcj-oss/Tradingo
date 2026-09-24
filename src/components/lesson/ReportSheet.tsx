import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { MAX_REPORT_MESSAGE, parseStepRef, REPORT_REASONS, sendReport, type ReportReason } from '@/lib/reportApi';
import { useKeyboardOverlap } from '@/lib/keyboard';
import { colors, fonts } from '@/theme';

type Phase = { at: 'form' } | { at: 'sending' } | { at: 'done'; queued: boolean } | { at: 'refused' };

/** Flags the lesson step on screen: pick what's wrong, add a note if you like, send. */
export function ReportSheet({ stepRef, stepType, visible, onClose }: { stepRef: string; stepType: string; visible: boolean; onClose: () => void }) {
  const keyboard = useKeyboardOverlap();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<Phase>({ at: 'form' });
  const where = parseStepRef(stepRef);

  const close = () => {
    onClose();
    setReason(null);
    setMessage('');
    setPhase({ at: 'form' });
  };

  const send = async () => {
    if (!reason || !where) return;
    setPhase({ at: 'sending' });
    const outcome = await sendReport({ lesson: where.lesson, step: where.step, stepType, reason, message });
    setPhase(outcome === 'rejected' ? { at: 'refused' } : { at: 'done', queued: outcome === 'queued' });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, { paddingBottom: 20 + keyboard.overlap }]} onLayout={keyboard.onLayout}>
        <View style={styles.dialog} accessibilityViewIsModal>
          {phase.at === 'done' || phase.at === 'refused' ? (
            <>
              <Mascot mood={phase.at === 'done' ? 'party' : 'think'} size={90} />
              <Txt w={900} size={19} center>
                {phase.at === 'done' ? 'ممنون که گفتی!' : 'گزارش ثبت نشد'}
              </Txt>
              <Txt w={500} size={14} lh={1.8} color={colors.text2} center>
                {phase.at === 'refused'
                  ? 'امروز گزارش زیادی فرستادی یا مشکلی پیش اومد. فردا دوباره امتحان کن.'
                  : phase.queued
                    ? 'الان اینترنت نداری؛ گزارشت ذخیره شد و وقتی وصل شدی خودش فرستاده می‌شه.'
                    : 'گزارشت رسید. این مرحله رو بررسی و درست می‌کنیم.'}
              </Txt>
              <Button3D label="برگشت به درس" onPress={close} style={{ alignSelf: 'stretch' }} />
            </>
          ) : (
            <>
              <View style={styles.head}>
                <Icon name="flag" size={22} color={colors.gold} strokeWidth={2.4} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt w={900} size={18}>
                    گزارش مشکل
                  </Txt>
                  <Txt w={500} size={12.5} color={colors.text3}>
                    این مرحله چه مشکلی داره؟
                  </Txt>
                </View>
                <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="بستن" hitSlop={8}>
                  <Icon name="close" size={22} color={colors.text3} />
                </Pressable>
              </View>
              <View style={{ gap: 8, alignSelf: 'stretch' }} accessibilityRole="radiogroup">
                {REPORT_REASONS.map((r) => {
                  const on = r.id === reason;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReason(r.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[styles.option, on && styles.optionOn]}
                    >
                      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                      <Txt w={800} size={14.5} color={on ? colors.skyText : colors.text}>
                        {r.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={message}
                onChangeText={(t) => setMessage(t.slice(0, MAX_REPORT_MESSAGE))}
                placeholder="توضیح بیشتر (اختیاری)"
                placeholderTextColor={colors.faint}
                multiline
                accessibilityLabel="توضیح بیشتر"
                style={styles.input}
              />
              <Button3D label={phase.at === 'sending' ? 'در حال فرستادن…' : 'فرستادن گزارش'} disabled={!reason || !where || phase.at === 'sending'} onPress={send} style={{ alignSelf: 'stretch' }} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5,8,15,0.75)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  optionOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.sky,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.sky,
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 72,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'right',
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
});
