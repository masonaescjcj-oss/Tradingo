import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { t } from '@/i18n';

import { CARD_H, CARD_W, type ShareCard } from './shareCard';

export type ShareOutcome = 'shared' | 'saved' | 'copied' | 'cancelled' | 'failed';

/** Only browsers build the picture from the SVG; phones capture the card on screen (shareCardPicture). */
export const canMakeImage = false;

export async function cardImageUrl(_card: ShareCard): Promise<string | null> {
  return null;
}

export async function shareCard(card: ShareCard): Promise<ShareOutcome> {
  try {
    const r = await Share.share({ message: card.text });
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}

/**
 * Phones: the card on screen (a CardPicture) becomes a 1080×1350 PNG in the cache and goes to
 * the share sheet. Where that isn't possible, the card's text is shared instead.
 */
export async function shareCardPicture(view: RefObject<View | null>, card: ShareCard): Promise<ShareOutcome> {
  try {
    if (!view.current || !(await Sharing.isAvailableAsync())) return shareCard(card);
    const ratio = PixelRatio.get();
    const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', width: CARD_W / ratio, height: CARD_H / ratio });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('به دوستات نشون بده') });
    // The share sheet doesn't say whether anything was sent.
    return 'cancelled';
  } catch {
    return shareCard(card);
  }
}

export async function saveCard(_card: ShareCard): Promise<ShareOutcome> {
  return 'failed';
}

/** Shares a message with a link, e.g. a duel invite. */
export async function shareText(text: string, url: string): Promise<ShareOutcome> {
  try {
    const r = await Share.share({ message: `${text}\n${url}` });
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}
