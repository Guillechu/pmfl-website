import type { DebugEntry } from '@shared/protocol';

/**
 * In-page debug log.
 *
 * A bounded ring buffer so a five-hour draft cannot grow it without limit.
 * Deliberately carries no credentials, cookies or tokens - only draft state
 * and sanitised DOM fragments useful for repairing the ESPN parser.
 */
const LIMIT = 800;
const entries: DebugEntry[] = [];
const listeners = new Set<() => void>();
let enabled = true;

export function setDebugEnabled(value: boolean): void {
  enabled = value;
}

export function isDebugEnabled(): boolean {
  return enabled;
}

export function debugLog(kind: DebugEntry['kind'], message: string, data?: unknown): void {
  if (!enabled) return;
  entries.push({ at: Date.now(), kind, message, ...(data !== undefined ? { data } : {}) });
  if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT);
  for (const listener of [...listeners]) listener();
}

export function debugEntries(): readonly DebugEntry[] {
  return entries;
}

export function subscribeDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDebug(): void {
  entries.length = 0;
  for (const listener of [...listeners]) listener();
}

/** Merge entries collected by the extension into the page's log. */
export function ingestDebug(incoming: readonly DebugEntry[]): void {
  for (const entry of incoming) entries.push(entry);
  entries.sort((a, b) => a.at - b.at);
  if (entries.length > LIMIT) entries.splice(0, entries.length - LIMIT);
  for (const listener of [...listeners]) listener();
}

export function exportDebugJson(extra: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      ...extra,
      entries,
    },
    null,
    2,
  );
}

export function downloadDebugJson(extra: Record<string, unknown> = {}): void {
  const blob = new Blob([exportDebugJson(extra)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `jorkan-draft-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
