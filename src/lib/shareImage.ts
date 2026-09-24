import { Share } from 'react-native';

import type { ShareCard } from './shareCard';

export type ShareOutcome = 'shared' | 'saved' | 'copied' | 'cancelled' | 'failed';

/** Phones can't turn the card into a picture without a native module yet, so they share its text. */
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

export async function saveCard(_card: ShareCard): Promise<ShareOutcome> {
  return 'failed';
}
