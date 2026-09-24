/**
 * Chart drawings, TradingView style: the tool catalogue, where each drawing's points sit
 * (candle time + price, so drawings stay on their candles as new ones arrive), and the
 * shapes each tool draws in screen space. Pure, so it can be tested; the chart renders
 * the shapes and does the touch handling.
 */
import { isEn, t } from '@/i18n';
import { fa } from '@/utils/format';

export type ToolCategory = 'lines' | 'fib' | 'patterns' | 'measure' | 'shapes' | 'notes';

export const TOOL_CATEGORIES: { id: ToolCategory; label: string }[] = [
  { id: 'lines', label: 'خطوط روند' }, // i18n-ignore: translated where shown
  { id: 'fib', label: 'فیبوناچی و گن' }, // i18n-ignore: translated where shown
  { id: 'patterns', label: 'الگوها' }, // i18n-ignore: translated where shown
  { id: 'measure', label: 'پیش‌بینی و اندازه‌گیری' }, // i18n-ignore: translated where shown
  { id: 'shapes', label: 'اشکال هندسی' }, // i18n-ignore: translated where shown
  { id: 'notes', label: 'یادداشت‌گذاری' }, // i18n-ignore: translated where shown
];

export type ToolId =
  | 'trend'
  | 'ray'
  | 'info'
  | 'extended'
  | 'angle'
  | 'hline'
  | 'hray'
  | 'vline'
  | 'cross'
  | 'channel'
  | 'pitchfork'
  | 'fibRetracement'
  | 'fibExtension'
  | 'fibTimeZone'
  | 'gannFan'
  | 'xabcd'
  | 'abcd'
  | 'headShoulders'
  | 'trianglePattern'
  | 'elliottImpulse'
  | 'elliottCorrection'
  | 'longPosition'
  | 'shortPosition'
  | 'priceRange'
  | 'dateRange'
  | 'datePriceRange'
  | 'brush'
  | 'highlighter'
  | 'arrow'
  | 'arrowUp'
  | 'arrowDown'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'path'
  | 'polyline'
  | 'text'
  | 'note'
  | 'callout'
  | 'priceLabel'
  | 'flag';

/** How a tool is placed: a fixed number of taps, taps until "done", or a freehand stroke. */
export type Placement = number | 'multi' | 'brush';

export type ToolDef = {
  id: ToolId;
  category: ToolCategory;
  name: string;
  en: string;
  place: Placement;
  /** Asks for a text after placing. */
  text?: boolean;
  /** Names of the points while placing (for patterns). */
  labels?: string[];
};

export const TOOLS: ToolDef[] = [
  { id: 'trend', category: 'lines', name: 'خط روند', en: 'Trend Line', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'ray', category: 'lines', name: 'پرتو', en: 'Ray', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'info', category: 'lines', name: 'خط اطلاعات', en: 'Info Line', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'extended', category: 'lines', name: 'خط ممتد', en: 'Extended Line', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'angle', category: 'lines', name: 'زاویه‌ی روند', en: 'Trend Angle', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'hline', category: 'lines', name: 'خط افقی', en: 'Horizontal Line', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'hray', category: 'lines', name: 'پرتو افقی', en: 'Horizontal Ray', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'vline', category: 'lines', name: 'خط عمودی', en: 'Vertical Line', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'cross', category: 'lines', name: 'خط متقاطع', en: 'Cross Line', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'channel', category: 'lines', name: 'کانال موازی', en: 'Parallel Channel', place: 3 }, // i18n-ignore: translated where shown (toolName)
  { id: 'pitchfork', category: 'lines', name: 'چنگال اندروز', en: 'Pitchfork', place: 3 }, // i18n-ignore: translated where shown (toolName)
  { id: 'fibRetracement', category: 'fib', name: 'فیبوناچی اصلاحی', en: 'Fib Retracement', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'fibExtension', category: 'fib', name: 'اکستنشن فیبوناچی', en: 'Trend-Based Fib Extension', place: 3 }, // i18n-ignore: translated where shown (toolName)
  { id: 'fibTimeZone', category: 'fib', name: 'زون زمانی فیبوناچی', en: 'Fib Time Zone', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'gannFan', category: 'fib', name: 'فن گن', en: 'Gann Fan', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'xabcd', category: 'patterns', name: 'الگوی XABCD', en: 'XABCD Pattern', place: 5, labels: ['X', 'A', 'B', 'C', 'D'] }, // i18n-ignore: translated where shown (toolName)
  { id: 'abcd', category: 'patterns', name: 'الگوی ABCD', en: 'ABCD Pattern', place: 4, labels: ['A', 'B', 'C', 'D'] }, // i18n-ignore: translated where shown (toolName)
  { id: 'headShoulders', category: 'patterns', name: 'سر و شانه', en: 'Head and Shoulders', place: 7, labels: ['', 'شانه', '', 'سر', '', 'شانه', ''] }, // i18n-ignore: translated where shown (toolName)
  { id: 'trianglePattern', category: 'patterns', name: 'الگوی مثلث', en: 'Triangle Pattern', place: 4, labels: ['A', 'B', 'C', 'D'] }, // i18n-ignore: translated where shown (toolName)
  { id: 'elliottImpulse', category: 'patterns', name: 'موج ضربه‌ای الیوت', en: 'Elliott Impulse Wave', place: 6, labels: ['0', '1', '2', '3', '4', '5'] }, // i18n-ignore: translated where shown (toolName)
  { id: 'elliottCorrection', category: 'patterns', name: 'موج اصلاحی الیوت', en: 'Elliott Correction Wave', place: 4, labels: ['0', 'A', 'B', 'C'] }, // i18n-ignore: translated where shown (toolName)
  { id: 'longPosition', category: 'measure', name: 'پوزیشن خرید', en: 'Long Position', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'shortPosition', category: 'measure', name: 'پوزیشن فروش', en: 'Short Position', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'priceRange', category: 'measure', name: 'محدوده‌ی قیمت', en: 'Price Range', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'dateRange', category: 'measure', name: 'محدوده‌ی زمان', en: 'Date Range', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'datePriceRange', category: 'measure', name: 'زمان و قیمت', en: 'Date and Price Range', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'brush', category: 'shapes', name: 'قلم', en: 'Brush', place: 'brush' }, // i18n-ignore: translated where shown (toolName)
  { id: 'highlighter', category: 'shapes', name: 'ماژیک', en: 'Highlighter', place: 'brush' }, // i18n-ignore: translated where shown (toolName)
  { id: 'arrow', category: 'shapes', name: 'فلش', en: 'Arrow', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'arrowUp', category: 'shapes', name: 'علامت بالا', en: 'Arrow Marker Up', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'arrowDown', category: 'shapes', name: 'علامت پایین', en: 'Arrow Marker Down', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'rectangle', category: 'shapes', name: 'مستطیل', en: 'Rectangle', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'circle', category: 'shapes', name: 'دایره', en: 'Circle', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'ellipse', category: 'shapes', name: 'بیضی', en: 'Ellipse', place: 2 }, // i18n-ignore: translated where shown (toolName)
  { id: 'triangle', category: 'shapes', name: 'مثلث', en: 'Triangle', place: 3 }, // i18n-ignore: translated where shown (toolName)
  { id: 'path', category: 'shapes', name: 'مسیر', en: 'Path', place: 'multi' }, // i18n-ignore: translated where shown (toolName)
  { id: 'polyline', category: 'shapes', name: 'چندخطی', en: 'Polyline', place: 'multi' }, // i18n-ignore: translated where shown (toolName)
  { id: 'text', category: 'notes', name: 'متن', en: 'Text', place: 1, text: true }, // i18n-ignore: translated where shown (toolName)
  { id: 'note', category: 'notes', name: 'یادداشت', en: 'Note', place: 1, text: true }, // i18n-ignore: translated where shown (toolName)
  { id: 'callout', category: 'notes', name: 'کال‌اوت', en: 'Callout', place: 1, text: true }, // i18n-ignore: translated where shown (toolName)
  { id: 'priceLabel', category: 'notes', name: 'برچسب قیمت', en: 'Price Label', place: 1 }, // i18n-ignore: translated where shown (toolName)
  { id: 'flag', category: 'notes', name: 'پرچم', en: 'Flag Mark', place: 1 }, // i18n-ignore: translated where shown (toolName)
];

/** A tool's name in the app's language. */
export function toolName(def: ToolDef): string {
  return isEn() ? def.en : def.name;
}

/** A tool category's name in the app's language. */
export function categoryLabel(id: ToolCategory): string {
  const label = TOOL_CATEGORIES.find((c) => c.id === id)?.label;
  return label ? t(label) : id;
}

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

/** Tools matching a search in Persian or English. */
export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  return TOOLS.filter((t) => t.name.includes(q) || t.en.toLowerCase().includes(q));
}

export type DrawPoint = { t: number; p: number };

export type Drawing = { id: string; tool: ToolId; points: DrawPoint[]; color: string; text?: string };

export const DRAW_COLORS = ['#5AB0FF', '#2BD47D', '#FF5A6E', '#FFC53D', '#A78BFA', '#F1F4F9'];

export function defaultColor(tool: ToolId): string {
  if (tool.startsWith('fib') || tool === 'gannFan') return '#FFC53D';
  if (tool === 'highlighter') return '#FFC53D';
  if (tool === 'arrowUp') return '#2BD47D';
  if (tool === 'arrowDown') return '#FF5A6E';
  if (tool === 'headShoulders' || tool === 'xabcd' || tool === 'abcd') return '#A78BFA';
  return '#5AB0FF';
}

/**
 * Drawings kept per symbol, points kept per freehand stroke, and points kept across all
 * symbols (drawings are saved with the rest of the progress, which has a size cap).
 */
export const MAX_DRAWINGS = 50;
export const MAX_STROKE = 150;
export const MAX_POINTS = 3000;

export const FIB_RETRACEMENT = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const FIB_EXTENSION = [0, 0.382, 0.618, 1, 1.272, 1.618, 2, 2.618];
export const FIB_TIME = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
export const GANN_RATIOS: { r: number; label: string }[] = [
  { r: 8, label: '8x1' },
  { r: 4, label: '4x1' },
  { r: 3, label: '3x1' },
  { r: 2, label: '2x1' },
  { r: 1, label: '1x1' },
  { r: 1 / 2, label: '1x2' },
  { r: 1 / 3, label: '1x3' },
  { r: 1 / 4, label: '1x4' },
  { r: 1 / 8, label: '1x8' },
];

/** Fib retracement: level 1 at the first point, 0 at the second (as in TradingView). */
export function retracementPrice(p0: number, p1: number, level: number): number {
  return p1 + (p0 - p1) * level;
}

/** Trend-based extension: the first move (p0 → p1) projected from the third point. */
export function extensionPrice(p0: number, p1: number, p2: number, level: number): number {
  return p2 + (p1 - p0) * level;
}

// ---------- time ↔ candle index ----------

/** Typical gap between candles, for times beyond the data. */
function interval(times: number[]): number {
  const n = times.length;
  const gaps: number[] = [];
  for (let i = Math.max(1, n - 6); i < n; i++) gaps.push(times[i] - times[i - 1]);
  gaps.sort((a, b) => a - b);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)] || 60_000 : 60_000;
}

/** Fractional candle index of a time; times outside the data continue at the usual gap. */
export function timeIndex(times: number[], t: number): number {
  const n = times.length;
  if (n === 0) return 0;
  const gap = interval(times);
  if (t <= times[0]) return (t - times[0]) / gap;
  if (t >= times[n - 1]) return n - 1 + (t - times[n - 1]) / gap;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo + (t - times[lo]) / (times[hi] - times[lo] || gap);
}

/** The time at a fractional candle index (the inverse of timeIndex). */
export function indexTime(times: number[], f: number): number {
  const n = times.length;
  if (n === 0) return 0;
  const gap = interval(times);
  if (f <= 0) return times[0] + f * gap;
  if (f >= n - 1) return times[n - 1] + (f - (n - 1)) * gap;
  const i = Math.floor(f);
  return times[i] + (times[i + 1] - times[i]) * (f - i);
}

// ---------- screen geometry ----------

export type DrawMap = {
  /** Fractional candle index of a time, and the x of a fractional index. */
  f: (t: number) => number;
  xf: (f: number) => number;
  y: (p: number) => number;
  /** Plot bounds in px. */
  right: number;
  bottom: number;
  fmt: (p: number) => string;
};

export type Shape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; dash?: boolean; width?: number; opacity?: number; color?: string; arrow?: boolean }
  | { kind: 'poly'; points: [number, number][]; closed?: boolean; fillOpacity?: number; width?: number; opacity?: number; color?: string; noStroke?: boolean; arrow?: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fillOpacity: number; color?: string; stroke?: boolean }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fillOpacity: number }
  | { kind: 'label'; x: number; y: number; text: string; align?: 'start' | 'center' | 'end'; color?: string; box?: boolean; size?: number; mono?: boolean }
  | { kind: 'marker'; x: number; y: number; marker: 'up' | 'down' | 'flag' | 'pin' | 'dot'; color?: string }
  | { kind: 'tag'; y: number; text: string };

type Pt = { x: number; y: number };

/** A segment through a→b stretched to the plot edges: forward only (ray) or both ways. */
export function extendLine(a: Pt, b: Pt, right: number, bottom: number, both: boolean): [Pt, Pt] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return [a, b];
  // Parameters where the line leaves the plot box [0, right] × [0, bottom].
  const ts: number[] = [];
  if (dx !== 0) ts.push((0 - a.x) / dx, (right - a.x) / dx);
  if (dy !== 0) ts.push((0 - a.y) / dy, (bottom - a.y) / dy);
  const inside = ts.filter((t) => {
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    return x >= -0.5 && x <= right + 0.5 && y >= -0.5 && y <= bottom + 0.5;
  });
  const tMax = Math.max(1, ...inside);
  const tMin = both ? Math.min(0, ...inside) : 0;
  return [
    { x: a.x + dx * tMin, y: a.y + dy * tMin },
    { x: a.x + dx * tMax, y: a.y + dy * tMax },
  ];
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const pctText = (from: number, to: number) => `${to >= from ? '+' : ''}${round2(((to - from) / from) * 100)}%`;
const barsText = (n: number) => {
  const bars = Math.round(Math.abs(n));
  return t('{n} کندل', { n: bars, count: bars });
};

/** Default stop and target of a long/short position tool: one and two stop distances. */
export function positionLevels(long: boolean, entry: number, stopDistance: number): { tp: number; sl: number } {
  const dir = long ? 1 : -1;
  return { tp: entry + dir * stopDistance * 2, sl: entry - dir * stopDistance };
}

/** Vertical room (px) a fib level's name needs. */
const LABEL_ROOM = 13;

/**
 * Which level names to print when levels are squeezed together: always the first and
 * last, and the ones between only where they don't sit on a name already printed.
 */
export function roomyLabels(ys: number[]): boolean[] {
  const last = ys.length - 1;
  let prev = ys[0];
  return ys.map((yy, i) => {
    if (i === 0 || i === last) return true;
    if (Math.abs(yy - prev) < LABEL_ROOM || Math.abs(yy - ys[last]) < LABEL_ROOM) return false;
    prev = yy;
    return true;
  });
}

/** Candles a new long/short position tool spans. */
export const POSITION_BARS = 20;

/** Everything a drawing draws, in screen space. `draft` is true while it's being placed. */
export function drawingShapes(d: Drawing, m: DrawMap): Shape[] {
  const P = d.points.map((q) => ({ x: m.xf(m.f(q.t)), y: m.y(q.p) }));
  const out: Shape[] = [];
  const a = P[0];
  const b = P[1];
  const c = P[2];
  if (!a) return out;
  const line = (p: Pt, q: Pt, extra: Partial<Extract<Shape, { kind: 'line' }>> = {}) => out.push({ kind: 'line', x1: p.x, y1: p.y, x2: q.x, y2: q.y, ...extra });

  switch (d.tool) {
    case 'trend':
    case 'arrow':
      if (b) line(a, b, d.tool === 'arrow' ? { arrow: true } : {});
      break;
    case 'ray':
    case 'extended':
      if (b) {
        const [s, e] = extendLine(a, b, m.right, m.bottom, d.tool === 'extended');
        line(s, e);
      }
      break;
    case 'info':
      if (b) {
        line(a, b);
        const dp = d.points[1].p - d.points[0].p;
        out.push({ kind: 'label', x: b.x + 6, y: b.y - 12, box: true, mono: true, text: `${dp >= 0 ? '+' : '-'}${m.fmt(Math.abs(dp))} (${pctText(d.points[0].p, d.points[1].p)}) · ${barsText(m.f(d.points[1].t) - m.f(d.points[0].t))}` });
      }
      break;
    case 'angle':
      if (b) {
        line(a, b);
        line(a, { x: a.x + 44, y: a.y }, { dash: true, opacity: 0.7 });
        const deg = Math.round((Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI);
        out.push({ kind: 'label', x: a.x + 48, y: a.y - (deg >= 0 ? 16 : -2), text: `${deg}°`, mono: true });
      }
      break;
    case 'hline':
      line({ x: 0, y: a.y }, { x: m.right, y: a.y });
      out.push({ kind: 'tag', y: a.y, text: m.fmt(d.points[0].p) });
      break;
    case 'hray':
      line(a, { x: m.right, y: a.y });
      out.push({ kind: 'tag', y: a.y, text: m.fmt(d.points[0].p) });
      break;
    case 'vline':
      line({ x: a.x, y: 0 }, { x: a.x, y: m.bottom });
      break;
    case 'cross':
      line({ x: 0, y: a.y }, { x: m.right, y: a.y });
      line({ x: a.x, y: 0 }, { x: a.x, y: m.bottom });
      out.push({ kind: 'tag', y: a.y, text: m.fmt(d.points[0].p) });
      break;
    case 'channel':
      if (b) {
        line(a, b);
        if (c) {
          // The third point sets how far the parallel line sits from the first.
          const [q0, q1, q2] = d.points;
          const f0 = m.f(q0.t);
          const f1 = m.f(q1.t);
          const f2 = m.f(q2.t);
          const onLine = f1 === f0 ? q0.p : q0.p + ((q1.p - q0.p) * (f2 - f0)) / (f1 - f0);
          const off = q2.p - onLine;
          const a2 = { x: a.x, y: m.y(q0.p + off) };
          const b2 = { x: b.x, y: m.y(q1.p + off) };
          line(a2, b2);
          line({ x: a.x, y: m.y(q0.p + off / 2) }, { x: b.x, y: m.y(q1.p + off / 2) }, { dash: true, opacity: 0.6 });
          out.push({ kind: 'poly', points: [[a.x, a.y], [b.x, b.y], [b2.x, b2.y], [a2.x, a2.y]], closed: true, fillOpacity: 0.1, noStroke: true });
        }
      }
      break;
    case 'pitchfork':
      if (b) line(a, b, { dash: !c });
      if (b && c) {
        const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
        const dir = { x: mid.x - a.x, y: mid.y - a.y };
        const [, e0] = extendLine(a, mid, m.right, m.bottom, false);
        line(a, e0);
        for (const p of [b, c]) {
          const [, e] = extendLine(p, { x: p.x + dir.x, y: p.y + dir.y }, m.right, m.bottom, false);
          line(p, e);
        }
        line(b, c, { dash: true, opacity: 0.7 });
      }
      break;
    case 'fibRetracement':
      if (b) {
        const x0 = Math.min(a.x, b.x);
        const x1 = Math.max(Math.max(a.x, b.x), x0 + 40);
        line(a, b, { dash: true, opacity: 0.5 });
        const prices = FIB_RETRACEMENT.map((lvl) => retracementPrice(d.points[0].p, d.points[1].p, lvl));
        const shown = roomyLabels(prices.map(m.y));
        let prevY: number | null = null;
        FIB_RETRACEMENT.forEach((lvl, i) => {
          const yy = m.y(prices[i]);
          line({ x: x0, y: yy }, { x: x1, y: yy }, { width: 1.2 });
          if (prevY != null) out.push({ kind: 'rect', x: x0, y: Math.min(prevY, yy), w: x1 - x0, h: Math.abs(yy - prevY), fillOpacity: i % 2 ? 0.08 : 0.04 });
          if (shown[i]) out.push({ kind: 'label', x: x0 + 3, y: yy - 14, text: `${lvl} (${m.fmt(prices[i])})`, mono: true, size: 10 });
          prevY = yy;
        });
      }
      break;
    case 'fibExtension':
      if (b) line(a, b, { dash: true, opacity: 0.6 });
      if (b && c) {
        line(b, c, { dash: true, opacity: 0.6 });
        const x0 = c.x;
        const x1 = c.x + Math.max(60, Math.abs(b.x - a.x));
        const prices = FIB_EXTENSION.map((lvl) => extensionPrice(d.points[0].p, d.points[1].p, d.points[2].p, lvl));
        const shown = roomyLabels(prices.map(m.y));
        FIB_EXTENSION.forEach((lvl, i) => {
          const yy = m.y(prices[i]);
          line({ x: x0, y: yy }, { x: x1, y: yy }, { width: 1.2 });
          if (shown[i]) out.push({ kind: 'label', x: x0 + 3, y: yy - 14, text: `${lvl} (${m.fmt(prices[i])})`, mono: true, size: 10 });
        });
      }
      break;
    case 'fibTimeZone':
      if (b) {
        const f0 = m.f(d.points[0].t);
        const unit = Math.max(1, Math.round(Math.abs(m.f(d.points[1].t) - f0)));
        for (const k of FIB_TIME) {
          const x = m.xf(f0 + k * unit);
          if (x > m.right) break;
          line({ x, y: 0 }, { x, y: m.bottom }, { width: 1.2 });
          out.push({ kind: 'label', x: x + 3, y: 4, text: String(k), mono: true, size: 10 });
        }
      }
      break;
    case 'gannFan':
      if (b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        for (const g of GANN_RATIOS) {
          const target = { x: a.x + dx, y: a.y + dy * g.r };
          const [, e] = extendLine(a, target, m.right, m.bottom, false);
          line(a, e, { width: g.r === 1 ? 1.6 : 1, opacity: g.r === 1 ? 1 : 0.75 });
          out.push({ kind: 'label', x: target.x + 3, y: target.y - 12, text: g.label, mono: true, size: 9.5 });
        }
      }
      break;
    case 'xabcd':
    case 'abcd':
    case 'headShoulders':
    case 'trianglePattern':
    case 'elliottImpulse':
    case 'elliottCorrection': {
      const def = findTool(d.tool)!;
      out.push({ kind: 'poly', points: P.map((q) => [q.x, q.y]), width: 1.8 });
      if (d.tool === 'xabcd' && P.length >= 3) {
        out.push({ kind: 'poly', points: [[P[0].x, P[0].y], [P[1].x, P[1].y], [P[2].x, P[2].y]], closed: true, fillOpacity: 0.12, noStroke: true });
        if (P.length >= 5) out.push({ kind: 'poly', points: [[P[2].x, P[2].y], [P[3].x, P[3].y], [P[4].x, P[4].y]], closed: true, fillOpacity: 0.12, noStroke: true });
      }
      // Fibonacci ratios of each swing to the one before, the heart of harmonic patterns.
      if (d.tool === 'xabcd' || d.tool === 'abcd') {
        const q = d.points;
        for (let i = 2; i < q.length; i++) {
          const prev = Math.abs(q[i - 1].p - q[i - 2].p);
          if (!prev) continue;
          const ratio = round2(Math.abs(q[i].p - q[i - 1].p) / prev);
          line(P[i - 2], P[i], { dash: true, opacity: 0.5 });
          out.push({ kind: 'label', x: (P[i - 2].x + P[i].x) / 2, y: (P[i - 2].y + P[i].y) / 2 - 8, text: String(ratio), align: 'center', mono: true, size: 10, box: true });
        }
      }
      if (d.tool === 'headShoulders' && P.length >= 5) {
        const [e0, e1] = extendLine(P[2], P[4], m.right, m.bottom, true);
        line(e0, e1, { dash: true, opacity: 0.8 });
      }
      if (d.tool === 'trianglePattern' && P.length >= 4) {
        const [s1, e1] = extendLine(P[0], P[2], m.right, m.bottom, false);
        const [s2, e2] = extendLine(P[1], P[3], m.right, m.bottom, false);
        line(s1, e1, { dash: true, opacity: 0.7 });
        line(s2, e2, { dash: true, opacity: 0.7 });
      }
      P.forEach((q, i) => {
        const label = def.labels?.[i];
        if (!label) return;
        const up = i === 0 ? q.y < (P[1]?.y ?? q.y) : q.y < P[i - 1].y;
        out.push({ kind: 'label', x: q.x, y: up ? q.y - 20 : q.y + 4, text: t(label), align: 'center', box: true, size: 11 });
      });
      break;
    }
    case 'longPosition':
    case 'shortPosition':
      if (b && c) {
        const long = d.tool === 'longPosition';
        const [e, tg, s] = d.points;
        const x0 = a.x;
        const x1 = Math.max(b.x, x0 + 30);
        const ye = a.y;
        const yt = b.y;
        const ys = m.y(s.p);
        out.push({ kind: 'rect', x: x0, y: Math.min(ye, yt), w: x1 - x0, h: Math.abs(yt - ye), fillOpacity: 0.2, color: '#2BD47D' });
        out.push({ kind: 'rect', x: x0, y: Math.min(ye, ys), w: x1 - x0, h: Math.abs(ys - ye), fillOpacity: 0.2, color: '#FF5A6E' });
        line({ x: x0, y: ye }, { x: x1, y: ye }, { width: 1.4, color: '#F1F4F9' });
        const reward = Math.abs(tg.p - e.p);
        const risk = Math.abs(e.p - s.p);
        const rr = risk ? round2(reward / risk) : 0;
        // Target and stop read just outside the box, centred on the part of it in view.
        const mid = (Math.max(0, x0) + Math.min(m.right, x1)) / 2;
        out.push({ kind: 'label', x: mid, y: yt + (yt < ye ? -19 : 3), align: 'center', mono: true, size: 10, box: true, color: '#2BD47D', text: `${m.fmt(tg.p)} (${pctText(e.p, tg.p)})  R:R ${rr}` });
        out.push({ kind: 'label', x: mid, y: ys + (ys < ye ? -19 : 3), align: 'center', mono: true, size: 10, box: true, color: '#FF5A6E', text: `${m.fmt(s.p)} (${pctText(e.p, s.p)})` });
        out.push({ kind: 'label', x: x0 + 3, y: ye + (yt < ye ? 3 : -17), mono: true, size: 10, text: `${long ? t('خرید') : t('فروش')} ${m.fmt(e.p)}` });
      }
      break;
    case 'priceRange':
    case 'dateRange':
    case 'datePriceRange':
      if (b) {
        const x0 = Math.min(a.x, b.x);
        const y0 = Math.min(a.y, b.y);
        out.push({ kind: 'rect', x: x0, y: y0, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), fillOpacity: 0.14 });
        const [q0, q1] = d.points;
        const parts: string[] = [];
        if (d.tool !== 'dateRange') {
          line({ x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, { arrow: true });
          const dp = q1.p - q0.p;
          parts.push(`${dp >= 0 ? '+' : '-'}${m.fmt(Math.abs(dp))} (${pctText(q0.p, q1.p)})`);
        }
        if (d.tool !== 'priceRange') {
          line({ x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, { arrow: true });
          parts.push(barsText(m.f(q1.t) - m.f(q0.t)));
        }
        out.push({ kind: 'label', x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 4, align: 'center', mono: true, size: 10.5, box: true, text: parts.join(' · ') });
      }
      break;
    case 'brush':
    case 'highlighter':
      out.push({ kind: 'poly', points: P.map((q) => [q.x, q.y]), width: d.tool === 'highlighter' ? 14 : 2.4, opacity: d.tool === 'highlighter' ? 0.35 : 1 });
      break;
    case 'arrowUp':
    case 'arrowDown':
      out.push({ kind: 'marker', x: a.x, y: a.y, marker: d.tool === 'arrowUp' ? 'up' : 'down' });
      break;
    case 'rectangle':
      if (b) out.push({ kind: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), fillOpacity: 0.16, stroke: true });
      break;
    case 'circle':
      if (b) {
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        out.push({ kind: 'ellipse', cx: a.x, cy: a.y, rx: r, ry: r, fillOpacity: 0.14 });
      }
      break;
    case 'ellipse':
      if (b) out.push({ kind: 'ellipse', cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, rx: Math.abs(b.x - a.x) / 2, ry: Math.abs(b.y - a.y) / 2, fillOpacity: 0.14 });
      break;
    case 'triangle':
      out.push({ kind: 'poly', points: P.map((q) => [q.x, q.y]), closed: P.length === 3, fillOpacity: P.length === 3 ? 0.16 : 0 });
      break;
    case 'path':
    case 'polyline':
      out.push({ kind: 'poly', points: P.map((q) => [q.x, q.y]), width: 2, arrow: d.tool === 'path' && P.length > 1 });
      break;
    case 'text':
      out.push({ kind: 'label', x: a.x, y: a.y - 10, text: d.text || t('متن'), size: 14 });
      break;
    case 'note':
      out.push({ kind: 'marker', x: a.x, y: a.y, marker: 'pin' });
      out.push({ kind: 'label', x: a.x, y: a.y - 44, text: d.text || t('یادداشت'), align: 'center', box: true, size: 12 });
      break;
    case 'callout':
      line(a, { x: a.x + 24, y: a.y - 24 });
      out.push({ kind: 'label', x: a.x + 24, y: a.y - 44, text: d.text || t('کال‌اوت'), box: true, size: 12 });
      break;
    case 'priceLabel':
      line(a, { x: a.x + 18, y: a.y - 18 });
      out.push({ kind: 'label', x: a.x + 18, y: a.y - 36, text: m.fmt(d.points[0].p), box: true, mono: true, size: 11 });
      break;
    case 'flag':
      out.push({ kind: 'marker', x: a.x, y: a.y, marker: 'flag' });
      break;
  }
  return out.map((s) => (s.kind === 'label' ? keepInView(s, m.right) : s));
}

type Label = Extract<Shape, { kind: 'label' }>;

/** Rough width (px) of a label, for keeping it in view and for taps. */
export function labelWidth(s: Label): number {
  return s.text.length * (s.size ?? 11) * 0.62 + 10;
}

/** Slides a label whose anchor is in view so none of it hangs off the plot's right or left edge. */
function keepInView(s: Label, right: number): Label {
  if (s.x < 0 || s.x > right) return s;
  const w = labelWidth(s);
  const clamp = (x: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, x)));
  const x = s.align === 'center' ? clamp(s.x, w / 2 + 2, right - w / 2 - 2) : s.align === 'end' ? clamp(s.x, w + 2, right - 2) : clamp(s.x, 2, right - w - 2);
  return x === s.x ? s : { ...s, x };
}

/** Screen positions of a drawing's handles (its points), for selecting and dragging. */
export function drawingHandles(d: Drawing, m: DrawMap): Pt[] {
  if (d.tool === 'brush' || d.tool === 'highlighter') return [];
  const pts = d.points.map((q) => ({ x: m.xf(m.f(q.t)), y: m.y(q.p) }));
  // A position's stop handle sits on the box's right edge with the target's.
  if ((d.tool === 'longPosition' || d.tool === 'shortPosition') && pts.length === 3) pts[2] = { x: pts[1].x, y: pts[2].y };
  return pts;
}

/**
 * Whether a tap at (x, y) touches one of the shapes. Without `areas` only lines, outlines,
 * labels and markers count, so a line can be picked out from under a shaded zone.
 */
export function hitShapes(shapes: Shape[], x: number, y: number, tol = 10, areas = true): boolean {
  for (const s of shapes) {
    switch (s.kind) {
      case 'line':
        if (distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= tol + (s.width ?? 0) / 2) return true;
        break;
      case 'poly': {
        const pts = s.closed ? [...s.points, s.points[0]] : s.points;
        if (!s.noStroke) for (let i = 1; i < pts.length; i++) if (distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= tol + (s.width ?? 0) / 2) return true;
        if (areas && s.closed && s.fillOpacity && pointInPoly(x, y, s.points)) return true;
        break;
      }
      case 'rect': {
        const inside = x >= s.x - tol && x <= s.x + s.w + tol && y >= s.y - tol && y <= s.y + s.h + tol;
        const onEdge = inside && (Math.abs(x - s.x) <= tol || Math.abs(x - s.x - s.w) <= tol || Math.abs(y - s.y) <= tol || Math.abs(y - s.y - s.h) <= tol);
        if (areas ? inside : s.stroke && onEdge) return true;
        break;
      }
      case 'ellipse': {
        const r = Math.hypot((x - s.cx) / Math.max(1, s.rx), (y - s.cy) / Math.max(1, s.ry));
        if (areas ? ((x - s.cx) / (s.rx + tol)) ** 2 + ((y - s.cy) / (s.ry + tol)) ** 2 <= 1 : Math.abs(r - 1) * Math.min(s.rx, s.ry) <= tol) return true;
        break;
      }
      case 'label': {
        const w = labelWidth(s);
        const x0 = s.align === 'center' ? s.x - w / 2 : s.align === 'end' ? s.x - w : s.x;
        if (x >= x0 - 4 && x <= x0 + w + 4 && y >= s.y - 4 && y <= s.y + (s.size ?? 11) * 1.6 + 4) return true;
        break;
      }
      case 'marker':
        if (Math.hypot(x - s.x, y - s.y) <= 18) return true;
        break;
      case 'tag':
        break;
    }
  }
  return false;
}

function pointInPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Keeps every n-th point of a long freehand stroke so it stays small enough to save. */
export function thinStroke(points: DrawPoint[], max = MAX_STROKE): DrawPoint[] {
  if (points.length <= max) return points;
  const every = points.length / max;
  const out: DrawPoint[] = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * every)]);
  out.push(points[points.length - 1]);
  return out;
}

/** Moves a whole drawing by whole candles and a price difference. */
export function shiftDrawing(d: Drawing, times: number[], bars: number, dp: number, decimals: number): Drawing {
  const k = 10 ** decimals;
  return {
    ...d,
    points: d.points.map((q) => ({ t: Math.round(indexTime(times, timeIndex(times, q.t) + bars)), p: Math.round((q.p + dp) * k) / k })),
  };
}

/** The long/short position tool from its entry tap: target and stop, POSITION_BARS candles wide. */
export function expandPosition(d: Drawing, times: number[], stopDistance: number, decimals: number): Drawing {
  const [e] = d.points;
  const k = 10 ** decimals;
  const { tp, sl } = positionLevels(d.tool === 'longPosition', e.p, stopDistance);
  const t1 = Math.round(indexTime(times, timeIndex(times, e.t) + POSITION_BARS));
  return { ...d, points: [e, { t: t1, p: Math.round(tp * k) / k }, { t: t1, p: Math.round(sl * k) / k }] };
}

export function drawingPoints(list: Drawing[]): number {
  return list.reduce((n, d) => n + d.points.length, 0);
}

/**
 * Whether a symbol's drawings can become `next`: always when it shrinks or keeps its size,
 * otherwise only within the per-symbol and overall limits.
 */
export function fitsBudget(all: Record<string, Drawing[]>, symbol: string, next: Drawing[]): boolean {
  const current = all[symbol] ?? [];
  if (next.length > current.length && next.length > MAX_DRAWINGS) return false;
  const others = Object.entries(all).reduce((n, [k, list]) => (k === symbol ? n : n + drawingPoints(list)), 0);
  return drawingPoints(next) <= drawingPoints(current) || others + drawingPoints(next) <= MAX_POINTS;
}

/** What to do next while placing a tool, e.g. "tap point 2 of 3". */
export function placeHint(def: ToolDef, placed: number): string {
  if (def.place === 'brush') return t('انگشتت رو روی نمودار بکش');
  if (def.place === 'multi') return placed === 0 ? t('نقطه‌ی اول رو بزن') : t('نقطه‌ی بعدی رو بزن؛ آخرش «تمام»');
  if (def.place === 1) return t('جای رسم رو روی نمودار بزن');
  const label = def.labels?.[placed];
  if (label && /^[A-Z0-9]$/.test(label)) return t('نقطه‌ی {label} رو بزن ({n} از {total})', { label, n: fa(placed + 1), total: fa(def.place) });
  if (placed === 0 && def.place === 2) return t('نقطه‌ی اول رو بزن، یا از اول تا آخر بکش');
  return t('نقطه‌ی {n} از {total} رو بزن', { n: fa(placed + 1), total: fa(def.place) });
}

let counter = 0;
export function newDrawingId(): string {
  counter += 1;
  return `d${Date.now().toString(36)}${counter}`;
}
