import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { t } from '@/i18n';
import { playSfx } from '@/lib/sfx';
import { CARD_H, CARD_W, cardSvg, type ShareCard } from '@/lib/shareCard';
import { canMakeImage, cardImageUrl, saveCard, shareCard, type ShareOutcome } from '@/lib/shareImage';
import { colors } from '@/theme';

import { Button3D } from './Button3D';
import { Icon } from './Icon';
import { Txt } from './Txt';

const OUTCOME_TEXT: Partial<Record<ShareOutcome, string>> = {
  shared: 'فرستاده شد!', // i18n-ignore: translated where shown
  saved: 'عکس ذخیره شد و متنش هم کپی شد.', // i18n-ignore: translated where shown
  copied: 'متنش کپی شد؛ هر جا خواستی بفرستش.', // i18n-ignore: translated where shown
  failed: 'نشد؛ یه بار دیگه امتحان کن.', // i18n-ignore: translated where shown
};

/** Shows an achievement card and shares it (as a picture on the web, as text on phones for now). */
export function ShareSheet({ card, onClose }: { card: ShareCard | null; onClose: () => void }) {
  return (
    <Modal visible={!!card} transparent animationType="fade" onRequestClose={onClose}>
      {card ? <ShareBody key={`${card.kind}:${card.hero}:${card.title}`} card={card} onClose={onClose} /> : null}
    </Modal>
  );
}

function ShareBody({ card, onClose }: { card: ShareCard; onClose: () => void }) {
  const screen = useWindowDimensions();
  const w = Math.min(330, screen.width - 72, ((screen.height - 250) * CARD_W) / CARD_H);
  const h = (w * CARD_H) / CARD_W;
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);

  // The web preview is the very picture that gets shared.
  useEffect(() => {
    if (!canMakeImage) return;
    let alive = true;
    let made: string | null = null;
    cardImageUrl(card).then((u) => {
      if (alive) {
        made = u;
        setUrl(u);
      } else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [card]);

  const run = async (action: (c: ShareCard) => Promise<ShareOutcome>) => {
    if (busy) return;
    setBusy(true);
    const result = await action(card);
    setBusy(false);
    setOutcome(result === 'cancelled' ? null : result);
    if (result === 'shared' || result === 'saved') playSfx('chest');
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('بستن')} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Txt w={900} size={17} style={{ flex: 1 }}>
            {t('به دوستات نشون بده')}
          </Txt>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('بستن')} hitSlop={8} style={styles.close}>
            <Icon name="close" size={18} color={colors.text2} strokeWidth={2.6} />
          </Pressable>
        </View>
        <View style={[styles.preview, { width: w, height: h }]} accessible accessibilityLabel={`${card.kicker}: ${card.hero} ${card.heroLabel}. ${card.title}`}>
          {canMakeImage ? (
            url ? (
              <Image source={{ uri: url }} style={{ width: w, height: h }} resizeMode="contain" />
            ) : (
              <ActivityIndicator color={card.accent} />
            )
          ) : (
            <SvgXml xml={cardSvg(card)} width={w} height={h} />
          )}
        </View>
        <Button3D label={busy ? t('یه لحظه…') : t('اشتراک‌گذاری')} onPress={() => run(shareCard)} height={50} radius={14} size={16} style={{ alignSelf: 'stretch' }} />
        {canMakeImage ? (
          <Button3D variant="secondary" label={t('ذخیره‌ی عکس')} onPress={() => run(saveCard)} height={44} radius={14} edge={3} size={14} style={{ alignSelf: 'stretch' }} />
        ) : null}
        {outcome && OUTCOME_TEXT[outcome] ? (
          <Txt w={800} size={13} color={outcome === 'failed' ? colors.bearText : colors.bullText} center>
            {t(OUTCOME_TEXT[outcome])}
          </Txt>
        ) : null}
      </View>
    </View>
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
  sheet: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  head: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
});
