import type { BridgeState } from '@shared/protocol';

/** Small status panel: is the bridge seeing ESPN, and is the TV connected. */

interface PopupState {
  state: BridgeState;
  pickCount: number;
  espnFrames: number;
  presentationTabs: number;
  debugEntries: number;
}

const stats = document.getElementById('stats') as HTMLDListElement;
const debugButton = document.getElementById('debug') as HTMLButtonElement;
const exportButton = document.getElementById('export') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;

function row(label: string, value: string, tone?: 'ok' | 'bad' | 'warn'): void {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  if (tone) dd.className = tone;
  stats.append(dt, dd);
}

function render(data: PopupState): void {
  stats.textContent = '';
  const { state } = data;
  row('ESPN draft room', data.espnFrames > 0 ? 'connected' : 'not open', data.espnFrames > 0 ? 'ok' : 'bad');
  row('Observer', state.observerActive ? 'watching' : 'idle', state.observerActive ? 'ok' : 'warn');
  row('Presentation', data.presentationTabs > 0 ? 'connected' : 'not open', data.presentationTabs > 0 ? 'ok' : 'warn');
  row('League', state.leagueId ?? '--');
  row('Draft phase', state.phase);
  row('Picks mirrored', String(data.pickCount));
  // Where the board is actually coming from. "ESPN feed" is the one that
  // matters: it is the only source that has every completed pick.
  const board = state.meta?.strategies['picks'];
  row(
    'Board source',
    board === 'espn-api' ? 'ESPN draft feed' : (board ?? 'no picks yet'),
    board === 'espn-api' ? 'ok' : 'warn',
  );
  // Exactly what ESPN's feed said, so a screenshot of this panel is a
  // diagnosis rather than the start of one.
  const feed = state.meta?.feed;
  if (feed) {
    row(
      'Feed picks',
      feed.error ? 'failed' : String(feed.picks),
      feed.error ? 'bad' : feed.picks > 0 ? 'ok' : 'warn',
    );
    if (feed.unnamed > 0) row('Feed unnamed', String(feed.unnamed), 'warn');
    if (feed.error) row('Feed error', feed.error.length > 46 ? `${feed.error.slice(0, 43)}...` : feed.error, 'bad');
  }
  row('Parser', state.meta?.parserVersion ?? '--');
  row(
    'Confidence',
    state.meta ? `${Math.round(state.meta.confidence * 100)}%` : '--',
    state.meta && state.meta.confidence >= 0.6 ? 'ok' : 'warn',
  );
  row('Extension', state.extensionVersion);
  const warning = state.meta?.warnings[0];
  if (warning) row('Warning', warning.length > 48 ? `${warning.slice(0, 45)}...` : warning, 'warn');
  debugButton.textContent = state.debugMode
    ? `Disable debug capture (${data.debugEntries})`
    : 'Enable debug capture';
  debugButton.dataset['enabled'] = String(state.debugMode);
}

async function refresh(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({ kind: 'POPUP_STATE' })) as PopupState | undefined;
  if (response?.state) render(response);
}

debugButton.addEventListener('click', async () => {
  const enabled = debugButton.dataset['enabled'] !== 'true';
  await chrome.runtime.sendMessage({ kind: 'POPUP_SET_DEBUG', enabled });
  await refresh();
});

exportButton.addEventListener('click', async () => {
  const response = (await chrome.runtime.sendMessage({ kind: 'POPUP_EXPORT' })) as
    | { entries: unknown[]; state: BridgeState }
    | undefined;
  if (!response) return;
  const blob = new Blob(
    [JSON.stringify({ exportedAt: new Date().toISOString(), ...response }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `jorkan-espn-debug-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

resetButton.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ kind: 'POPUP_RESET' });
  await refresh();
});

void refresh();
setInterval(() => void refresh(), 1500);
