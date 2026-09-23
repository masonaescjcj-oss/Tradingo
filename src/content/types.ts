/** [open, high, low, close] */
export type Candle = [number, number, number, number];

export type ChartLevel = {
  price: number;
  label?: string;
  value?: string;
  color?: string;
  ink?: string;
};

/** A shaded price band, e.g. a supply/demand zone, order block or fair value gap. */
export type ChartZone = {
  from: number;
  to: number;
  label?: string;
  tone?: Tone;
  /** Candle index where the zone starts; it runs to the right edge. Defaults to 0. */
  start?: number;
  /** Candle index where the zone ends. Defaults to the right edge. */
  end?: number;
};

/** A straight line between two [candleIndex, price] points: trendlines, channels, necklines. */
export type ChartSegment = {
  from: [number, number];
  to: [number, number];
  tone?: Tone;
  dashed?: boolean;
  /** Keep drawing past `to` to the right edge. */
  extend?: boolean;
};

/** A short text tag above a candle's high or below its low, e.g. wave counts or pattern points. */
export type ChartNote = { index: number; text: string; at?: 'high' | 'low'; tone?: Tone };

export type ChartSpec = {
  candles: Candle[];
  lines?: ChartLevel[];
  /** Index of a candle to circle. */
  highlight?: number;
  /** Show an empty "next candle?" slot after the last candle. */
  ghost?: boolean;
  /** Simple moving average period (gold line). */
  ma?: number;
  /** A second, usually slower, simple moving average (sky-blue line). */
  ma2?: number;
  /** Bollinger bands period (2 standard deviations). */
  bands?: number;
  zones?: ChartZone[];
  segments?: ChartSegment[];
  notes?: ChartNote[];
  /** One volume value per candle, drawn as bars along the bottom. */
  volume?: number[];
  /** Show an RSI panel with this period under the chart. */
  rsi?: number;
};

export type GlyphKind =
  | 'bullish'
  | 'bearish'
  | 'hammer'
  | 'invertedHammer'
  | 'hangingMan'
  | 'doji'
  | 'shootingStar'
  | 'bullEngulf'
  | 'bearEngulf'
  | 'bullHarami'
  | 'bearHarami'
  | 'piercing'
  | 'darkCloud'
  | 'tweezerBottom'
  | 'tweezerTop'
  | 'morningStar'
  | 'eveningStar'
  | 'threeSoldiers'
  | 'threeCrows'
  | 'marubozuBull'
  | 'marubozuBear'
  | 'insideBar';

export type Tone = 'bull' | 'bear' | 'gold' | 'sky' | 'neutral';

export type ExampleRow = { label: string; value: string; tone?: Tone; mono?: boolean; dot?: Tone };

export type LearnVisual =
  | { kind: 'chart'; chart: ChartSpec; symbol: string }
  | { kind: 'glyphs'; items: { glyph: GlyphKind; label: string }[] }
  | { kind: 'anatomy' };

/**
 * Copy fields may wrap key terms in **double asterisks**;
 * they are rendered as highlighted words.
 */
export type LearnStep = {
  type: 'learn';
  title: string;
  body: string;
  visual?: LearnVisual;
  example?: { rows: ExampleRow[]; result?: ExampleRow };
  tip?: string;
};

export type ChoiceStep = {
  type: 'choice';
  prompt: string;
  /** Small facts shown above the options, e.g. risk and reward amounts. */
  facts?: { label: string; value: string; tone: Tone }[];
  options: string[];
  answer: number;
  explanation: string;
};

export type ChartStep = {
  type: 'chart';
  prompt: string;
  chart: ChartSpec;
  symbol: string;
  trend?: 'up' | 'down';
  options: { label: string; latin?: string; glyph?: GlyphKind }[];
  answer: number;
  explanation: string;
};

export type PredictStep = {
  type: 'predict';
  prompt: string;
  chart: ChartSpec;
  symbol: string;
  trend?: 'up' | 'down';
  answer: 'buy' | 'sell';
  explanation: string;
};

export type TrueFalseStep = {
  type: 'truefalse';
  statement: string;
  topic?: string;
  answer: boolean;
  explanation: string;
};

export type FillStep = {
  type: 'fill';
  /** Sentence with ___ for each blank. */
  sentence: string;
  answers: string[];
  distractors: string[];
  explanation: string;
};

export type MatchStep = {
  type: 'match';
  pairs: { term: string; sub?: string; meaning: string }[];
};

/** Tap the candle on the chart that answers the prompt. */
export type TapStep = {
  type: 'tap';
  prompt: string;
  chart: ChartSpec;
  symbol: string;
  trend?: 'up' | 'down';
  /** Index of the correct candle. */
  answer: number;
  explanation: string;
};

/** Put the items in the right order; `items` is listed in the correct order. */
export type OrderStep = {
  type: 'order';
  prompt: string;
  items: string[];
  explanation: string;
};

export type QuestionStep = ChoiceStep | ChartStep | PredictStep | TrueFalseStep | FillStep | MatchStep | TapStep | OrderStep;
export type Step = LearnStep | QuestionStep;

export type Lesson = {
  id: string;
  title: string;
  steps: Step[];
};

export type Market = 'forex' | 'crypto' | 'both';

export type Unit = {
  id: string;
  title: string;
  color: string;
  edge: string;
  ink: string;
  lessons: Lesson[];
};

export type CourseCategory = 'foundations' | 'technical' | 'strategy' | 'risk' | 'fundamental' | 'markets';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseBadge = { kind: 'text'; text: string } | { kind: 'glyph'; glyph: GlyphKind };

export type Course = {
  id: string;
  title: string;
  /** One line shown on the course card. */
  subtitle: string;
  /** A short paragraph shown on the course page. */
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  color: string;
  edge: string;
  ink: string;
  badge: CourseBadge;
  units: Unit[];
};

export const isQuestion = (step: Step): step is QuestionStep => step.type !== 'learn';
