import { CARD_FONTS, CARD_H, CARD_W, cardSvg, type ShareCard } from './shareCard';

export type ShareOutcome = 'shared' | 'saved' | 'copied' | 'cancelled' | 'failed';

/** Browsers draw the card's SVG onto a canvas and share or save it as a PNG. */
export const canMakeImage = true;

const fontCache = new Map<string, string>();

/** The address of a loaded font, from the @font-face rules expo-font adds to the page. */
function fontUrl(family: string): string | null {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim() !== family) continue;
      const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(rule.style.getPropertyValue('src'));
      if (m) return m[1];
    }
  }
  return null;
}

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:font/ttf;base64,${btoa(bin)}`;
}

/** @font-face rules with the fonts inlined, since a picture can't load fonts from the page. */
async function embeddedFonts(): Promise<string> {
  const rules = await Promise.all(
    CARD_FONTS.map(async (family) => {
      if (!fontCache.has(family)) {
        const url = fontUrl(family);
        if (!url) return '';
        try {
          fontCache.set(family, await toDataUrl(url));
        } catch {
          return '';
        }
      }
      return `@font-face{font-family:${family};src:url(${fontCache.get(family)});}`;
    }),
  );
  return rules.join('');
}

async function cardBlob(card: ShareCard): Promise<Blob> {
  const svg = cardSvg(card, await embeddedFonts());
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Give the embedded fonts a moment before drawing.
    await new Promise((r) => setTimeout(r, 80));
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const blobs = new WeakMap<ShareCard, Promise<Blob>>();

/** The card's PNG, made once per card and reused for the preview, sharing and saving. */
function pngFor(card: ShareCard): Promise<Blob> {
  let p = blobs.get(card);
  if (!p) {
    p = cardBlob(card);
    blobs.set(card, p);
    p.catch(() => blobs.delete(card));
  }
  return p;
}

/** An address the preview can show; the caller revokes it when done. */
export async function cardImageUrl(card: ShareCard): Promise<string | null> {
  try {
    return URL.createObjectURL(await pngFor(card));
  } catch {
    return null;
  }
}

const fileName = (card: ShareCard) => `chartoon-${card.kind}.png`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareCard(card: ShareCard): Promise<ShareOutcome> {
  let blob: Blob | null = null;
  try {
    blob = await pngFor(card);
  } catch {
    blob = null;
  }
  if (blob) {
    const file = new File([blob], fileName(card), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: card.text });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled';
      }
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ text: card.text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  // Desktop browsers without a share menu: save the picture and copy the message.
  if (blob) {
    download(blob, fileName(card));
    await copyText(card.text);
    return 'saved';
  }
  return (await copyText(card.text)) ? 'copied' : 'failed';
}

export async function saveCard(card: ShareCard): Promise<ShareOutcome> {
  try {
    download(await pngFor(card), fileName(card));
    return 'saved';
  } catch {
    return 'failed';
  }
}

/** Shares a message with a link, e.g. a duel invite; without a share menu it copies them. */
export async function shareText(text: string, url: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'failed';
}
