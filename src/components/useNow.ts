import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `everyMs` while `active` (and right away whenever
 * `key` changes, e.g. when a boost is bought).
 */
export function useNow(active: boolean, everyMs: number, key?: unknown): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, everyMs, key]);
  return now;
}
