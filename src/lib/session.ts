import { findLesson, isQuestion, lessonOrder, type Market, type Step } from '@/content';
import type { LessonRecord } from '@/store/game';
import { shuffle } from '@/utils/random';

export type SessionStep = { step: Step; ref: string; topic: string };

export type PracticeMode = 'mixed' | 'mistakes' | 'charts' | 'speed';

export type Session =
  | { kind: 'lesson'; lessonId: string; title: string; steps: SessionStep[] }
  | { kind: 'practice'; mode: PracticeMode; title: string; steps: SessionStep[]; timeLimit?: number };

type SessionState = { market: Market; completed: Record<string, LessonRecord>; mistakes: string[] };

export const SPEED_SECONDS = 60;

const PRACTICE_TITLES: Record<PracticeMode, string> = {
  mixed: 'تمرین ترکیبی',
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

/** Questions from lessons the user has actually studied; falls back to the first lesson. */
export function practicePool(state: SessionState): SessionStep[] {
  const order = lessonOrder(state.market);
  const studied = order.filter((id) => state.completed[id] && !state.completed[id].skipped);
  const source = studied.length > 0 ? studied : order.slice(0, 1);
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
  if (mode === 'charts') return shuffle(pool.filter((s) => s.step.type === 'chart' || s.step.type === 'predict')).slice(0, 6);
  if (mode === 'speed') return shuffle(pool.filter((s) => s.step.type === 'choice' || s.step.type === 'truefalse')).slice(0, 30);
  return shuffle(pool).slice(0, 8);
}

export function buildSession(id: string, state: SessionState): Session | null {
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
    default:
      return undefined;
  }
}
