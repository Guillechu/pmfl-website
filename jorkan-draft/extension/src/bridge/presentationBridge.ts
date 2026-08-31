import type { BackgroundToPage, PageEnvelope, PageToBackground } from '@shared/protocol';
import { PAGE_CHANNEL, PAGE_READY_ATTRIBUTE, PROTOCOL_VERSION, isPageEnvelope } from '@shared/protocol';

/**
 * Presentation bridge.
 *
 * Chrome will not accept "localhost" in externally_connectable, so the page
 * and the extension cannot talk directly. This content script is the join: it
 * holds a port to the background worker and relays messages to and from the
 * page with window.postMessage.
 *
 * It stays completely inert on any localhost page that is not the Jorkan
 * presentation, and it only ever relays our own protocol.
 */

let port: chrome.runtime.Port | null = null;
let reconnectDelay = 400;
let attached = false;

function isPresentationPage(): boolean {
  return document.querySelector(`[${PAGE_READY_ATTRIBUTE}]`) !== null;
}

function toPage(payload: BackgroundToPage): void {
  const envelope: PageEnvelope<BackgroundToPage> = {
    channel: PAGE_CHANNEL,
    direction: 'to-page',
    protocolVersion: PROTOCOL_VERSION,
    payload,
  };
  window.postMessage(envelope, window.location.origin);
}

function connect(): void {
  try {
    port = chrome.runtime.connect({ name: 'page' });
  } catch {
    scheduleReconnect();
    return;
  }
  reconnectDelay = 400;

  port.onMessage.addListener((message: BackgroundToPage) => toPage(message));
  port.onDisconnect.addListener(() => {
    port = null;
    toPage({ kind: 'BRIDGE_ERROR', at: Date.now(), message: 'extension disconnected' });
    scheduleReconnect();
  });

  send({ kind: 'PAGE_HELLO', at: Date.now(), protocolVersion: PROTOCOL_VERSION });
}

function scheduleReconnect(): void {
  setTimeout(() => {
    if (!port && isPresentationPage()) connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 6000);
}

function send(message: PageToBackground): void {
  if (!port) {
    connect();
    return;
  }
  try {
    port.postMessage(message);
  } catch {
    port = null;
    scheduleReconnect();
  }
}

window.addEventListener('message', (event) => {
  // Only our own page, only our own envelope shape.
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  if (!isPageEnvelope(event.data) || event.data.direction !== 'to-extension') return;
  send(event.data.payload as PageToBackground);
});

function attach(): void {
  if (attached) return;
  if (!isPresentationPage()) return;
  attached = true;
  connect();
}

// The React app stamps the marker attribute on its first render, so watch for
// it rather than guessing how long the page takes to boot.
attach();
if (!attached) {
  const observer = new MutationObserver(() => {
    attach();
    if (attached) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  // Stop watching if this clearly is not the presentation.
  setTimeout(() => observer.disconnect(), 20_000);
}
