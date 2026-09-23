import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { CourseBadge, LEVEL_COLOR } from '@/components/CourseBadge';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { CATEGORIES, LEVEL_LABEL, courseProgress, findCourse, isQuestion } from '@/content';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** A course's page: what it teaches, its units and lessons, and the button to add or continue it. */
export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const course = findCourse(String(id));
  const enrolled = useGame((s) => s.enrolled);
  const completed = useGame((s) => s.completed);
  const openCourse = useGame((s) => s.openCourse);
  const leaveCourse = useGame((s) => s.leaveCourse);

  if (!course) {
    return (
      <Screen>
        <BackHeader title="دوره پیدا نشد" />
        <View style={styles.missing}>
          <Mascot mood="think" size={120} />
          <Txt w={800} size={16} color={colors.text2} center>
            این دوره وجود نداره یا حذف شده.
          </Txt>
        </View>
      </Screen>
    );
  }

  const isEnrolled = enrolled.includes(course.id);
  const progress = courseProgress(course, completed);
  const lessons = course.units.flatMap((u) => u.lessons);
  const questions = lessons.reduce((n, l) => n + l.steps.filter(isQuestion).length, 0);
  const category = CATEGORIES.find((c) => c.id === course.category);

  const start = () => {
    openCourse(course.id);
    router.dismissTo('/(tabs)');
  };

  return (
    <Screen>
      <BackHeader caption={category?.title} title={course.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: course.color, borderBottomColor: course.edge }]}>
          <CourseBadge course={{ ...course, color: 'rgba(255,255,255,0.28)', edge: 'rgba(0,0,0,0.18)' }} size={84} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt display size={28} color={course.ink}>
              {course.title}
            </Txt>
            <Txt w={700} size={14} color={course.ink} style={{ opacity: 0.85 }}>
              {course.subtitle}
            </Txt>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="سطح" value={LEVEL_LABEL[course.level]} color={LEVEL_COLOR[course.level]} />
          <Stat label="واحد" value={fa(course.units.length)} />
          <Stat label="درس" value={fa(lessons.length)} />
          <Stat label="سؤال" value={fa(questions)} />
        </View>

        <Txt size={15} lh={1.9} color={colors.text2}>
          {course.description}
        </Txt>

        {isEnrolled && progress.done > 0 && (
          <View style={styles.progressRow}>
            <Txt w={800} size={13} color={colors.text2}>
              {`پیشرفت تو: ${fa(progress.done)} از ${fa(progress.total)} درس`}
            </Txt>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(progress.done / progress.total) * 100}%`, backgroundColor: course.color }]} />
            </View>
          </View>
        )}

        <Txt w={900} size={18} style={{ marginTop: 4 }}>
          توی این دوره چی یاد می‌گیری؟
        </Txt>
        {course.units.map((unit, u) => (
          <View key={unit.id} style={styles.unit}>
            <View style={styles.unitHead}>
              <View style={[styles.unitNum, { backgroundColor: unit.color }]}>
                <Txt w={900} size={13} color={unit.ink}>
                  {fa(u + 1)}
                </Txt>
              </View>
              <Txt w={900} size={16} style={{ flex: 1 }}>
                {unit.title}
              </Txt>
            </View>
            {unit.lessons.map((lesson) => {
              const done = !!completed[lesson.id];
              return (
                <View key={lesson.id} style={styles.lesson}>
                  <View style={[styles.lessonDot, done && { backgroundColor: colors.bull, borderColor: colors.bull }]}>
                    {done && <Icon name="check" size={11} color={colors.bullInk} strokeWidth={4} />}
                  </View>
                  <Txt w={500} size={14} color={done ? colors.text3 : colors.text}>
                    {lesson.title}
                  </Txt>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Button3D label={isEnrolled ? (progress.done > 0 ? 'ادامه‌ی یادگیری' : 'شروع یادگیری') : 'افزودن و شروع دوره'} onPress={start} />
        {isEnrolled && enrolled.length > 1 && (
          <Button3D label="حذف از دوره‌های من" variant="secondary" size={15} onPress={() => leaveCourse(course.id)} />
        )}
      </View>
    </Screen>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Txt w={900} size={16} color={color}>
        {value}
      </Txt>
      <Txt w={700} size={11} color={colors.text3}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  hero: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 22,
    borderBottomWidth: 6,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  progressRow: {
    gap: 8,
  },
  track: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.raised,
  },
  fill: {
    height: 12,
    borderRadius: 6,
  },
  unit: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  unitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitNum: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingStart: 6,
  },
  lessonDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.lineSoft,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
});
