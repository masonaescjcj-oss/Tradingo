/**
 * Writes dist/sw.js after `expo export`: the service worker template with this release's
 * version and the list of files the installed app needs to open offline.
 *
 *   npm run build:web              # export, then this
 *   npx tsx scripts/build-sw.ts [dist]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(__dirname, '..');

/** Small files next to index.html that the app shell uses. */
const SHELL_FILES = ['manifest.json', 'favicon.ico', 'logo192.png', 'logo512.png', 'maskable-192.png', 'maskable-512.png', 'apple-touch-icon.png'];

/** Font names the app loads (src/theme), e.g. Vazirmatn_700Bold. The export also holds weights it never uses. */
export function usedFonts(themeSource: string): string[] {
  const block = /export const fonts = \{([\s\S]*?)\}/.exec(themeSource)?.[1] ?? '';
  return [...block.matchAll(/'([A-Za-z]+_\w+)'/g)].map((m) => m[1]);
}

function walk(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, root) : [relative(root, path).split(sep).join('/')];
  });
}

/** URLs to save at install: the page as `/`, the bundles, the app's own assets and the fonts in use. */
export function precacheList(files: string[], fonts: string[]): string[] {
  const wanted = (f: string) =>
    f.startsWith('_expo/static/') ||
    f.startsWith('assets/assets/') ||
    SHELL_FILES.includes(f) ||
    (f.endsWith('.ttf') && fonts.some((name) => basename(f).startsWith(`${name}.`)));
  return ['/', ...files.filter(wanted).map((f) => `/${f}`).sort()];
}

export function buildServiceWorker(dist: string, opts: { theme?: string; template?: string } = {}) {
  const theme = opts.theme ?? readFileSync(join(ROOT, 'src/theme/index.ts'), 'utf8');
  const template = opts.template ?? readFileSync(join(ROOT, 'scripts/sw.template.js'), 'utf8');
  if (!statSync(join(dist, 'index.html'), { throwIfNoEntry: false })) throw new Error(`${dist} has no index.html; run expo export first`);
  const list = precacheList(walk(dist), usedFonts(theme));
  // The version changes whenever any saved file does, so browsers pick up every release.
  const hash = createHash('sha256');
  for (const url of list) {
    hash.update(url);
    hash.update(readFileSync(join(dist, url === '/' ? 'index.html' : url.slice(1))));
  }
  const version = hash.digest('hex').slice(0, 12);
  const sw = template.replace("'__VERSION__'", JSON.stringify(version)).replace('__PRECACHE__', JSON.stringify(list, null, 2));
  writeFileSync(join(dist, 'sw.js'), sw);
  return { version, list };
}

if (require.main === module) {
  const dist = resolve(process.argv[2] ?? join(ROOT, 'dist'));
  const { version, list } = buildServiceWorker(dist);
  const bytes = list.reduce((n, url) => n + statSync(join(dist, url === '/' ? 'index.html' : url.slice(1))).size, 0);
  console.log(`sw.js ${version}: ${list.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB saved for offline use`);
}
