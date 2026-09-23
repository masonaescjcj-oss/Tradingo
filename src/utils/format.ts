const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Converts Latin digits in a number or string to Persian digits. */
export function fa(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Formats an integer with Persian digits and the Persian thousands separator. */
export function faNum(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return sign + fa(grouped);
}

/** Formats a dollar amount with Latin digits, e.g. "$10,482.50". */
export function usd(value: number, withSign = false): string {
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = value < 0 ? '-' : withSign ? '+' : '';
  return `${sign}$${abs}`;
}

/** Formats seconds as m:ss with Persian digits. */
export function faDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return fa(`${m}:${String(s).padStart(2, '0')}`);
}
