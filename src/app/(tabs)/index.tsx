import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Button3D } from '@/components/Button3D';
import { CourseBadge } from '@/components/CourseBadge';
import { CourseSwitcher } from '@/components/CourseSwitcher';
import { Icon, StarIcon } from '@/components/Icon';
import { InstallBanner } from '@/components/InstallApp';
import { PlacementOffer, usePlacementOpen } from '@/components/PlacementOffer';
import { ReminderOffer } from '@/components/Reminders';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { StatsRow } from '@/components/StatsRow';
import { Txt } from '@/components/Txt';
import { Chest } from '@/components/Chest';
import { ALL_COURSES, CHEST_AFTER, chestId, courseLessonIds, courseProgress, findCourse, type Unit } from '@/content';
import { chestPlan } from '@/lib/chest';
import { useGame, type LessonRecord } from '@/store/game';
import { MAX_WIDTH, colors } from '@/theme';
import { fa } from '@/utils/format';

type NodeStatus = 'perfect' | 'done' | 'current' | 'locked';
type PathItem =
  | { kind: 'lesson'; id: string; title: string; number: number; status: NodeStatus }
  | { kind: 'chest'; id: string; status: 'locked' | 'ready' | 'claimed' };

const NODE = 68;
const CHEST = 88;
const RING = 96;
const ROW = 118;
const OFFSETS = [0, -58, -84, -58, 0, 58, 84, 58];

function lessonStatus(record: LessonRecord | undefined, isCurrent: boolean): NodeStatus {
  if (record) return record.perfect ? 'perfect' : 'done';
  return isCurrent ? 'current' : 'locked';
}

export default function LearnScreen() {
  const activeCourse = useGame((s) => s.activeCourse);
  const completed = useGame((s) => s.completed);
  const chests = useGame((s) => s.chests);
  const mastered = useGame((s) => s.mastered);
  const { width } = useWindowDimensions();
  const colW = Math.min(width, MAX_WIDTH);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const placementOffered = usePlacementOpen();
  const didScroll = useRef(false);

  const course = findCourse(activeCourse) ?? ALL_COURSES[0];
  const progress = courseProgress(course, completed);
  const currentId = courseLessonIds(course).find((id) => !completed[id]);

  const sections = course.units.map((unit) => {
    const items: PathItem[] = [];
    unit.lessons.forEach((lesson, i) => {
      items.push({
        kind: 'lesson',
        id: lesson.id,
        title: lesson.title,
        number: i + 1,
        status: lessonStatus(completed[lesson.id], lesson.id === currentId),
      });
      const chest = chestId(unit);
      if (chest && i === CHEST_AFTER - 1) {
        const earned = unit.lessons.slice(0, CHEST_AFTER).every((l) => completed[l.id]);
        items.push({ kind: 'chest', id: chest, status: chests.includes(chest) ? 'claimed' : earned ? 'ready' : 'locked' });
      }
    });
    return { unit, items };
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const onItem = (item: PathItem) => {
    if (item.kind === 'chest') {
      if (item.status === 'locked') {
        setToast('صندوق بعد از تموم کردن درس‌های قبلی باز می‌شه.');
        return;
      }
      router.push(`/chest/${item.id}`);
      return;
    }
    if (item.status === 'locked') {
      setToast('اول درس‌های قبلی رو تموم کن.');
      return;
    }
    router.push(`/lesson/${item.id}`);
  };

  // Switching course starts again from the top and scrolls to that course's current lesson.
  useEffect(() => {
    didScroll.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [course.id]);

  const scrollToCurrent = (y: number) => {
    if (didScroll.current) return;
    didScroll.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 160), animated: false }));
  };

  return (
    <Screen bottom={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`تغییر دوره، الان: ${course.title}`}
          style={styles.courseChip}
        >
          <CourseBadge course={course} size={30} />
          <Icon name="chevronDown" size={14} color={colors.text3} strokeWidth={3} />
        </Pressable>
        <StatsRow />
      </View>

      <InstallBanner />
      {placementOffered ? <PlacementOffer /> : <ReminderOffer />}

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 48 }}>
        <Pressable onPress={() => router.push(`/course/${course.id}`)} accessibilityRole="button" style={styles.courseHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={900} size={17} numberOfLines={1}>
              {course.title}
            </Txt>
            <Txt w={700} size={12} color={colors.text3}>
              {`${fa(progress.done)} از ${fa(progress.total)} درس، ${fa(course.units.length)} واحد`}
            </Txt>
          </View>
          <View style={styles.courseTrack}>
            <View style={[styles.courseFill, { width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, backgroundColor: course.color }]} />
          </View>
          <Icon name="info" size={20} color={colors.text3} />
        </Pressable>
        {sections.map(({ unit, items }, unitIndex) => (
          <UnitSection
            key={unit.id}
            unit={unit}
            index={unitIndex}
            items={items}
            mastered={mastered.includes(unit.id)}
            width={colW}
            onItem={onItem}
            onCurrentLayout={scrollToCurrent}
          />
        ))}
        {!currentId && (
          <View style={styles.finish}>
            <Mascot mood="party" size={120} />
            <Txt w={900} size={18} center>
              همه‌ی درس‌های این دوره رو تموم کردی!
            </Txt>
            <Txt size={14} color={colors.text2} center>
              یه دوره‌ی تازه اضافه کن، توی تب تمرین مرور کن یا مهارتت رو توی شبیه‌ساز محک بزن.
            </Txt>
            <Button3D label="افزودن دوره‌ی جدید" onPress={() => router.push('/courses')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </View>
        )}
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Txt w={800} size={14} center>
            {toast}
          </Txt>
        </View>
      )}

      <CourseSwitcher visible={pickerOpen} onClose={() => setPickerOpen(false)} />

    </Screen>
  );
}

function UnitSection({
  unit,
  index,
  items,
  mastered,
  width,
  onItem,
  onCurrentLayout,
}: {
  unit: Unit;
  index: number;
  items: PathItem[];
  mastered: boolean;
  width: number;
  onItem: (item: PathItem) => void;
  onCurrentLayout: (y: number) => void;
}) {
  const center = width / 2;
  const currentIndex = items.findIndex((it) => it.kind === 'lesson' && it.status === 'current');
  // Leave room above the first node for the "start" bubble.
  const top = currentIndex === 0 ? 108 : 64;
  const positions = items.map((_, i) => ({ x: center + OFFSETS[i % OFFSETS.length], y: top + i * ROW }));
  const height = top + items.length * ROW - 20;
  const unlocked = items.some((it) => it.kind === 'lesson' && it.status !== 'locked');
  const finished = items.every((it) => it.kind === 'chest' || it.status === 'done' || it.status === 'perfect');
  const doneUntil = currentIndex >= 0 ? currentIndex : items.every((it) => it.status !== 'locked') ? items.length - 1 : -1;

  // A jagged "price line" connects the nodes; walked segments are green.
  const linePoints = (from: number, to: number) => {
    const pts: string[] = [];
    for (let i = from; i <= to; i++) {
      const p = positions[i];
      pts.push(`${p.x},${p.y}`);
      if (i < to) {
        const n = positions[i + 1];
        const jog = i % 2 === 0 ? 14 : -14;
        pts.push(`${(p.x + n.x) / 2 + jog},${(p.y + n.y) / 2 - 12}`);
        pts.push(`${(p.x + n.x) / 2 - jog},${(p.y + n.y) / 2 + 12}`);
      }
    }
    return pts.join(' ');
  };

  const mascotSide = currentIndex >= 0 && positions[currentIndex].x <= center ? 'right' : 'left';

  return (
    <View
      onLayout={(e) => {
        if (currentIndex >= 0) onCurrentLayout(e.nativeEvent.layout.y + positions[currentIndex].y);
      }}
    >
      <View
        style={[
          styles.banner,
          unlocked
            ? { backgroundColor: unit.color, borderBottomColor: unit.edge }
            : { backgroundColor: colors.raised, borderBottomColor: colors.raisedEdge },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt w={800} size={13} color={unlocked ? unit.ink : colors.muted} style={{ opacity: 0.8 }}>
            {`واحد ${fa(index + 1)}`}
          </Txt>
          <Txt w={900} size={20} color={unlocked ? unit.ink : colors.text2}>
            {unit.title}
          </Txt>
        </View>
        {finished && (
          <Pressable
            onPress={() => router.push(`/lesson/master-${unit.id}`)}
            accessibilityRole="button"
            accessibilityLabel={mastered ? `استاد واحد ${unit.title}؛ دوباره امتحان کن` : `آزمون استادی واحد ${unit.title}`}
            style={[styles.crownBtn, mastered && styles.crownOn]}
          >
            <Icon name="crown" size={22} color={mastered ? colors.goldInk : unit.ink} strokeWidth={2.4} />
          </Pressable>
        )}
        {!unlocked && (
          <Pressable
            onPress={() => router.push(`/lesson/test-${unit.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`آزمون پرش به واحد ${unit.title}`}
            style={styles.jumpBtn}
          >
            <Icon name="arrowUp" size={16} color={colors.skyText} strokeWidth={3} />
            <Txt w={800} size={13} color={colors.skyText}>
              پرش
            </Txt>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push(`/guide/${unit.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`راهنمای واحد ${unit.title}`}
          style={[styles.guideBtn, { borderColor: unlocked ? 'rgba(0,0,0,0.18)' : colors.line }]}
        >
          <Icon name="book" size={24} color={unlocked ? unit.ink : colors.text2} />
        </Pressable>
      </View>

      <View style={{ height, direction: 'ltr' }}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {doneUntil > 0 && (
            <Polyline points={linePoints(0, doneUntil)} fill="none" stroke={colors.bull} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" opacity={0.5} />
          )}
          {doneUntil < items.length - 1 && (
            <Polyline
              points={linePoints(Math.max(0, doneUntil), items.length - 1)}
              fill="none"
              stroke={colors.line}
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="1 11"
            />
          )}
        </Svg>
        {items.map((item, i) => (
          <PathNode key={item.id} item={item} x={positions[i].x} y={positions[i].y} onPress={() => onItem(item)} />
        ))}
        {currentIndex >= 0 && (
          <View style={[styles.mascot, { top: positions[currentIndex].y - 30 }, mascotSide === 'right' ? { right: 22 } : { left: 22 }]}>
            <Mascot mood="happy" size={92} />
          </View>
        )}
      </View>
    </View>
  );
}

function PathNode({ item, x, y, onPress }: { item: PathItem; x: number; y: number; onPress: () => void }) {
  const [bounce] = useState(() => new Animated.Value(0));
  const isCurrent = item.kind === 'lesson' && item.status === 'current';
  // A ready chest bounces like the current lesson, to be noticed.
  const bouncing = isCurrent || (item.kind === 'chest' && item.status === 'ready');

  useEffect(() => {
    if (!bouncing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -6, duration: 600, useNativeDriver: false }),
        Animated.timing(bounce, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bouncing, bounce]);

  if (item.kind === 'chest') {
    const plan = chestPlan(item.id);
    const ready = item.status === 'ready';
    const claimed = item.status === 'claimed';
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={ready ? 'صندوق جایزه، آماده‌ی باز شدن' : claimed ? 'صندوق جایزه، باز شده' : 'صندوق جایزه، قفل'}
        style={{ position: 'absolute', left: x - CHEST / 2, top: y - CHEST / 2 - 14, width: CHEST, height: CHEST + 12 }}
      >
        {({ pressed }) => (
          <Animated.View style={{ opacity: claimed ? 0.55 : 1, transform: [{ translateY: ready ? bounce : 0 }, { scale: pressed ? 0.94 : 1 }] }}>
            <Chest tier={claimed ? plan.final : plan.start} size={CHEST} open={claimed} locked={!ready && !claimed} />
          </Animated.View>
        )}
      </Pressable>
    );
  }

  if (isCurrent) {
    return (
      <>
        <Animated.View style={[styles.startBubble, { left: x - 42, top: y - RING / 2 - 42, transform: [{ translateY: bounce }] }]}>
          <Txt w={900} size={15} color="#0B7A43">
            شروع
          </Txt>
          <View style={styles.startTail} />
        </Animated.View>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`شروع درس ${fa(item.number)}: ${item.title}`}
          style={{ position: 'absolute', left: x - RING / 2, top: y - RING / 2, width: RING, height: RING }}
        >
          {({ pressed }) => (
            <>
              <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                <Circle cx={RING / 2} cy={RING / 2} r={44} fill="none" stroke="#26314A" strokeWidth={8} />
              </Svg>
              <View style={[styles.ringInner, { top: 10 + (pressed ? 4 : 0) }]}>
                <View style={[styles.ringEdge]} />
                <View style={styles.ringFace}>
                  <Icon name="candles" size={34} color={colors.bullInk} strokeWidth={2.4} />
                </View>
              </View>
            </>
          )}
        </Pressable>
      </>
    );
  }

  const status = item.status;
  const face = status === 'perfect' ? colors.gold : status === 'done' ? colors.bull : colors.raised;
  const edge = status === 'perfect' ? colors.goldEdge : status === 'done' ? colors.bullEdge : colors.raisedEdge;
  const label =
    status === 'locked' ? `درس ${fa(item.number)}: ${item.title}، قفل` : `درس ${fa(item.number)}: ${item.title}، کامل‌شده. تمرین دوباره`;
  return (
    <NodeButton x={x} y={y} face={face} edge={edge} onPress={onPress} label={label}>
      {status === 'perfect' && <StarIcon size={32} />}
      {status === 'done' && <Icon name="check" size={32} color={colors.bullInk} strokeWidth={3.4} />}
      {status === 'locked' && <Icon name="lock" size={28} color={colors.muted} strokeWidth={2.4} />}
    </NodeButton>
  );
}

function NodeButton({
  x,
  y,
  face,
  edge,
  onPress,
  label,
  children,
}: {
  x: number;
  y: number;
  face: string;
  edge: string;
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ position: 'absolute', left: x - NODE / 2, top: y - NODE / 2, width: NODE, height: NODE + 6 }}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.nodeEdge, { backgroundColor: edge }]} />
          <View style={[styles.nodeFace, { backgroundColor: face, top: pressed ? 4 : 0 }]}>{children}</View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: colors.lineSoft,
  },
  courseChip: {
    height: 44,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  courseHead: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courseTrack: {
    width: 72,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.raised,
    flexDirection: 'row',
  },
  courseFill: {
    height: 10,
    borderRadius: 5,
  },
  banner: {
    marginTop: 18,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderBottomWidth: 5,
  },
  crownBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  crownOn: {
    backgroundColor: colors.gold,
    borderColor: colors.goldEdge,
  },
  jumpBtn: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  guideBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  nodeEdge: {
    position: 'absolute',
    top: 6,
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
  },
  nodeFace: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    left: 12,
    width: 72,
    height: 72,
  },
  ringEdge: {
    position: 'absolute',
    top: 6,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bullEdge,
  },
  ringFace: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
  },
  startBubble: {
    position: 'absolute',
    width: 84,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D5DBE6',
    backgroundColor: colors.text,
  },
  startTail: {
    position: 'absolute',
    bottom: -8,
    left: 34,
    width: 12,
    height: 12,
    backgroundColor: colors.text,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#D5DBE6',
    transform: [{ rotate: '45deg' }],
  },
  mascot: {
    position: 'absolute',
  },
  finish: {
    marginTop: 24,
    marginHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.raised,
    borderWidth: 2,
    borderColor: colors.line,
  },
});
