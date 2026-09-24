/**
 * Installing the web app and keeping it up to date. Native builds come from the stores, so
 * everything here does nothing; the web version is in pwa.web.ts.
 */
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export function startPwa(): void {}

export async function promptInstall(): Promise<InstallOutcome> {
  return 'unavailable';
}

export function applyUpdate(): void {}
