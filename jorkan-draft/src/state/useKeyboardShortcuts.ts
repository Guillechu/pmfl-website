import { useEffect } from 'react';
import { getRuntime } from './DraftRuntime';

/** Operator keys. Nothing here can touch ESPN or change the draft. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const runtime = getRuntime();

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        runtime.toggle('showDebug');
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case '1':
          runtime.setView('live');
          break;
        case '2':
          runtime.setView('board');
          break;
        case '3':
          runtime.setView('rosters');
          break;
        case 'f':
          void toggleFullscreen();
          break;
        case 'm':
          runtime.toggle('showMixer');
          break;
        case 'c':
          runtime.toggle('showChecklist');
          break;
        case 's':
          runtime.toggle('showSimulator');
          break;
        case 'escape':
          runtime.clearReveal();
          break;
        default:
          break;
      }
    };

    const onFullscreenChange = () => {
      getRuntime().setFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Fullscreen can be refused (no user gesture); never crash the broadcast.
  }
}
