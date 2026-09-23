/** [open, high, low, close] */
export type Candle = [number, number, number, number];

export type ChartLevel = {
  price: number;
  label?: string;
  value?: string;
  color?: string;
  ink?: string;
};

export type ChartSpec = {
  candles: Candle[];
  lines?: ChartLevel[];
  /** Index of a candle to circle. */
  highlight?: number;
  /** Show an empty "next candle?" slot after the last candle. */
  ghost?: boolean;
  /** Simple moving average period. */
  ma?: number;
};

export type GlyphKind = 'bullish' | 'bearish' | 'hammer' | 'doji' | 'shootingStar' | 'bullEngulf' | 'bearEngulf';

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

export type QuestionStep = ChoiceStep | ChartStep | PredictStep | TrueFalseStep | FillStep | MatchStep;
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
  /** Which market track shows this unit. */
  track: 'common' | 'forex' | 'crypto';
  color: string;
  edge: string;
  ink: string;
  lessons: Lesson[];
};

export const isQuestion = (step: Step): step is QuestionStep => step.type !== 'learn';
