import { usePwa, type InstallMode } from './pwaState';

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type EarlyWindow = Window & { __chartoonInstall?: InstallPromptEvent | null };

let deferred: InstallPromptEvent | null = null;
let waiting: ServiceWorker | null = null;
let updating = false;
let started = false;

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isPhone = () => /android|mobile/i.test(navigator.userAgent);

/** Without the browser's prompt: Safari's share sheet on iOS, the browser menu on other phones. */
const fallbackMode = (): InstallMode => (isIos() ? 'ios' : isPhone() ? 'manual' : null);

function keepPrompt(e: InstallPromptEvent) {
  deferred = e;
  usePwa.setState({ mode: 'prompt' });
}

/** Wires up install and updates once, when the app starts. */
export function startPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  const installed = isStandalone();
  usePwa.setState({ installed, mode: installed ? null : fallbackMode() });

  // public/index.html catches the prompt if it fires before the app has loaded.
  const early = (window as EarlyWindow).__chartoonInstall;
  if (early && !installed) keepPrompt(early);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    keepPrompt(e as InstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    usePwa.setState({ installed: true, mode: null });
  });

  if (!__DEV__ && 'serviceWorker' in navigator) void registerWorker();
}

async function registerWorker() {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload for an update the learner asked for, not the first install.
    if (updating) window.location.reload();
  });
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const check = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waiting = worker;
          usePwa.setState({ updateReady: true });
        }
      };
      worker.addEventListener('statechange', check);
      check();
    };
    watch(reg.waiting);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    // An installed app can stay open for days: look for a new release when it comes back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
    });
  } catch {
    // No offline support in this browser; the app works the same online.
  }
}

/** Shows the browser's install dialog, when it offered one. */
export async function promptInstall(): Promise<InstallOutcome> {
  const e = deferred;
  if (!e) return 'unavailable';
  deferred = null;
  (window as EarlyWindow).__chartoonInstall = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  // The prompt can be used once; after a "no" the browser may offer it again later.
  usePwa.setState({ mode: outcome === 'accepted' ? null : fallbackMode() });
  return outcome;
}

/** Switches to the downloaded release and reloads. */
export function applyUpdate(): void {
  if (!waiting) return;
  updating = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
