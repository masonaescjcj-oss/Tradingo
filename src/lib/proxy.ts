/**
 * app.chartoon.net relays the outside services the app needs (see the rewrites in vercel.json).
 * Binance refuses whole regions (Iran among them, and the US for api.binance.com), and some
 * networks filter supabase.co, but chartoon.net opens from all of them, with or without a VPN.
 * So the app asks through the relay first and only then goes to the services directly.
 */
/** Where the app itself lives on the web; chartoon.net is the landing site. */
export const APP_ORIGIN = 'https://app.chartoon.net';

export const PROXY_ORIGIN = `${APP_ORIGIN}/proxy`;

/** Binance market data (data-api.binance.vision), relayed. */
export const BINANCE_PROXY = `${PROXY_ORIGIN}/binance`;

/** The Supabase project the relay forwards to; other projects are called directly. */
export const PROXIED_SUPABASE = 'https://jasgepmskcsyvqoesocc.supabase.co';
export const SUPABASE_PROXY = `${PROXY_ORIGIN}/supabase`;

/** The relayed address of a Supabase project, when the relay serves it. */
export function supabaseRelay(url: string | undefined): string | null {
  return url && url.replace(/\/+$/, '') === PROXIED_SUPABASE ? SUPABASE_PROXY : null;
}
