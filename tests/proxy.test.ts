import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { BINANCE_HOSTS, BROWSER_HOSTS } from '../src/lib/marketData';
import { BINANCE_PROXY, PROXIED_SUPABASE, PROXY_ORIGIN, SUPABASE_PROXY, supabaseRelay } from '../src/lib/proxy';

const ROOT = join(__dirname, '..');
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as { rewrites: { source: string; destination: string }[] };

describe('relay through app.chartoon.net', () => {
  it('asks Binance through the relay first, and never api.binance.com from a browser', () => {
    assert.equal(BINANCE_HOSTS[0], BINANCE_PROXY);
    assert.ok(BINANCE_HOSTS.includes('https://data-api.binance.vision'));
    assert.ok(!BROWSER_HOSTS.includes('https://api.binance.com'));
    assert.equal(BROWSER_HOSTS[0], BINANCE_PROXY);
  });

  it('relays only the Supabase project it forwards to', () => {
    assert.equal(supabaseRelay(PROXIED_SUPABASE), SUPABASE_PROXY);
    assert.equal(supabaseRelay(`${PROXIED_SUPABASE}/`), SUPABASE_PROXY);
    assert.equal(supabaseRelay('https://other.supabase.co'), null);
    assert.equal(supabaseRelay(undefined), null);
  });

  it('matches the rewrites in vercel.json, ahead of the app’s catch-all', () => {
    const path = new URL(PROXY_ORIGIN).pathname;
    const binance = vercel.rewrites.findIndex((r) => r.source === `${path}/binance/:path*`);
    const supabase = vercel.rewrites.findIndex((r) => r.source === `${path}/supabase/:path*`);
    const spa = vercel.rewrites.findIndex((r) => r.source === '/:path*');
    assert.ok(binance >= 0 && supabase >= 0 && spa >= 0);
    assert.ok(binance < spa && supabase < spa, 'the relays must come before the catch-all');
    assert.equal(vercel.rewrites[binance].destination, 'https://data-api.binance.vision/:path*');
    assert.equal(vercel.rewrites[supabase].destination, `${PROXIED_SUPABASE}/:path*`);
  });

  it('serves the project the app is configured with', () => {
    const env = join(ROOT, '.env.local');
    if (!existsSync(env)) return;
    const url = /EXPO_PUBLIC_SUPABASE_URL=(\S+)/.exec(readFileSync(env, 'utf8'))?.[1];
    if (url) assert.equal(supabaseRelay(url), SUPABASE_PROXY, 'vercel.json and src/lib/proxy.ts should point at the configured project');
  });

  it('is left alone by the service worker', () => {
    assert.ok(readFileSync(join(ROOT, 'scripts/sw.template.js'), 'utf8').includes("url.pathname.startsWith('/proxy/')"));
  });
});
