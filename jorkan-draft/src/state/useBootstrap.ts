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
    const params = new URLSearchParams(window.location.search);
    const wantsSimulator = import.meta.env.DEV && params.get('sim') === '1';
    /*
     * Two ways to reach the same draft. On a machine sitting in the ESPN
     * draft room the extension is the source; on the hosted page - opened on
     * a television or a phone, with nothing installed - the site's own server
     * reads ESPN instead. The build decides, and ?hosted=1 lets the hosted
     * path be tried from a development server.
     */
    /*
     * ?extension=1 turns the hosted page back into a page the Chrome
     * extension drives. It is the fallback for the one thing about draft
     * night that is not proven: ESPN's public feed has never been seen
     * carrying a draft as it happens, and the extension - reading the draft
     * room from inside a signed-in browser - has. It also brings the pick
     * clock, which the public feed does not have. Nothing changes for a
     * television opening the plain URL.
     */
    const wantsExtension = params.get('extension') === '1';
    const hosted =
      !wantsExtension && (import.meta.env.VITE_HOSTED === '1' || params.get('hosted') === '1');

    void (async () => {
      if (wantsSimulator) {
        await runtime.useSimulator();
        debugLog('note', 'attached draft simulator (?sim=1)');
      } else if (hosted) {
        await runtime.useHostedEspn();
        debugLog('note', 'attached hosted ESPN reader');
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
