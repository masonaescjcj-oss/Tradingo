import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { CourseBadge, LEVEL_COLOR } from '@/components/CourseBadge';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ALL_COURSES, CATEGORIES, LEVEL_LABEL, courseProgress, type Course, type CourseCategory } from '@/content';
import { useGame } from '@/store/game';
import { colors, fonts } from '@/theme';
import { fa } from '@/utils/format';

/** The course catalog: every course grouped by category, with search and a category filter. */
export default function CoursesScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CourseCategory | 'all'>('all');
  const enrolled = useGame((s) => s.enrolled);
  const completed = useGame((s) => s.completed);

  const groups = useMemo(() => {
    const q = query.trim();
    return CATEGORIES.filter((c) => category === 'all' || c.id === category)
      .map((c) => ({
        ...c,
        courses: ALL_COURSES.filter(
          (course) =>
            course.category === c.id &&
            (!q || course.title.includes(q) || course.subtitle.includes(q) || course.description.includes(q)),
        ),
      }))
      .filter((g) => g.courses.length > 0);
  }, [query, category]);

  const lessonCount = ALL_COURSES.reduce((n, c) => n + c.units.reduce((m, u) => m + u.lessons.length, 0), 0);

  return (
    <Screen>
      <BackHeader caption={`${fa(ALL_COURSES.length)} دوره · ${fa(lessonCount)} درس`} title="همه‌ی دوره‌ها" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="جست‌وجوی دوره، مثلاً «فیبوناچی»"
            placeholderTextColor={colors.faint}
            style={styles.input}
            accessibilityLabel="جست‌وجوی دوره"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="پاک کردن جست‌وجو" hitSlop={8}>
              <Icon name="close" size={18} color={colors.text3} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[{ id: 'all' as const, title: 'همه' }, ...CATEGORIES].map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Txt w={800} size={13} color={on ? colors.skyText : colors.text2}>
                  {c.title}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {groups.map((g) => (
          <View key={g.id} style={{ gap: 10 }}>
            <View style={styles.groupHead}>
              <Txt w={900} size={18}>
                {g.title}
              </Txt>
              <Txt w={700} size={13} color={colors.text3}>
                {g.subtitle}
              </Txt>
            </View>
            {g.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrolled={enrolled.includes(course.id)}
                progress={courseProgress(course, completed)}
              />
            ))}
          </View>
        ))}
        {groups.length === 0 && (
          <Txt w={700} size={15} color={colors.text3} center style={{ marginTop: 32 }}>
            دوره‌ای با این عنوان پیدا نشد.
          </Txt>
        )}
      </ScrollView>
    </Screen>
  );
}

function CourseCard({ course, enrolled, progress }: { course: Course; enrolled: boolean; progress: { done: number; total: number } }) {
  return (
    <Pressable
      onPress={() => router.push(`/course/${course.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}، ${LEVEL_LABEL[course.level]}${enrolled ? '، افزوده شده' : ''}`}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}
    >
      <CourseBadge course={course} size={56} />
      <View style={{ flex: 1, gap: 3 }}>
        <Txt w={900} size={16} numberOfLines={1}>
          {course.title}
        </Txt>
        <Txt w={500} size={13} color={colors.text2} numberOfLines={1}>
          {course.subtitle}
        </Txt>
        <View style={styles.meta}>
          <Txt w={800} size={11} color={LEVEL_COLOR[course.level]}>
            {LEVEL_LABEL[course.level]}
          </Txt>
          <View style={styles.dot} />
          <Txt w={700} size={11} color={colors.text3}>
            {`${fa(course.units.length)} واحد · ${fa(progress.total)} درس`}
          </Txt>
        </View>
      </View>
      {enrolled ? (
        <View style={styles.enrolled}>
          <Icon name="check" size={16} color={colors.bullInk} strokeWidth={3.4} />
          <Txt w={800} size={10} color={colors.bullInk}>
            {`${fa(Math.round((progress.done / Math.max(1, progress.total)) * 100))}٪`}
          </Txt>
        </View>
      ) : (
        <Icon name="plus" size={22} color={colors.text3} strokeWidth={3} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 18,
    paddingBottom: 48,
  },
  search: {
    height: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 46,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    outlineWidth: 0,
  },
  chips: {
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  card: {
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.faint,
  },
  enrolled: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
  },
});
