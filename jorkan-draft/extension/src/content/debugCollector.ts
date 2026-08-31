import type { DebugEntry } from '@shared/protocol';
import { rowContainer, textAtoms, visibleText } from './dom';
import * as P from './patterns';

/**
 * Debug collector.
 *
 * When debug mode is on we capture just enough of the draft room to repair
 * the parser against a real ESPN page: the regions that mention the draft,
 * their stable attributes, and a truncated, sanitised slice of markup.
 *
 * It never collects credentials, cookies, storage, tokens or anything about
 * the user's browsing. Long opaque strings are redacted on the way out, and
 * every capture is capped in size.
 */

const MAX_HTML = 2400;
const MAX_REGIONS = 12;

/** Redact anything that looks like a token, key or session id. */
export function sanitize(text: string): string {
  return text
    .replace(/([?&](?:token|auth|key|sig|signature|session|swid|espn_s2)=)[^&\s"']+/gi, '$1[redacted]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted-long-string]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[redacted-uuid]');
}

function describe(el: Element): Record<string, unknown> {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    // Class names are generated noise; ids and data/aria attributes are the
    // things worth adapting selectors to.
    if (attr.name === 'class' || attr.name === 'style') continue;
    if (attr.value.length > 120) continue;
    attributes[attr.name] = sanitize(attr.value);
  }
  return {
    tag: el.tagName.toLowerCase(),
    attributes,
    text: sanitize(visibleText(el)).slice(0, 240),
    html: sanitize(el.outerHTML ?? '').slice(0, MAX_HTML),
  };
}

/** Regions of the page that mention anything draft-related. */
export function collectRegions(): DebugEntry[] {
  const atoms = textAtoms(document, 160);
  const interesting = new Set<Element>();

  const probes: [string, RegExp][] = [
    ['on-the-clock', P.ON_THE_CLOCK],
    ['on-deck', P.ON_DECK],
    ['round', P.ROUND],
    ['pick', P.PICK_IN_ROUND],
    ['clock', P.CLOCK],
    ['complete', P.DRAFT_COMPLETE],
    ['waiting', P.DRAFT_NOT_STARTED],
    ['paused', P.DRAFT_PAUSED],
  ];

  const entries: DebugEntry[] = [];
  for (const [label, pattern] of probes) {
    for (const atom of atoms) {
      if (!pattern.test(atom.text)) continue;
      const container = rowContainer(atom.el, 3);
      if (interesting.has(container)) continue;
      interesting.add(container);
      entries.push({
        at: Date.now(),
        kind: 'dom-sample',
        message: `region:${label}`,
        data: describe(container),
      });
      if (interesting.size >= MAX_REGIONS) return entries;
      break;
    }
  }

  // A couple of player rows, which is what the pick parser reads.
  const playerNodes = Array.from(
    document.querySelectorAll('a[href*="/player/_/id/"], [data-player-id]'),
  ).slice(0, 4);
  for (const node of playerNodes) {
    const container = rowContainer(node, 5);
    if (interesting.has(container)) continue;
    interesting.add(container);
    entries.push({
      at: Date.now(),
      kind: 'dom-sample',
      message: 'region:player-row',
      data: describe(container),
    });
  }

  return entries;
}

/** A one-line summary of the page, cheap enough to log every parse. */
export function pageSummary(): Record<string, unknown> {
  return {
    url: sanitize(location.href),
    title: sanitize(document.title).slice(0, 120),
    playerLinks: document.querySelectorAll('a[href*="/player/_/id/"]').length,
    ariaLive: document.querySelectorAll('[aria-live]').length,
    tables: document.querySelectorAll('table, [role="table"], [role="grid"]').length,
  };
}
