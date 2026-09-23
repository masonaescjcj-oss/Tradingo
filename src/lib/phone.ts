const DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/** Persian and Arabic digits to Latin, everything else untouched. */
export function latinDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d]);
}

/**
 * Normalises an Iranian mobile number to 09XXXXXXXXX, accepting Persian digits, spaces,
 * dashes and the +98 / 0098 / 98 prefixes. Returns null when it isn't a mobile number.
 */
export function normalizeMobile(input: string): string | null {
  let d = latinDigits(input).replace(/[\s\-()]/g, '');
  if (d.startsWith('+98')) d = d.slice(3);
  else if (d.startsWith('0098')) d = d.slice(4);
  else if (d.startsWith('98') && d.length === 12) d = d.slice(2);
  if (d.startsWith('9') && d.length === 10) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : null;
}

/** 0912 345 6789, for display. */
export function formatMobile(mobile: string): string {
  return `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7)}`;
}
