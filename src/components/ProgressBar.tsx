import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = { value: number; height?: number; color?: string; track?: string; label?: string };

/** Rounded bar that fills from the start edge (the right, in RTL). */
export function ProgressBar({ value, height = 16, color = colors.bull, track = colors.raised, label }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
    >
      {pct > 0 && (
        <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }}>
          {height >= 14 && <View style={[styles.shine, { top: height * 0.2 }]} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    flexGrow: 1,
  },
  shine: {
    position: 'absolute',
    start: 8,
    end: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
