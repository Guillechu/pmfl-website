import type { BackgroundToPage, PageEnvelope, PageToBackground } from '@shared/protocol';
import {
  HOSTED_PRESENTATION_ORIGINS,
  PAGE_CHANNEL,
  PAGE_READY_ATTRIBUTE,
  PRESENTATION_PORT,
  PROTOCOL_VERSION,
  isPageEnvelope,
} from '@shared/protocol';

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

/**
 * Is this page really the presentation?
 *
 * The manifest matches loopback and the hosted presentation. A match pattern
 * cannot name a port, so on loopback this script lands in every page served
 * from there, including any other project's dev server - the port is the
 * boundary that actually holds. The hosted origins need no such test: the
 * match pattern names the host itself. The marker attribute is never evidence
 * on its own, since any page can set it on itself. Both are re-checked before
 * every message we relay.
 */
function isPresentationPage(): boolean {
  // The hosted presentation is named exactly by a match pattern, so its host
  // is already the boundary and it has no port to check. Loopback is not:
  // any project's dev server is served from there, and the port is the only
  // thing that separates them.
  const named = HOSTED_PRESENTATION_ORIGINS.includes(window.location.origin);
  if (!named && window.location.port !== PRESENTATION_PORT) return false;
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
  // Re-checked per message: a page could have added the marker after we
  // attached, and nothing else stops it speaking the protocol.
  if (!isPresentationPage()) return;
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
