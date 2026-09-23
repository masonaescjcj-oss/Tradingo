import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useGame } from '@/store/game';

export type Sfx = 'correct' | 'wrong' | 'complete' | 'chest';

const SOURCES: Record<Sfx, number> = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  chest: require('../../assets/sounds/chest.wav'),
};

// Short effects are reused for the whole session, so the players are created once and kept.
const players: Partial<Record<Sfx, AudioPlayer>> = {};

function haptic(name: Sfx) {
  // The Web Vibration API buzzes whole phones for small UI cues; keep haptics to native apps.
  if (Platform.OS === 'web') return;
  const run =
    name === 'correct'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : name === 'wrong'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  run.catch(() => {});
}

/** Plays a sound effect with matching haptics, unless the learner turned sound off. */
export function playSfx(name: Sfx) {
  if (!useGame.getState().sound) return;
  try {
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players[name] = player;
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Audio can be unavailable (autoplay rules, no output device); the app works silently.
  }
  haptic(name);
}
