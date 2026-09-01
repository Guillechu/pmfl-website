import type { DebugEntry } from '@shared/protocol';
import { compactAtoms, rowContainer, textAtoms, visibleText } from './dom';
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

/* ------------------------------------------------------------------ *
 * Targeted diagnostics
 *
 * When a field cannot be read, the useful question is not "what does the
 * page look like" but "what did you consider, and why did you reject it".
 * These capture exactly that for the two fields that a real 2026 draft room
 * did not give up: the pick clock and the picks themselves.
 * ------------------------------------------------------------------ */

/** Anything that looks like a countdown, with enough context to judge it. */
export function collectClockCandidates(): DebugEntry[] {
  const out: DebugEntry[] = [];
  // Both readings of the page. ESPN's own clock only ever shows up in the
  // compact one - it is split across sibling elements - and a capture that
  // missed it is exactly how the clock went unread for a whole draft.
  for (const atom of [...compactAtoms(document, 12), ...textAtoms(document, 40)]) {
    if (!/\d{1,2}\s*:\s*[0-5]\d/.test(atom.text)) continue;
    out.push({
      at: Date.now(),
      kind: 'dom-sample',
      message: 'candidate:clock',
      data: {
        text: sanitize(atom.text),
        ...describeBriefly(atom.el),
        parent: describeBriefly(atom.el.parentElement),
        grandparent: describeBriefly(atom.el.parentElement?.parentElement ?? null),
      },
    });
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Rows that look like a selection: a position and NFL club together are the
 * strongest tell, since every drafted player is rendered with both.
 */
export function collectPickCandidates(): DebugEntry[] {
  const out: DebugEntry[] = [];
  const seen = new Set<Element>();
  // Case-insensitive on the club: ESPN renders "Cin" and "SF" in different
  // views, and demanding upper case hid every title-cased row.
  const POS_TEAM = /\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b[\s,|/-]*\b([A-Za-z]{2,4})\b|\b([A-Za-z]{2,4})\b[\s,|/-]*\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b/i;
  for (const atom of textAtoms(document, 120)) {
    if (!POS_TEAM.test(atom.text)) continue;
    const row = rowContainer(atom.el, 4);
    if (seen.has(row)) continue;
    seen.add(row);
    out.push({
      at: Date.now(),
      kind: 'dom-sample',
      message: 'candidate:pick-row',
      data: {
        matchedText: sanitize(atom.text),
        rowText: sanitize(visibleText(row)).slice(0, 240),
        ...describeBriefly(row),
        html: sanitize(row.outerHTML ?? '').slice(0, 1800),
      },
    });
    if (out.length >= 8) break;
  }
  return out;
}

/**
 * A shallow map of the page: enough structure to see where the draft board,
 * the history feed and the clock actually live.
 */
export function collectOutline(maxDepth = 9, budget = 90): DebugEntry[] {
  const out: DebugEntry[] = [];
  const walk = (el: Element, depth: number): void => {
    if (depth > maxDepth || out.length >= budget) return;
    for (const child of Array.from(el.children)) {
      const text = visibleText(child);
      if (!text) continue;
      out.push({
        at: Date.now(),
        kind: 'dom-sample',
        message: `outline:d${depth}`,
        data: {
          ...describeBriefly(child),
          childCount: child.children.length,
          text: sanitize(text).slice(0, 160),
        },
      });
      walk(child, depth + 1);
    }
  };
  if (document.body) walk(document.body, 0);
  return out;
}

/**
 * ESPN's draft-results view, wherever it lives.
 *
 * A real capture found the round filter ("All Rounds / Round 1 / Round 2")
 * present in the page while not a single completed pick was rendered
 * anywhere, which is what sent us to ESPN's own feed for the board. Capturing
 * the panel around that filter is how we would find out if the picks are in
 * the DOM after all - and where.
 */
export function collectDraftResultsPanel(): DebugEntry[] {
  const out: DebugEntry[] = [];
  const selects = Array.from(document.querySelectorAll('select'));
  for (const select of selects) {
    const options = Array.from(select.options).map((option) => option.text.trim());
    if (!options.some((text) => /^round\s*\d+$/i.test(text))) continue;
    let panel: Element = select;
    for (let hop = 0; hop < 5 && panel.parentElement; hop += 1) panel = panel.parentElement;
    out.push({
      at: Date.now(),
      kind: 'dom-sample',
      message: 'region:draft-results',
      data: {
        options: options.slice(0, 20),
        ...describeBriefly(panel),
        text: sanitize(visibleText(panel)).slice(0, 600),
        html: sanitize(panel.outerHTML ?? '').slice(0, 6000),
      },
    });
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * Every rendered player headshot, with the row around it.
 *
 * A completed pick has to show the player somewhere, and ESPN identifies its
 * players by the numeric id in the headshot URL. Whatever markup a pick row
 * turns out to have, it will contain one of these.
 */
export function collectHeadshotRows(): DebugEntry[] {
  const out: DebugEntry[] = [];
  const seen = new Set<Element>();
  const images = Array.from(
    document.querySelectorAll('img[src*="headshots/nfl/players"], img[data-src*="headshots/nfl/players"]'),
  );
  for (const image of images) {
    const row = rowContainer(image, 5);
    if (seen.has(row)) continue;
    seen.add(row);
    out.push({
      at: Date.now(),
      kind: 'dom-sample',
      message: 'region:headshot-row',
      data: {
        ...describeBriefly(row),
        text: sanitize(visibleText(row)).slice(0, 240),
        html: sanitize(row.outerHTML ?? '').slice(0, 1800),
      },
    });
    if (out.length >= 6) break;
  }
  return out;
}

/** Tag, id and the attributes worth writing a selector against. */
function describeBriefly(el: Element | null): Record<string, unknown> {
  if (!el) return { tag: null };
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'class' || attr.name === 'style') continue;
    if (attr.value.length > 120) continue;
    attributes[attr.name] = sanitize(attr.value);
  }
  return { tag: el.tagName.toLowerCase(), attributes };
}

/** Everything the next capture should contain, in one call. */
export function collectDiagnostics(): DebugEntry[] {
  return [
    ...collectRegions(),
    ...collectClockCandidates(),
    ...collectPickCandidates(),
    ...collectDraftResultsPanel(),
    ...collectHeadshotRows(),
    ...collectOutline(),
  ];
}
