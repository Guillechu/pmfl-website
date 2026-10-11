import type {
  BackgroundToPage,
  BridgeState,
  DebugEntry,
  PageEnvelope,
  PageToBackground,
} from '@shared/protocol';
import { PAGE_CHANNEL, PROTOCOL_VERSION, isPageEnvelope } from '@shared/protocol';

/**
 * Page side of the extension bridge.
 *
 * Talks to the content script the extension injects into this page, which in
 * turn holds a port to the background worker. If the extension is not
 * installed nothing answers and the bridge simply reports itself unavailable -
 * the presentation still runs, it just has no ESPN feed.
 */

export type BridgeListener = (message: BackgroundToPage) => void;

export class ExtensionBridge {
  private listeners = new Set<BridgeListener>();
  private started = false;
  private connected = false;
  private lastState: BridgeState | null = null;
  private helloTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('message', this.onWindowMessage);
    this.hello();
    // The extension may be installed, reloaded or enabled at any point during
    // the night, so keep saying hello until something answers.
    this.helloTimer = setInterval(() => {
      if (!this.connected) this.hello();
    }, 2000);
  }

  stop(): void {
    window.removeEventListener('message', this.onWindowMessage);
    if (this.helloTimer) clearInterval(this.helloTimer);
    this.helloTimer = null;
    this.listeners.clear();
    this.started = false;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getState(): BridgeState | null {
    return this.lastState;
  }

  subscribe(listener: BridgeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  hello(): void {
    this.send({ kind: 'PAGE_HELLO', at: Date.now(), protocolVersion: PROTOCOL_VERSION });
  }

  requestState(): void {
    this.send({ kind: 'PAGE_REQUEST_STATE', at: Date.now() });
  }

  requestResync(): void {
    this.send({ kind: 'PAGE_REQUEST_RESYNC', at: Date.now() });
  }

  setDebug(enabled: boolean): void {
    this.send({ kind: 'PAGE_SET_DEBUG', at: Date.now(), enabled });
  }

  exportDebug(): void {
    this.send({ kind: 'PAGE_EXPORT_DEBUG', at: Date.now() });
  }

  private send(payload: PageToBackground): void {
    const envelope: PageEnvelope<PageToBackground> = {
      channel: PAGE_CHANNEL,
      direction: 'to-extension',
      protocolVersion: PROTOCOL_VERSION,
      payload,
    };
    window.postMessage(envelope, window.location.origin);
  }

  private onWindowMessage = (event: MessageEvent): void => {
    if (event.source !== window) return;
    if (!isPageEnvelope(event.data) || event.data.direction !== 'to-page') return;
    const payload = event.data.payload as BackgroundToPage;

    if (payload.kind === 'STATE_SYNC') {
      this.connected = true;
      this.lastState = payload.state;
    }
    if (payload.kind === 'BRIDGE_ERROR' && payload.message === 'extension disconnected') {
      this.connected = false;
    }

    for (const listener of [...this.listeners]) {
      try {
        listener(payload);
      } catch (error) {
        console.error('[bridge] listener failed', error);
      }
    }
  };
}

export type { BridgeState, DebugEntry };
export const extensionBridge = new ExtensionBridge();
