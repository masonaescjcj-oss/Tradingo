import { chartPriceRange, lineDecimals, lineExtent, roundPrice } from './line';
import type { Candle, ChartSpec, Course, LineStep, Lesson, Step } from './types';

/** Structural checks for course content. Returns human-readable problems; empty means valid. */
export function validateCourses(courses: Course[]): string[] {
  const problems: string[] = [];
  // Courses are looked up separately from units and lessons, so a course may share its id
  // with its first unit (the original single-unit courses do).
  const seen = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const prev = seen.get(id);
    if (prev) problems.push(`${where}: duplicate id "${id}" (also used by ${prev})`);
    else seen.set(id, where);
  };

  for (const course of courses) {
    const cw = `course ${course.id}`;
    claim(`course:${course.id}`, cw);
    if (!course.title || !course.subtitle || !course.description) problems.push(`${cw}: title, subtitle and description are required`);
    if (!course.units.length) problems.push(`${cw}: has no units`);
    for (const unit of course.units) {
      const uw = `${cw} › unit ${unit.id}`;
      claim(unit.id, uw);
      if (!unit.title) problems.push(`${uw}: missing title`);
      if (!/^#[0-9A-Fa-f]{6}$/.test(unit.color) || !/^#[0-9A-Fa-f]{6}$/.test(unit.edge) || !/^#[0-9A-Fa-f]{6}$/.test(unit.ink))
        problems.push(`${uw}: color, edge and ink must be #RRGGBB`);
      if (unit.lessons.length < 2) problems.push(`${uw}: needs at least 2 lessons`);
      for (const lesson of unit.lessons) {
        claim(lesson.id, `${uw} › lesson ${lesson.id}`);
        problems.push(...validateLesson(lesson).map((p) => `${uw} › lesson ${lesson.id}: ${p}`));
      }
    }
  }
  return problems;
}

function validateLesson(lesson: Lesson): string[] {
  const out: string[] = [];
  if (!lesson.title) out.push('missing title');
  if (lesson.steps[0]?.type !== 'learn') out.push('the first step must be a learn card');
  const questions = lesson.steps.filter((s) => s.type !== 'learn').length;
  if (questions < 4) out.push(`only ${questions} questions; each lesson needs at least 4`);
  if (lesson.steps.length > 14) out.push(`${lesson.steps.length} steps is too long; keep lessons at 14 steps or fewer`);
  lesson.steps.forEach((step, i) => {
    for (const p of validateStep(step)) out.push(`step ${i + 1} (${step.type}): ${p}`);
    for (const text of textsOf(step)) {
      if ((text.match(/\*\*/g) ?? []).length % 2) out.push(`step ${i + 1} (${step.type}): unbalanced ** in "${text.slice(0, 40)}…"`);
    }
  });
  return out;
}

function textsOf(step: Step): string[] {
  switch (step.type) {
    case 'learn':
      return [step.title, step.body, step.tip ?? ''];
    case 'choice':
      return [step.prompt, step.explanation, ...step.options];
    case 'truefalse':
      return [step.statement, step.explanation];
    case 'fill':
      return [step.sentence, step.explanation];
    case 'order':
      return [step.prompt, step.explanation, ...step.items];
    case 'match':
      return step.pairs.flatMap((p) => [p.term, p.meaning]);
    default:
      return [step.prompt, step.explanation];
  }
}

const unique = (xs: string[]) => new Set(xs.map((x) => x.trim())).size === xs.length;

function validateStep(step: Step): string[] {
  const out: string[] = [];
  const need = (cond: unknown, msg: string) => {
    if (!cond) out.push(msg);
  };
  if (step.type !== 'learn' && step.type !== 'match') need(step.explanation?.trim(), 'missing explanation');

  switch (step.type) {
    case 'learn':
      need(step.title && step.body, 'title and body are required');
      if (step.visual?.kind === 'chart') out.push(...validateChart(step.visual.chart));
      if (step.visual?.kind === 'glyphs') need(step.visual.items.length >= 1 && step.visual.items.length <= 4, 'glyph visuals take 1–4 items');
      if (step.example) need(step.example.rows.length >= 1 && step.example.rows.length <= 5, 'examples take 1–5 rows');
      break;
    case 'choice':
      need(step.options.length >= 2 && step.options.length <= 4, 'needs 2–4 options');
      need(step.answer >= 0 && step.answer < step.options.length, 'answer index out of range');
      need(unique(step.options), 'options must be unique');
      break;
    case 'chart':
      out.push(...validateChart(step.chart));
      need(step.options.length >= 2 && step.options.length <= 4, 'needs 2–4 options');
      need(step.answer >= 0 && step.answer < step.options.length, 'answer index out of range');
      need(unique(step.options.map((o) => o.label)), 'option labels must be unique');
      need(step.symbol, 'missing symbol');
      break;
    case 'predict':
      out.push(...validateChart(step.chart));
      need(step.answer === 'buy' || step.answer === 'sell', "answer must be 'buy' or 'sell'");
      need(step.symbol, 'missing symbol');
      break;
    case 'tap':
      out.push(...validateChart(step.chart));
      need(Number.isInteger(step.answer) && step.answer >= 0 && step.answer < step.chart.candles.length, 'answer must be a candle index');
      need(!step.chart.ghost, 'tap charts cannot have a ghost slot');
      need(step.chart.highlight == null, 'tap charts must not highlight a candle (it gives the answer away)');
      need(step.symbol, 'missing symbol');
      break;
    case 'line':
      out.push(...validateChart(step.chart), ...validateLine(step));
      break;
    case 'truefalse':
      need(typeof step.answer === 'boolean', 'answer must be true or false');
      need(step.statement, 'missing statement');
      break;
    case 'fill': {
      const blanks = step.sentence.split('___').length - 1;
      need(blanks >= 1 && blanks <= 2, 'sentence needs 1–2 blanks (___)');
      need(blanks === step.answers.length, `sentence has ${blanks} blanks but ${step.answers.length} answers`);
      need(unique(step.answers), 'answers must be unique');
      need(step.distractors.length >= 2 && step.distractors.length <= 4, 'needs 2–4 distractors');
      need(!step.distractors.some((d) => step.answers.includes(d)), 'a distractor repeats an answer');
      need(unique([...step.answers, ...step.distractors]), 'answers and distractors must all be different');
      break;
    }
    case 'match':
      need(step.pairs.length >= 3 && step.pairs.length <= 5, 'needs 3–5 pairs');
      need(unique(step.pairs.map((p) => p.term)), 'terms must be unique');
      need(unique(step.pairs.map((p) => p.meaning)), 'meanings must be unique');
      break;
    case 'order':
      need(step.items.length >= 3 && step.items.length <= 6, 'needs 3–6 items');
      need(unique(step.items), 'items must be unique');
      break;
  }
  return out;
}

/** Share of the visible price range the answer band must cover, so it can be hit by dragging but isn't a giveaway. */
export const LINE_BAND_MIN = 0.03;
export const LINE_BAND_MAX = 0.35;

function validateLine(step: LineStep): string[] {
  const out: string[] = [];
  if (!step.symbol) out.push('missing symbol');
  if (!step.label?.trim() || step.label.length > 12) out.push(`label "${step.label ?? ''}" is required and must be 12 chars or fewer`);
  const [low, high] = Array.isArray(step.answer) ? step.answer : [NaN, NaN];
  if (![low, high, step.start].every(Number.isFinite)) return [...out, 'start and answer must be numbers'];
  if (!(low < high)) return [...out, 'answer must be [low, high] with low < high'];
  if (step.start >= low && step.start <= high) out.push('the line must start outside the answer band');

  const [lo, hi] = chartPriceRange(step.chart);
  const span = hi - lo;
  const near = (p: number) => p >= lo - 0.4 * span && p <= hi + 0.4 * span;
  if (!near(low) || !near(high)) out.push(`answer band ${low}–${high} is outside the chart's price range (${lo}–${hi})`);
  if (!near(step.start)) out.push(`start ${step.start} is outside the chart's price range (${lo}–${hi})`);

  const [vLo, vHi] = lineExtent(step);
  const share = (high - low) / (vHi - vLo);
  if (share < LINE_BAND_MIN) out.push(`answer band is ${(share * 100).toFixed(1)}% of the visible range; make it at least ${LINE_BAND_MIN * 100}% so it can be hit`);
  if (share > LINE_BAND_MAX) out.push(`answer band is ${(share * 100).toFixed(1)}% of the visible range; keep it under ${LINE_BAND_MAX * 100}%`);

  const d = lineDecimals(step);
  if (![low, high, step.start].every((p) => Math.abs(roundPrice(p, d) - p) < 1e-9)) out.push(`start and answer must use at most ${d} decimals`);
  return out;
}

function validCandle([o, h, l, c]: Candle): boolean {
  return [o, h, l, c].every(Number.isFinite) && h >= Math.max(o, c) && l <= Math.min(o, c) && h > l;
}

function validateChart(chart: ChartSpec): string[] {
  const out: string[] = [];
  const n = chart.candles.length;
  if (n < 3 || n > 40) out.push(`chart needs 3–40 candles (has ${n})`);
  chart.candles.forEach((c, i) => {
    if (!validCandle(c)) out.push(`candle ${i} is invalid [${c.join(', ')}]: need high ≥ open/close ≥ low`);
  });
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
  if (chart.highlight != null && !inRange(chart.highlight)) out.push('highlight index out of range');
  chart.notes?.forEach((note, i) => {
    if (!inRange(note.index)) out.push(`note ${i} index out of range`);
    if (note.text.length > 12) out.push(`note ${i} text "${note.text}" is too long (12 chars max)`);
  });
  chart.segments?.forEach((s, i) => {
    if (!inRange(s.from[0]) || s.to[0] < 0 || s.to[0] > n + 2) out.push(`segment ${i} candle index out of range`);
    if (![s.from[1], s.to[1]].every(Number.isFinite)) out.push(`segment ${i} has a non-numeric price`);
  });
  chart.zones?.forEach((z, i) => {
    if (!Number.isFinite(z.from) || !Number.isFinite(z.to) || z.from === z.to) out.push(`zone ${i} needs two different prices`);
    if (z.start != null && !inRange(z.start)) out.push(`zone ${i} start out of range`);
  });
  chart.lines?.forEach((l, i) => {
    if (!Number.isFinite(l.price)) out.push(`line ${i} has a non-numeric price`);
  });
  if (chart.volume && chart.volume.length !== n) out.push(`volume has ${chart.volume.length} values for ${n} candles`);
  for (const [key, period] of [['ma', chart.ma], ['ma2', chart.ma2], ['bands', chart.bands], ['rsi', chart.rsi]] as const) {
    if (period != null && (period < 2 || period >= n)) out.push(`${key} period ${period} must be between 2 and the candle count`);
  }
  return out;
}
