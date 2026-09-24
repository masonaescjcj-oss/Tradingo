import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { courseProgress, findCourse, type Course } from '@/content';
import { t } from '@/i18n';
import { useGame } from '@/store/game';
import { MAX_WIDTH, colors } from '@/theme';
import { fa } from '@/utils/format';

import { CourseBadge } from './CourseBadge';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** Duolingo-style drop-down under the header: the learner's courses plus an "add course" tile. */
export function CourseSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const enrolled = useGame((s) => s.enrolled);
  const active = useGame((s) => s.activeCourse);
  const completed = useGame((s) => s.completed);
  const openCourse = useGame((s) => s.openCourse);
  const courses = enrolled.map(findCourse).filter((c): c is Course => !!c);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('بستن')}>
        <Pressable style={[styles.panel, { marginTop: Math.max(insets.top, 16) + 52 }]} onPress={() => {}}>
          <View style={styles.head}>
            <Txt w={900} size={17}>
              {t('دوره‌های من')}
            </Txt>
            <Txt w={700} size={13} color={colors.text3}>
              {t('{n} دوره', { n: fa(courses.length), count: courses.length })}
            </Txt>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={styles.grid}>
            {courses.map((course) => {
              const p = courseProgress(course, completed);
              const isActive = course.id === active;
              return (
                <Pressable
                  key={course.id}
                  onPress={() => {
                    openCourse(course.id);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={t('{title}، {done} از {total} درس', { title: course.title, done: fa(p.done), total: fa(p.total), count: p.total })}
                  style={({ pressed }) => [styles.tile, isActive && styles.tileActive, pressed && { opacity: 0.8 }]}
                >
                  <CourseBadge course={course} size={52} />
                  <Txt w={800} size={13} center numberOfLines={2} style={{ minHeight: 36 }}>
                    {course.title}
                  </Txt>
                  <Txt w={700} size={11} color={isActive ? colors.skyText : colors.text3}>
                    {`${fa(p.done)}/${fa(p.total)}`}
                  </Txt>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                onClose();
                router.push('/courses');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('افزودن دوره‌ی جدید')}
              style={({ pressed }) => [styles.tile, styles.addTile, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.addIcon}>
                <Icon name="plus" size={28} color={colors.text2} strokeWidth={3} />
              </View>
              <Txt w={800} size={13} center color={colors.text2} style={{ minHeight: 36 }}>
                {t('دوره‌ی جدید')}
              </Txt>
              <Txt w={700} size={11} color="transparent">
                .
              </Txt>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.6)',
    paddingHorizontal: 12,
  },
  panel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_WIDTH - 24,
    padding: 14,
    gap: 10,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30.5%',
    flexGrow: 1,
    maxWidth: '33%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tileActive: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  addTile: {
    borderStyle: 'dashed',
    borderBottomWidth: 2,
    backgroundColor: 'transparent',
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
});
