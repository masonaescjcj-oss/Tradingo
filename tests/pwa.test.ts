import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { Script } from 'node:vm';

import { buildServiceWorker, precacheList, usedFonts } from '../scripts/build-sw';
import { NUDGE_AFTER_LESSONS, NUDGE_AGAIN_MS, showInstallNudge } from '../src/lib/pwaState';
import { fonts } from '../src/theme';

const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf8'));

/** Width and height from a PNG header. */
function pngSize(file: string): string {
  const b = readFileSync(file);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

describe('web app manifest', () => {
  it('has what browsers need to offer an install', () => {
    for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'id']) assert.ok(manifest[key], key);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.lang, 'fa');
    assert.equal(manifest.dir, 'rtl');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
    assert.ok(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable'));
  });

  it('points at icons of the stated size and screenshots that exist', () => {
    for (const icon of manifest.icons) assert.equal(pngSize(join(PUBLIC, icon.src)), icon.sizes, icon.src);
    for (const shot of manifest.screenshots) assert.ok(existsSync(join(PUBLIC, shot.src)), shot.src);
  });

  it('has shortcuts to screens that exist', () => {
    const route: Record<string, string> = { '/': 'src/app/index.tsx', '/simulator': 'src/app/(tabs)/simulator.tsx', '/duel': 'src/app/duel/index.tsx' };
    for (const s of manifest.shortcuts) assert.ok(route[s.url] && existsSync(join(ROOT, route[s.url])), s.url);
  });

  it('is linked from the page, which also keeps an early install prompt', () => {
    const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
    assert.ok(html.includes('<link rel="manifest" href="/manifest.json" />'));
    assert.ok(html.includes('window.__chartoonInstall = e;'));
  });
});

describe('service worker build', () => {
  const theme = readFileSync(join(ROOT, 'src/theme/index.ts'), 'utf8');

  it('knows every font the app loads', () => {
    assert.deepEqual(usedFonts(theme).sort(), Object.values(fonts).sort());
  });

  it('saves the page, bundles, sounds and fonts in use, and skips the rest', () => {
    const files = [
      'index.html',
      'manifest.json',
      'logo192.png',
      'sw.js',
      'screenshots/lesson.webp',
      '_expo/static/js/web/entry-abc.js',
      'assets/assets/sounds/correct.1.wav',
      'assets/node_modules/@expo-google-fonts/vazirmatn/400Regular/Vazirmatn_400Regular.aa.ttf',
      'assets/node_modules/@expo-google-fonts/vazirmatn/100Thin/Vazirmatn_100Thin.bb.ttf',
      'assets/node_modules/expo-router/assets/error.cc.png',
    ];
    const list = precacheList(files, usedFonts(theme));
    assert.equal(list[0], '/');
    for (const url of ['/manifest.json', '/logo192.png', '/_expo/static/js/web/entry-abc.js', '/assets/assets/sounds/correct.1.wav', '/assets/node_modules/@expo-google-fonts/vazirmatn/400Regular/Vazirmatn_400Regular.aa.ttf']) {
      assert.ok(list.includes(url), url);
    }
    for (const url of ['/index.html', '/sw.js', '/screenshots/lesson.webp', '/assets/node_modules/@expo-google-fonts/vazirmatn/100Thin/Vazirmatn_100Thin.bb.ttf', '/assets/node_modules/expo-router/assets/error.cc.png']) {
      assert.ok(!list.includes(url), url);
    }
  });

  it('writes a worker whose version follows the files', () => {
    const dist = mkdtempSync(join(tmpdir(), 'chartoon-sw-'));
    try {
      const put = (f: string, body: string) => {
        mkdirSync(dirname(join(dist, f)), { recursive: true });
        writeFileSync(join(dist, f), body);
      };
      put('index.html', '<html></html>');
      put('manifest.json', '{}');
      put('_expo/static/js/web/entry-abc.js', 'one');
      const first = buildServiceWorker(dist, { theme });
      const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
      assert.ok(!sw.includes('__VERSION__') && !sw.includes('__PRECACHE__'));
      assert.ok(sw.includes(JSON.stringify(first.version)));
      new Script(sw); // compiles
      assert.equal(buildServiceWorker(dist, { theme }).version, first.version);
      put('_expo/static/js/web/entry-abc.js', 'two');
      assert.notEqual(buildServiceWorker(dist, { theme }).version, first.version);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe('install banner', () => {
  const base = { mode: 'prompt' as const, installed: false, dismissedAt: 0, now: NUDGE_AGAIN_MS * 3, lessons: NUDGE_AFTER_LESSONS };

  it('greets learners who keep coming back', () => {
    assert.equal(showInstallNudge(base), true);
    assert.equal(showInstallNudge({ ...base, mode: 'ios' }), true);
  });

  it('stays away when it can’t help or was just dismissed', () => {
    assert.equal(showInstallNudge({ ...base, mode: null }), false);
    assert.equal(showInstallNudge({ ...base, installed: true }), false);
    assert.equal(showInstallNudge({ ...base, lessons: NUDGE_AFTER_LESSONS - 1 }), false);
    assert.equal(showInstallNudge({ ...base, dismissedAt: base.now - 1000 }), false);
    assert.equal(showInstallNudge({ ...base, dismissedAt: base.now - NUDGE_AGAIN_MS }), true);
  });
});
