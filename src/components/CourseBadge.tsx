import { StyleSheet, View } from 'react-native';

import type { Course, CourseLevel } from '@/content';
import { colors } from '@/theme';

import { CandleGlyph } from './CandleGlyph';
import { Txt } from './Txt';

export const LEVEL_COLOR: Record<CourseLevel, string> = {
  beginner: colors.bullText,
  intermediate: colors.gold,
  advanced: colors.bearText,
};

/** The course's square icon: a short Latin label or a candle glyph on the course colour. */
export function CourseBadge({ course, size = 48 }: { course: Course; size?: number }) {
  const { badge } = course;
  const text = badge.kind === 'text' ? badge.text : '';
  const fontSize = size * (text.length <= 2 ? 0.4 : text.length === 3 ? 0.32 : 0.26);
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: course.color, borderBottomColor: course.edge, borderBottomWidth: Math.max(3, size * 0.07) },
      ]}
    >
      {badge.kind === 'glyph' ? (
        <View style={[styles.glyph, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.16 }]}>
          <CandleGlyph kind={badge.glyph} size={size * 0.5} />
        </View>
      ) : (
        <Txt mono w={800} size={fontSize} color={course.ink} style={{ letterSpacing: -0.5 }}>
          {text}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    direction: 'ltr',
  },
  glyph: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,19,32,0.82)',
  },
});
