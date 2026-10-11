/**
 * Audio URL helpers.
 *
 * Dropbox share links point at a preview page, not the file. `dl=0` has to
 * become a direct-delivery URL before an <audio> element can play it, and the
 * exact form Dropbox honours has changed over the years - so we produce an
 * ordered list of candidates and let the player fall through them.
 */
export function directAudioCandidates(rawUrl: string): string[] {
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];

  let url: URL;
  try {
    url = new URL(trimmed, window.location.origin);
  } catch {
    return [trimmed];
  }

  if (!/(^|\.)dropbox\.com$/.test(url.hostname) && !url.hostname.endsWith('dropboxusercontent.com')) {
    return [url.toString()];
  }

  const candidates: string[] = [];

  // 1. Direct content host with dl=1 - the form that streams reliably today.
  const direct = new URL(url.toString());
  direct.hostname = 'dl.dropboxusercontent.com';
  direct.searchParams.set('dl', '1');
  candidates.push(direct.toString());

  // 2. Share host with raw=1, which 302s to the content host.
  const raw = new URL(url.toString());
  raw.hostname = 'www.dropbox.com';
  raw.searchParams.delete('dl');
  raw.searchParams.set('raw', '1');
  candidates.push(raw.toString());

  // 3. Share host with dl=1.
  const forced = new URL(url.toString());
  forced.hostname = 'www.dropbox.com';
  forced.searchParams.set('dl', '1');
  candidates.push(forced.toString());

  return [...new Set(candidates)];
}
