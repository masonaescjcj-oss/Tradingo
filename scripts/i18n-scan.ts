/**
 * Lists Persian text in the app's code that isn't passed through t() (src/i18n), so it would
 * stay Persian in English. A line can opt out with an `i18n-ignore` comment (data such as
 * Persian digits or words the chat filter looks for).
 *
 *   npx tsx scripts/i18n-scan.ts [folder…]    default: src/app src/components src/lib
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const folders = process.argv.slice(2).length ? process.argv.slice(2) : ['src/app', 'src/components', 'src/lib'];
const PERSIAN = /[؀-ۿ]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|ts)$/.test(f) ? [p] : [];
  });
}

let count = 0;
for (const folder of folders) {
  for (const file of files(resolve(root, folder))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!PERSIAN.test(line) || line.includes('i18n-ignore')) return;
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (!PERSIAN.test(code)) return;
      // Every Persian run on the line must sit inside a t('…') / t(`…`) call.
      const stripped = code.replace(/\bt\(\s*(['"`])(?:\\.|(?!\1).)*\1/g, '');
      if (PERSIAN.test(stripped)) {
        count += 1;
        console.log(`${relative(root, file)}:${i + 1}: ${line.trim().slice(0, 140)}`);
      }
    });
  }
}
console.log(`${count} line(s) with Persian outside t()`);
process.exit(count ? 1 : 0);
