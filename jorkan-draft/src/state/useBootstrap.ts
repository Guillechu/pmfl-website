import { useEffect } from 'react';
import { EspnDraftProvider } from '@/providers/EspnDraftProvider';
import { debugLog } from '@/debug/logger';
import { getDirector } from '@/audio/Director';
import { getRuntime } from './DraftRuntime';

let bootstrapped = false;

/**
 * Attach a draft source exactly once per page load.
 *
 * ESPN through the Chrome extension is the default and stays the default:
 * on draft night nothing must be able to quietly swap the real feed for a
 * simulation. The simulator is opt-in - add ?sim=1 to the URL, or attach it
 * from the operator panel.
 */
export function useBootstrap(): void {
  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;

    const runtime = getRuntime();
    const wantsSimulator =
      import.meta.env.DEV && new URLSearchParams(window.location.search).get('sim') === '1';

    void (async () => {
      if (wantsSimulator) {
        await runtime.useSimulator();
        debugLog('note', 'attached draft simulator (?sim=1)');
      } else {
        await runtime.useEspn();
        debugLog('note', 'attached ESPN provider; waiting for the extension bridge');
      }

      if (import.meta.env.DEV) {
        // Development handle for driving the app from the console or from
        // automated screenshot runs. Never present in a production build.
        (window as unknown as { __jorkan?: unknown }).__jorkan = {
          runtime,
          get provider() {
            return runtime.getSimulator();
          },
          director: () => getDirector(runtime),
        };
      }
    })();
  }, []);
}
