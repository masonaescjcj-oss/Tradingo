import { byLang, t } from '@/i18n';
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

/** An R multiple such as «+۱٫۵R» (+1.5R in English), kept left-to-right. */
export function rText(r: number, maxDecimals = 1): string {
  return ltr(`${r >= 0 ? '+' : '−'}${faDec(Math.abs(r), maxDecimals)}R`);
}

/** A number in the app's digits and decimal separator, e.g. «۲٫۵» (2.5 in English). */
export function faDec(value: number, maxDecimals = 1): string {
  return fa(String(Number(value.toFixed(maxDecimals)))).replace('.', byLang('٫', '.')); // i18n-ignore: Persian decimal separator
}

export function faPct(fraction: number, maxDecimals = 1): string {
  return `${faDec(fraction * 100, maxDecimals)}${byLang('٪', '%')}`; // i18n-ignore: Persian percent sign
}

/** Human-readable price distance: pips for EUR/USD, dollars otherwise. */
export function distanceLabel(spec: SymbolSpec, d: number): string {
  if (spec.id === 'EURUSD') return t('{n} پیپ', { n: faDec(d / 0.0001, 1) });
  return t('{n} دلار', { n: faDec(d, spec.decimals > 1 ? 2 : 1) });
}

/** A trade's entry, as a label. Not through t(): on its own «ورود» means "sign in" in the dictionary. */
export const entryText = () => byLang('ورود', 'Entry'); // i18n-ignore: see above

export const sideText = (side: Side) => (side === 'buy' ? t('خرید') : t('فروش'));

export function orderText(type: OrderType, side: Side): string {
  const kind = type === 'market' ? t('مارکت') : type === 'limit' ? t('لیمیت') : t('استاپ');
  return t('{side} {kind}', { side: sideText(side), kind });
}

export function reasonText(reason: CloseReason): string {
  switch (reason) {
    case 'sl':
      return t('حد ضرر خورد');
    case 'tp':
      return t('حد سود خورد');
    case 'liquidation':
      return t('لیکوئید شد');
    default:
      return t('دستی بسته شد');
  }
}

export function placeErrorText(error: PlaceError): string {
  switch (error) {
    case 'margin':
      return t('مارجین آزاد کافی نیست. حجم رو کم کن یا اهرم رو بیشتر کن.');
    case 'size':
      return t('حجم صفره. با این درصد ریسک و حد ضرر، حجم از حداقل هم کمتر می‌شه.');
    case 'price':
      return t('قیمت سفارش با نوعش نمی‌خونه؛ یه‌کم فاصله‌ش رو عوض کن.');
    case 'sl':
      return t('حد ضرر باید سمت ضرر معامله باشه.');
    case 'tp':
      return t('حد سود باید سمت سود معامله باشه.');
    default:
      return t('این سفارش ثبت نشد.');
  }
}

export type Tone = 'bull' | 'bear' | 'sky' | 'gold';
export type Notice = { text: string; amount?: number; tone: Tone };

const label = (symbol: string) => findSymbol(symbol)?.label ?? symbol;

export function eventNotice(e: TradeEvent): Notice {
  switch (e.kind) {
    case 'opened':
      return { text: t('{side} {symbol} باز شد', { side: sideText(e.position.side), symbol: label(e.position.symbol) }), tone: 'sky' };
    case 'placed':
      return { text: t('سفارش {order} {symbol} ثبت شد', { order: orderText(e.order.type, e.order.side), symbol: label(e.order.symbol) }), tone: 'sky' };
    case 'filled':
      return { text: t('سفارش {order} {symbol} پر شد', { order: orderText(e.order.type, e.order.side), symbol: label(e.order.symbol) }), tone: 'gold' };
    case 'rejected':
      return { text: t('سفارش {symbol} لغو شد: مارجین آزاد کافی نبود', { symbol: label(e.order.symbol) }), tone: 'bear' };
    case 'closed': {
      const trade = e.trade;
      if (trade.reason === 'liquidation') return { text: t('{symbol} لیکوئید شد!', { symbol: label(trade.symbol) }), amount: trade.pnl, tone: 'bear' };
      return { text: `${label(trade.symbol)}: ${reasonText(trade.reason)}`, amount: trade.pnl, tone: trade.pnl >= 0 ? 'bull' : 'bear' };
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
  return events.length > 1 ? { ...n, text: `${n.text} ${t('(+{n} رویداد دیگه)', { n: fa(events.length - 1), count: events.length - 1 })}` } : n;
}
