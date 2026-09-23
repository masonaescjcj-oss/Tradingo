import { findSymbol, type SymbolSpec } from '@/lib/simulator';
import type { CloseReason, OrderType, PlaceError, Side, TradeEvent } from '@/lib/trading';
import { fa } from '@/utils/format';

/**
 * Keeps a left-to-right snippet (a dollar amount, "+2R") in one piece inside Persian text;
 * otherwise the bidi algorithm moves "$" or "+" to the wrong side.
 */
export function ltr(text: string): string {
  return `\u2066${text}\u2069`;
}

/** An R multiple such as «+۱٫۵R», kept left-to-right. */
export function rText(r: number, maxDecimals = 1): string {
  return ltr(`${r >= 0 ? '+' : '−'}${faDec(Math.abs(r), maxDecimals)}R`);
}

/** A number with Persian digits and decimal separator, e.g. «۲٫۵». */
export function faDec(value: number, maxDecimals = 1): string {
  return fa(String(Number(value.toFixed(maxDecimals)))).replace('.', '٫');
}

export function faPct(fraction: number, maxDecimals = 1): string {
  return `${faDec(fraction * 100, maxDecimals)}٪`;
}

/** Human-readable price distance: pips for EUR/USD, dollars otherwise. */
export function distanceLabel(spec: SymbolSpec, d: number): string {
  if (spec.id === 'EURUSD') return `${faDec(d / 0.0001, 1)} پیپ`;
  return `${faDec(d, spec.decimals > 1 ? 2 : 1)} دلار`;
}

export const sideText = (side: Side) => (side === 'buy' ? 'خرید' : 'فروش');

export function orderText(type: OrderType, side: Side): string {
  const kind = type === 'market' ? 'مارکت' : type === 'limit' ? 'لیمیت' : 'استاپ';
  return `${sideText(side)} ${kind}`;
}

export function reasonText(reason: CloseReason): string {
  switch (reason) {
    case 'sl':
      return 'حد ضرر خورد';
    case 'tp':
      return 'حد سود خورد';
    case 'liquidation':
      return 'لیکوئید شد';
    default:
      return 'دستی بسته شد';
  }
}

export function placeErrorText(error: PlaceError): string {
  switch (error) {
    case 'margin':
      return 'مارجین آزاد کافی نیست. حجم رو کم کن یا اهرم رو بیشتر کن.';
    case 'size':
      return 'حجم صفره. با این درصد ریسک و حد ضرر، حجم از حداقل هم کمتر می‌شه.';
    case 'price':
      return 'قیمت سفارش با نوعش نمی‌خونه؛ یه‌کم فاصله‌ش رو عوض کن.';
    case 'sl':
      return 'حد ضرر باید سمت ضرر معامله باشه.';
    case 'tp':
      return 'حد سود باید سمت سود معامله باشه.';
    default:
      return 'این سفارش ثبت نشد.';
  }
}

export type Tone = 'bull' | 'bear' | 'sky' | 'gold';
export type Notice = { text: string; amount?: number; tone: Tone };

const label = (symbol: string) => findSymbol(symbol)?.label ?? symbol;

export function eventNotice(e: TradeEvent): Notice {
  switch (e.kind) {
    case 'opened':
      return { text: `${sideText(e.position.side)} ${label(e.position.symbol)} باز شد`, tone: 'sky' };
    case 'placed':
      return { text: `سفارش ${orderText(e.order.type, e.order.side)} ${label(e.order.symbol)} ثبت شد`, tone: 'sky' };
    case 'filled':
      return { text: `سفارش ${orderText(e.order.type, e.order.side)} ${label(e.order.symbol)} پر شد`, tone: 'gold' };
    case 'rejected':
      return { text: `سفارش ${label(e.order.symbol)} لغو شد: مارجین آزاد کافی نبود`, tone: 'bear' };
    case 'closed': {
      const t = e.trade;
      if (t.reason === 'liquidation') return { text: `${label(t.symbol)} لیکوئید شد!`, amount: t.pnl, tone: 'bear' };
      return { text: `${label(t.symbol)}: ${reasonText(t.reason)}`, amount: t.pnl, tone: t.pnl >= 0 ? 'bull' : 'bear' };
    }
  }
}

/** The most important of several events, for a single toast. */
export function pickNotice(events: TradeEvent[]): Notice | null {
  if (events.length === 0) return null;
  const rank = (e: TradeEvent) =>
    e.kind === 'closed' && e.trade.reason === 'liquidation' ? 5 : e.kind === 'closed' ? 4 : e.kind === 'rejected' ? 3 : e.kind === 'filled' ? 2 : 1;
  const best = events.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  const n = eventNotice(best);
  return events.length > 1 ? { ...n, text: `${n.text} (+${fa(events.length - 1)} رویداد دیگه)` } : n;
}
