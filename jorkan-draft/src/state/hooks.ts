import { useEffect, useState } from 'react';
import { getRuntime } from './DraftRuntime';
import { settingsStore } from './settingsStore';
import { useStore } from './store';

export function useRuntime() {
  return getRuntime();
}

export function useDraft() {
  return useStore(getRuntime().draft);
}

export function useSyncStatus() {
  return useStore(getRuntime().status);
}

export function useUi() {
  return useStore(getRuntime().ui);
}

export function useSettings() {
  return useStore(settingsStore);
}

/**
 * One shared ticking clock for every component that needs "now".
 * 10Hz is smooth for a countdown and costs nothing over five hours.
 */
let tickListeners = new Set<(now: number) => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function ensureTicker(): void {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    const now = Date.now();
    for (const listener of [...tickListeners]) listener(now);
  }, 100);
}

export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    ensureTicker();
    const listener = (value: number) => setNow(value);
    tickListeners.add(listener);
    return () => {
      tickListeners.delete(listener);
      if (tickListeners.size === 0 && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    };
  }, [active]);
  return now;
}
