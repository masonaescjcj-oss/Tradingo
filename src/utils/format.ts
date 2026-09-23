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

/** Decimals a quote usually shows at this price: 1.0825, 150.25, 2386.4, 61250. */
export function priceDecimals(price: number): number {
  const p = Math.abs(price);
  if (p >= 10000) return 0;
  if (p >= 1000) return 1;
  if (p >= 10) return 2;
  if (p >= 1) return 4;
  return 5;
}

/** Formats a quote with Latin digits and thousands separators, e.g. "61,250" or "1.0825". */
export function formatPrice(value: number, decimals = priceDecimals(value)): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** Formats seconds as m:ss with Persian digits. */
export function faDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return fa(`${m}:${String(s).padStart(2, '0')}`);
}
