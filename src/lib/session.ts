import { courseLessonIds, findCourse, findLesson, findUnitWithCourse, isQuestion, type Step } from '@/content';
import { dueLessons, type Review } from '@/lib/review';
import type { LessonRecord } from '@/store/game';
import { bandDecimals } from '@/content/line';
import { fa, formatPrice } from '@/utils/format';
import { shuffle } from '@/utils/random';

export type SessionStep = { step: Step; ref: string; topic: string };

export type PracticeMode = 'mixed' | 'mistakes' | 'charts' | 'speed';

/** Question types the chart-reading practice ("شکار الگو") draws from. */
const CHART_TYPES = new Set<Step['type']>(['chart', 'predict', 'tap', 'line']);

export type Session =
  | { kind: 'lesson'; lessonId: string; title: string; steps: SessionStep[] }
  | { kind: 'practice'; mode: PracticeMode; title: string; steps: SessionStep[]; timeLimit?: number }
  /** 'jump' skips ahead to a locked unit; 'master' is the harder test that crowns a finished unit. */
  | { kind: 'test'; mode: 'jump' | 'master'; unitId: string; title: string; steps: SessionStep[]; lives: number };

type SessionState = {
  activeCourse: string;
  completed: Record<string, LessonRecord>;
  mistakes: string[];
  reviews?: Record<string, Review>;
};

export const SPEED_SECONDS = 60;
/** A unit test-out asks this many questions and ends after this many mistakes. */
export const TEST_QUESTIONS = 10;
export const TEST_LIVES = 3;
export const MASTER_QUESTIONS = 15;
export const MASTER_LIVES = 2;

const PRACTICE_TITLES: Record<PracticeMode, string> = {
  mixed: 'مرور هوشمند',
  mistakes: 'مرور اشتباه‌ها',
  charts: 'شکار الگو',
  speed: 'تمرین سرعتی',
};

function resolveRef(ref: string): SessionStep | undefined {
  const [lessonId, index] = ref.split(':');
  const found = findLesson(lessonId);
  const step = found?.lesson.steps[Number(index)];
  return found && step ? { step, ref, topic: found.unit.title } : undefined;
}

/** Questions from lessons the user has actually studied, in any course; falls back to the active course's first lesson. */
export function practicePool(state: SessionState): SessionStep[] {
  const studied = Object.keys(state.completed).filter((id) => !state.completed[id].skipped && findLesson(id));
  const course = findCourse(state.activeCourse);
  const source = studied.length > 0 ? studied : course ? courseLessonIds(course).slice(0, 1) : [];
  return source.flatMap((lessonId) => {
    const found = findLesson(lessonId)!;
    return found.lesson.steps
      .map((step, i) => ({ step, ref: `${lessonId}:${i}`, topic: found.unit.title }))
      .filter((s) => isQuestion(s.step));
  });
}

export function practiceSteps(mode: PracticeMode, state: SessionState): SessionStep[] {
  if (mode === 'mistakes') {
    return state.mistakes
      .map(resolveRef)
      .filter((s): s is SessionStep => !!s)
      .slice(0, 10);
  }
  const pool = practicePool(state);
  if (mode === 'charts') return shuffle(pool.filter((s) => CHART_TYPES.has(s.step.type))).slice(0, 8);
  if (mode === 'speed') return shuffle(pool.filter((s) => s.step.type === 'choice' || s.step.type === 'truefalse')).slice(0, 30);
  // Lessons due for review come first; the rest of the session is a random mix.
  const due = new Set(dueLessons(state.reviews ?? {}));
  const isDue = (s: SessionStep) => due.has(s.ref.split(':')[0]);
  return [...shuffle(pool.filter(isDue)), ...shuffle(pool.filter((s) => !isDue(s)))].slice(0, 8);
}

export function buildSession(id: string, state: SessionState): Session | null {
  const testMode = id.startsWith('test-') ? 'jump' : id.startsWith('master-') ? 'master' : null;
  if (testMode) {
    const hit = findUnitWithCourse(id.slice(id.indexOf('-') + 1));
    if (!hit) return null;
    const count = testMode === 'master' ? MASTER_QUESTIONS : TEST_QUESTIONS;
    const pool = hit.unit.lessons.flatMap((lesson) =>
      lesson.steps
        .map((step, i) => ({ step, ref: `${lesson.id}:${i}`, topic: hit.unit.title }))
        .filter((s) => isQuestion(s.step) && s.step.type !== 'match'),
    );
    // A few questions from every lesson, so passing means the whole unit is known.
    const perLesson = Math.ceil(count / hit.unit.lessons.length);
    const picked = hit.unit.lessons.flatMap((lesson) => shuffle(pool.filter((s) => s.ref.startsWith(`${lesson.id}:`))).slice(0, perLesson));
    const steps = shuffle(picked).slice(0, count);
    if (steps.length === 0) return null;
    return testMode === 'master'
      ? { kind: 'test', mode: 'master', unitId: hit.unit.id, title: `آزمون استادی · ${hit.unit.title}`, steps, lives: MASTER_LIVES }
      : { kind: 'test', mode: 'jump', unitId: hit.unit.id, title: `آزمون پرش · ${hit.unit.title}`, steps, lives: TEST_LIVES };
  }
  if (id.startsWith('practice-')) {
    const mode = id.slice('practice-'.length) as PracticeMode;
    if (!(mode in PRACTICE_TITLES)) return null;
    const steps = practiceSteps(mode, state);
    if (steps.length === 0) return null;
    return { kind: 'practice', mode, title: PRACTICE_TITLES[mode], steps, timeLimit: mode === 'speed' ? SPEED_SECONDS : undefined };
  }
  const found = findLesson(id);
  if (!found) return null;
  return {
    kind: 'lesson',
    lessonId: id,
    title: found.lesson.title,
    steps: found.lesson.steps.map((step, i) => ({ step, ref: `${id}:${i}`, topic: found.unit.title })),
  };
}

/** The sentence of a fill-in question with its correct words in place. */
export function filledSentence(sentence: string, answers: string[]): string {
  let i = 0;
  return sentence.replace(/___/g, () => answers[i++] ?? '___');
}

export function correctAnswerText(step: Step): string | undefined {
  switch (step.type) {
    case 'choice':
      return step.options[step.answer];
    case 'chart':
      return step.options[step.answer].label;
    case 'predict':
      return step.answer === 'buy' ? 'خرید (Long)' : 'فروش (Short)';
    case 'truefalse':
      return step.answer ? 'درسته' : 'غلطه';
    case 'fill':
      return filledSentence(step.sentence, step.answers);
    case 'order':
      return step.items.map((item, i) => `${fa(i + 1)}. ${item}`).join('\n');
    case 'line': {
      const d = bandDecimals(step);
      return `بین ${formatPrice(step.answer[0], d)} تا ${formatPrice(step.answer[1], d)}`;
    }
    default:
      return undefined;
  }
}
