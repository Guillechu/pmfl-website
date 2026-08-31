/**
 * DOM helpers for the ESPN draft room.
 *
 * ESPN ships a minified React app: class names are generated and change
 * between deploys, so nothing here keys on them. We work from text, ARIA
 * labels, data attributes and ESPN's own URL shapes, all of which have been
 * stable for years because ESPN's own links and screen-reader support depend
 * on them.
 */

/** How many elements a single scan will look at. Keeps the ESPN tab smooth. */
const MAX_NODES = 6000;

export interface TextAtom {
  el: Element;
  text: string;
}

function isHidden(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
  const rect = el.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0;
}

/**
 * Leaf-ish elements with short visible text: the atoms a human reads off the
 * screen. Everything text-based is matched against these rather than against
 * whole-page textContent, which would match a hundred parents at once.
 */
export function textAtoms(root: ParentNode = document, maxLength = 120): TextAtom[] {
  const atoms: TextAtom[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_ELEMENT);
  let seen = 0;
  let node = walker.nextNode();
  while (node && seen < MAX_NODES) {
    seen += 1;
    const el = node as Element;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'SVG') {
      node = walker.nextSibling() ?? walker.nextNode();
      continue;
    }
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text && text.length <= maxLength) {
      // Prefer the innermost element carrying this exact text.
      const childWithSameText = Array.from(el.children).some(
        (child) => (child.textContent ?? '').replace(/\s+/g, ' ').trim() === text,
      );
      if (!childWithSameText) atoms.push({ el, text });
    }
    node = walker.nextNode();
  }
  return atoms;
}

/** Nearest ancestor that looks like a self-contained row/card. */
export function rowContainer(el: Element, maxHops = 6): Element {
  let current: Element = el;
  for (let i = 0; i < maxHops; i += 1) {
    const parent = current.parentElement;
    if (!parent) break;
    const text = (parent.textContent ?? '').trim();
    if (text.length > 240) break;
    current = parent;
    if (current.tagName === 'LI' || current.tagName === 'TR' || current.getAttribute('role') === 'row') {
      break;
    }
  }
  return current;
}

/** All the places ESPN might have written a useful label on an element. */
export function labelsOf(el: Element): string[] {
  const labels: string[] = [];
  for (const attr of ['aria-label', 'title', 'alt', 'data-testid', 'data-test-id', 'data-id']) {
    const value = el.getAttribute(attr);
    if (value) labels.push(value);
  }
  return labels;
}

export function visibleText(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function isVisible(el: Element): boolean {
  try {
    return !isHidden(el);
  } catch {
    return true;
  }
}

/** Elements whose text or labels contain the phrase, innermost first. */
export function findByPhrase(phrase: string, atoms: TextAtom[]): Element[] {
  const needle = phrase.toLowerCase();
  const hits: Element[] = [];
  for (const atom of atoms) {
    if (atom.text.toLowerCase().includes(needle)) hits.push(atom.el);
  }
  return hits;
}

/**
 * ESPN player links look like /nfl/player/_/id/4362628/jamarr-chase and
 * headshots like .../headshots/nfl/players/full/4362628.png. Both have been
 * stable for many seasons, which makes the numeric id the most reliable
 * identifier available to us.
 */
const PLAYER_ID_PATTERNS = [
  /\/player\/_\/id\/(\d{3,9})/i,
  /\/players?\/(?:full|clean)\/(\d{3,9})\.png/i,
  /playerId[=:"']+(\d{3,9})/i,
  /\bplayer-(\d{3,9})\b/i,
];

export function espnPlayerIdFrom(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const pattern of PLAYER_ID_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Search an element and its descendants for an ESPN player id. */
export function findPlayerId(el: Element): string | null {
  const direct =
    espnPlayerIdFrom(el.getAttribute('href')) ??
    espnPlayerIdFrom(el.getAttribute('src')) ??
    espnPlayerIdFrom(el.getAttribute('data-player-id')) ??
    espnPlayerIdFrom(el.id);
  if (direct) return direct;

  const anchor = el.querySelector('a[href*="/id/"]');
  if (anchor) {
    const id = espnPlayerIdFrom(anchor.getAttribute('href'));
    if (id) return id;
  }
  const image = el.querySelector('img[src*="headshots"], img[src*="players"]');
  if (image) {
    const id = espnPlayerIdFrom(image.getAttribute('src'));
    if (id) return id;
  }
  return null;
}

export function findHeadshot(el: Element): string | null {
  const image = el.querySelector<HTMLImageElement>('img[src*="headshots"], img[src*="players/full"]');
  return image?.src ?? null;
}
