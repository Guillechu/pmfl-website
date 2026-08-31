import { useEffect } from 'react';
import { SimulatorProvider } from '@/providers/SimulatorProvider';
import { debugLog } from '@/debug/logger';
import { getDirector } from '@/audio/Director';
import { getRuntime } from './DraftRuntime';

let bootstrapped = false;

/**
 * Attach a draft source exactly once per page load.
 *
 * ESPN via the Chrome extension is the real source; the simulator stands in
 * while the extension is not present so the presentation can be developed and
 * rehearsed.
 */
export function useBootstrap(): void {
  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;

    const runtime = getRuntime();
    void (async () => {
      const provider = new SimulatorProvider();
      await runtime.attach(provider);
      debugLog('note', 'attached simulator provider');

      if (import.meta.env.DEV) {
        // Development handle for driving the simulator from the console or
        // from automated screenshot runs. Never present in a production build.
        (window as unknown as { __jorkan?: unknown }).__jorkan = {
          runtime,
          provider,
          director: () => getDirector(runtime),
        };
      }
    })();
  }, []);
}
