import type { DraftPhase, DraftPick, DraftSnapshot } from '@/types/draft';
import type { Player } from '@/types/player';
import type { TeamRef } from '@/types/league';
import type { ParseMeta } from '@shared/protocol';
import { normalizePosition } from '@/types/player';
import { LEAGUE, resolveAllTeams, resolveTeam, teamBySlot } from '@/config/league';
import { resolveNflTeam, espnHeadshotUrl, nflLogoUrl } from '@/data/nflTeams';
import { makeEventId } from '@/core/dedupe';
import { coordsFromOverall, isValidOverall, overallFrom, slotForOverall } from '@/core/snake';
import {
  compactAtoms,
  findByPhrase,
  findHeadshot,
  findPlayerId,
  isVisible,
  labelsOf,
  rowContainer,
  scanAtoms,
  textAtoms,
  visibleText,
  type TextAtom,
} from './dom';
import * as P from './patterns';
import type { ProbeSnapshot } from './probeTypes';

/**
 * The ESPN draft room parser.
 *
 * Multi-strategy by design. Every field is attempted from the most reliable
 * source available down to the loosest, and the winning strategy is recorded
 * so the debug panel can show exactly how each number was obtained:
 *
 *   1. main-world  - structured state ESPN itself put on the page
 *   2. attributes  - ARIA labels, data attributes, ESPN URL shapes
 *   3. text        - the words a human reads off the screen
 *   4. derived     - filled in from the configured draft order
 *
 * Nothing keys on a generated CSS class name, and nothing here writes to the
 * page: the extension observes and never acts.
 */

export const PARSER_VERSION = '1.0.0-espn2026';

export interface ParseInput {
  root?: ParentNode;
  leagueId: string | null;
  probe: ProbeSnapshot | null;
  previous: DraftSnapshot | null;
  /**
   * Completed picks straight from ESPN's read-only draft feed.
   *
   * The draft room does not render the picks already made anywhere we can
   * reach, so this is where the board actually comes from. It outranks
   * everything read off the screen because it is ESPN's own record.
   */
  apiPicks?: DraftPick[];
}

export interface ParseOutput {
  snapshot: DraftSnapshot;
  meta: ParseMeta;
}

class Recorder {
  readonly strategies: Record<string, string> = {};
  readonly warnings: string[] = [];

  use<T>(field: string, strategy: string, value: T): T {
    if (value !== null && value !== undefined) this.strategies[field] = strategy;
    return value;
  }

  warn(message: string): void {
    if (!this.warnings.includes(message)) this.warnings.push(message);
  }
}

export function parseDraftRoom(input: ParseInput): ParseOutput {
  const startedAt = performance.now();
  const recorder = new Recorder();
  const root = input.root ?? document;
  // Visibility is checked per candidate rather than across every atom:
  // getComputedStyle on thousands of elements forces a style recalculation
  // and would make the ESPN tab stutter on every pass.
  /*
   * Two readings of the page from one walk. `compact` holds short strings
   * assembled from sibling elements - ESPN builds its pick clock that way, so
   * nothing owns the text "00:30" and `atoms` alone cannot see it. The tight
   * window is what keeps "RND 9 of 16" and "00:30" from joining into one
   * string and being read as a sixteen-hundred round draft.
   */
  const { atoms, compact } = scanAtoms(root, 120, 12);

  const probe = input.probe?.draft ?? null;
  // ESPN's own current-pick module: the most reliable thing on the page.
  const current = readCurrentPickModule(root);
  const strip = readPickStrip(root, atoms);

  // Picks first: whether any selection has been made is itself evidence about
  // which phase the draft is in.
  // Where the draft is right now, read before the board, because it is what
  // the board is checked against.
  const coords = detectCoords(atoms, compact, probe, current, recorder);
  /*
   * Only a reading of the room's own "on the clock" may trim the board.
   *
   * The trim exists to overrule a feed that lists picks which have not
   * happened, so it has to come from a statement about *now*. A bare
   * coordinate found in page text is not that - a Pick History row reading
   * "R1, P1" would set the clock to pick 1 and delete the entire board it
   * was just read from.
   */
  const CLOCK_COORDS = new Set(['main-world', 'dom-current-pick', 'text-overall']);
  const coordsFrom = recorder.strategies['coords'];
  const onTheClockPick = coordsFrom && CLOCK_COORDS.has(coordsFrom) ? (coords?.overallPick ?? null) : null;

  const picks = detectPicks(
    root,
    atoms,
    probe,
    input.apiPicks ?? [],
    input.leagueId ?? LEAGUE.espnLeagueId,
    onTheClockPick,
    recorder,
  );
  const phase = detectPhase(atoms, probe, picks.length, current, recorder);
  const clock = detectClock(atoms, compact, probe, recorder);
  const onTheClock = detectOnTheClock(atoms, probe, current, coords?.overallPick ?? null, recorder);
  const onDeck = detectOnDeck(atoms, strip, coords?.overallPick ?? null, recorder);

  // If ESPN showed us history but no explicit coordinate, the next open pick
  // is the one on the clock.
  let resolvedCoords = coords;
  if (!resolvedCoords && picks.length > 0) {
    const maxOverall = picks.reduce((max, pick) => Math.max(max, pick.overallPick), 0);
    if (isValidOverall(maxOverall + 1)) {
      resolvedCoords = recorder.use('coords', 'derived-from-history', coordsFromOverall(maxOverall + 1));
    }
  }

  const snapshot: DraftSnapshot = {
    phase,
    leagueId: input.leagueId,
    round: resolvedCoords?.round ?? null,
    pickInRound: resolvedCoords?.pickInRound ?? null,
    overallPick: resolvedCoords?.overallPick ?? null,
    onTheClock,
    onDeck,
    clockMs: clock.ms,
    clockRunning: clock.running,
    picks,
    capturedAt: Date.now(),
  };

  return {
    snapshot,
    meta: {
      parserVersion: PARSER_VERSION,
      strategies: recorder.strategies,
      confidence: confidenceFor(snapshot, recorder.strategies),
      warnings: recorder.warnings,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

/**
 * How much of what the page *could* show did we actually read?
 *
 * Scored against the current phase rather than a fixed list. A pre-draft room
 * has no clock, no team on the clock and no picks; counting those absences as
 * failures reported a perfectly healthy read as 20% and made the popup look
 * broken when nothing was wrong. Likewise there are genuinely no picks yet at
 * 1.01, and a finished draft has no clock.
 */
function confidenceFor(snapshot: DraftSnapshot, strategies: Record<string, string>): number {
  const expected: string[] = ['phase'];

  switch (snapshot.phase) {
    case 'in_progress':
    case 'paused':
      expected.push('clock', 'coords', 'onTheClock');
      // Picks only count once at least one selection should exist.
      if ((snapshot.overallPick ?? 1) > 1) expected.push('picks');
      break;
    case 'complete':
      expected.push('picks');
      break;
    case 'waiting':
      // Knowing the draft has not started is the whole of a correct read here.
      break;
    default:
      // 'idle' means we could not tell what the page is - that is a real miss.
      return 0;
  }

  /*
   * Only what we actually read from ESPN counts. A field filled in from the
   * configured draft order is a fallback, not a reading - and it is exactly
   * the case where the TV can end up showing the wrong team, so it must not
   * flatter the score.
   */
  const got = expected.filter((field) => {
    const strategy = strategies[field];
    return strategy !== undefined && !strategy.startsWith('derived');
  }).length;
  return expected.length === 0 ? 1 : got / expected.length;
}

/* -------------------- ESPN's own draft-room modules -------------------- */

/**
 * ESPN's Pick History panel: the completed board, in the room's own words.
 *
 * Captured from a live draft room, one row reads
 *
 *   Jahmyr Gibbs / DET RBR1, P1 - El Dandy
 *
 * which is a whole selection in a single string. Every part is checked
 * against something real - the club against the NFL, the drafting team
 * against this league, the coordinate against the snake - so unlike the
 * loose text reading it stands in for, this cannot match page furniture: a
 * logo has no club, no position, no coordinate and no team.
 *
 * The panel is a tab, so this finds nothing unless someone has it open. That
 * is exactly right: it is the fallback for a room whose draft feed is not
 * carrying who was drafted, which is what a practice room does.
 */
function readPickHistory(root: ParentNode, leagueId: string): DraftPick[] {
  const picks: DraftPick[] = [];
  const seen = new Set<number>();

  for (const atom of compactAtoms(root, 90)) {
    const match = atom.text.match(P.PICK_HISTORY_ROW);
    if (!match) continue;
    const [, rawName, rawClub, rawPosition, rawRound, rawPick, rawTeam] = match;
    if (!rawName || !rawClub || !rawPosition || !rawRound || !rawPick || !rawTeam) continue;

    const nfl = resolveNflTeam(rawClub);
    const team = resolveTeam(rawTeam);
    if (!nfl || !team) continue;

    const coords = coordsFromLabelled(Number(rawRound), Number(rawPick));
    if (!coords || seen.has(coords.overallPick)) continue;

    const name = rawName.trim();
    if (name.length < 3) continue;
    seen.add(coords.overallPick);

    const row = rowContainer(atom.el, 3);
    const espnId = findPlayerId(atom.el) ?? findPlayerId(row);
    const headshot = findHeadshot(atom.el) ?? findHeadshot(row) ?? espnHeadshotUrl(espnId) ?? null;
    const logo = nflLogoUrl(nfl.abbr);

    picks.push(
      finishPick(
        {
          overallPick: coords.overallPick,
          round: coords.round,
          pickInRound: coords.pickInRound,
          player: {
            name,
            position: normalizePosition(rawPosition),
            rawPosition,
            ...(espnId ? { espnId } : {}),
            nflTeamAbbr: nfl.abbr,
            nflTeamName: nfl.name,
            ...(headshot ? { headshotUrl: headshot } : {}),
            ...(logo ? { teamLogoUrl: logo } : {}),
          },
          fantasyTeamId: team.id,
          fantasyTeamName: team.name,
          managerName: team.manager.name,
        },
        leagueId,
      ),
    );
  }
  return picks;
}

/**
 * What ESPN's current-pick module says.
 *
 * Read from a real 2026 draft room, where it renders as
 *
 *   <div data-testid="current-pick" title="LOS BUQES DE BUGABA">
 *     <div class="... on-the-clock ttu">On the Clock: Pick 104</div>
 *     <div class="... team-name">LOS BUQES DE BUGABA</div>
 *
 * The test id and the title attribute are the stable parts - the classes are
 * generated and are not used. This single element answers both "which pick"
 * and "whose pick", which is why it outranks every text heuristic below.
 */
interface CurrentPick {
  overall: number | null;
  teamName: string | null;
}

function readCurrentPickModule(root: ParentNode): CurrentPick | null {
  let el: Element | null = null;
  try {
    el = root.querySelector('[data-testid="current-pick"], [data-test-id="current-pick"]');
  } catch {
    return null;
  }
  if (!el) return null;

  const title = el.getAttribute('title');
  const text = visibleText(el);
  const match = text.match(P.ON_CLOCK_PICK);
  const overall = match?.[1] ? Number(match[1]) : null;

  // The team name is also rendered inside, but the title attribute is a single
  // clean value where the text is a run-on of label and name.
  let teamName = title?.trim() || null;
  if (!teamName && match) {
    const remainder = text.slice((match.index ?? 0) + match[0].length).trim();
    teamName = remainder || null;
  }
  if (overall === null && !teamName) return null;
  return { overall: overall !== null && isValidOverall(overall) ? overall : null, teamName };
}

/**
 * ESPN's upcoming-picks strip: "PICK 25 / El Dandy", "PICK 26 / AUTO / ...".
 *
 * These are the picks still to come, never the ones already made, so the strip
 * is used for who is up - not as a source of selections. It is also a free
 * check of the configured draft order against ESPN's own.
 */
function readPickStrip(root: ParentNode, atoms: TextAtom[]): Map<number, string> {
  const strip = new Map<number, string>();
  for (const atom of atoms) {
    const match = atom.text.match(P.PICK_STRIP);
    if (!match?.[1]) continue;
    const overall = Number(match[1]);
    if (!isValidOverall(overall) || strip.has(overall)) continue;

    // The team name lives on a title attribute a level or two up, alongside
    // the number - the same element that carries the "AUTO" marker.
    let node: Element | null = atom.el;
    for (let hop = 0; hop < 3 && node; hop += 1) {
      const title = node.getAttribute('title')?.trim();
      if (title && resolveTeam(title)) {
        strip.set(overall, title);
        break;
      }
      node = node.parentElement;
    }
    if (strip.has(overall)) continue;

    // No title: fall back to the one team named inside the same cell.
    const cell = rowContainer(atom.el, 3);
    const named = new Set<string>();
    for (const candidate of textAtoms(cell, 60)) {
      if (P.PICK_STRIP.test(candidate.text)) continue;
      const teams = resolveAllTeams(candidate.text);
      if (teams.length === 1 && teams[0]) named.add(teams[0].name);
    }
    if (named.size === 1) {
      const only = [...named][0];
      if (only) strip.set(overall, only);
    }
  }
  return strip;
}

/* ------------------------------- phase -------------------------------- */

function detectPhase(
  atoms: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  pickCount: number,
  current: CurrentPick | null,
  recorder: Recorder,
): DraftPhase {
  if (probe?.status) {
    const status = probe.status.toUpperCase();
    if (status.includes('COMPLETE') || status.includes('DONE')) return recorder.use('phase', 'main-world', 'complete');
    if (status.includes('PAUSE')) return recorder.use('phase', 'main-world', 'paused');
    if (status.includes('PROGRESS') || status.includes('LIVE') || status.includes('ACTIVE')) {
      return recorder.use('phase', 'main-world', 'in_progress');
    }
    if (status.includes('PRE') || status.includes('WAIT') || status.includes('SCHEDULED')) {
      return recorder.use('phase', 'main-world', 'waiting');
    }
  }

  const haystack = atoms.map((atom) => atom.text).join(' • ');
  if (P.DRAFT_COMPLETE.test(haystack)) return recorder.use('phase', 'text', 'complete');
  if (P.DRAFT_PAUSED.test(haystack)) return recorder.use('phase', 'text', 'paused');

  // An explicit "the draft has not started" outranks an on-the-clock label,
  // which some pre-draft rooms render before anything is live. Once a pick
  // exists, the draft is unambiguously under way.
  const notStarted = P.DRAFT_NOT_STARTED.test(haystack);
  if (notStarted && pickCount === 0) return recorder.use('phase', 'text-waiting', 'waiting');
  if (pickCount > 0) return recorder.use('phase', 'picks-exist', 'in_progress');
  // ESPN only renders its current-pick module once the draft is under way.
  if (current?.overall) return recorder.use('phase', 'dom-current-pick', 'in_progress');
  if (findByPhrase('on the clock', atoms).length > 0) {
    return recorder.use('phase', 'text-on-the-clock', 'in_progress');
  }
  if (notStarted) return recorder.use('phase', 'text-waiting', 'waiting');
  return 'idle';
}

/* ------------------------------- clock -------------------------------- */

function detectClock(
  atoms: TextAtom[],
  compact: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  recorder: Recorder,
): { ms: number | null; running: boolean | null } {
  if (typeof probe?.timeRemainingMs === 'number') {
    return {
      ms: recorder.use('clock', 'main-world', probe.timeRemainingMs),
      running: probe.clockRunning ?? null,
    };
  }

  // A bare mm:ss atom is almost always the pick clock; prefer one whose
  // surroundings talk about time, and prefer the shortest text.
  const candidates: { ms: number; score: number }[] = [];
  /*
   * Both readings of the page, de-duplicated by element. ESPN's own clock is
   * only in the compact set - it is assembled from sibling fragments and no
   * element owns its text - while a clock labelled in prose ("Time left 4:51")
   * is only in the atom set.
   */
  const byElement = new Map<Element, TextAtom>();
  for (const atom of [...compact, ...atoms]) {
    if (!byElement.has(atom.el)) byElement.set(atom.el, atom);
  }
  for (const atom of byElement.values()) {
    if (atom.text.length > 12) continue;
    const ms = P.matchClock(atom.text);
    if (ms === null) continue;
    if (!isVisible(atom.el)) continue;
    let score = 0;
    if (P.CLOCK.test(atom.text)) score += 2;
    const context = visibleText(atom.el.parentElement).toLowerCase();
    if (/clock|time|remaining|left/.test(context)) score += 3;
    if (ms <= LEAGUE.pickSeconds * 1000) score += 2;
    for (const label of labelsOf(atom.el)) {
      if (/clock|time/i.test(label)) score += 2;
    }
    candidates.push({ ms, score });
  }
  if (candidates.length === 0) return { ms: null, running: null };
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return { ms: null, running: null };
  return { ms: recorder.use('clock', 'text', best.ms), running: true };
}

/* ----------------------------- coordinates ---------------------------- */

interface Coords {
  round: number;
  pickInRound: number;
  overallPick: number;
}

function detectCoords(
  atoms: TextAtom[],
  compact: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  current: CurrentPick | null,
  recorder: Recorder,
): Coords | null {
  if (probe) {
    const overall = numberOrNull(probe.overallPick);
    const round = numberOrNull(probe.round);
    const pickInRound = numberOrNull(probe.pickInRound);
    if (overall && isValidOverall(overall)) {
      return recorder.use('coords', 'main-world', coordsFromOverall(overall));
    }
    if (round && pickInRound) {
      return recorder.use('coords', 'main-world', {
        round,
        pickInRound,
        overallPick: overallFrom(round, pickInRound),
      });
    }
  }

  /*
   * ESPN's own header, read exactly: "On the Clock: Pick 104" is the overall
   * pick and "RND 9 of 16" is the round. Cross-checking them catches a
   * misread immediately instead of putting a wrong round on the TV.
   */
  const headerRound = readRound(atoms, compact);
  if (current?.overall && isValidOverall(current.overall)) {
    const derived = coordsFromOverall(current.overall);
    if (headerRound && headerRound.round !== derived.round) {
      recorder.warn(`ESPN header says round ${headerRound.round}, pick ${current.overall} implies ${derived.round}`);
    }
    if (headerRound && headerRound.totalRounds !== LEAGUE.rounds) {
      recorder.warn(`ESPN says ${headerRound.totalRounds} rounds, league is configured for ${LEAGUE.rounds}`);
    }
    return recorder.use('coords', 'dom-current-pick', derived);
  }

  let round: number | null = headerRound?.round ?? null;
  let pickInRound: number | null = null;
  let overall: number | null = null;

  for (const atom of atoms) {
    if (atom.text.length > 60) continue;

    const rp = atom.text.match(P.PICK_COORD_RP);
    if (rp?.[1] && rp[2]) {
      round ??= Number(rp[1]);
      pickInRound ??= Number(rp[2]);
    }

    const roundMatch = atom.text.match(P.ROUND);
    if (roundMatch?.[1]) round ??= Number(roundMatch[1]);

    const pickMatch = atom.text.match(P.PICK_IN_ROUND);
    if (pickMatch?.[1]) {
      const value = Number(pickMatch[1]);
      // "Pick 43" on a 12-team board means the overall pick, not the slot.
      if (value > LEAGUE.teamCount) overall ??= value;
      else pickInRound ??= value;
    }

    const overallMatch = atom.text.match(P.OVERALL);
    const overallValue = overallMatch?.[1] ?? overallMatch?.[2];
    if (overallValue) overall ??= Number(overallValue);
  }

  if (overall && isValidOverall(overall)) {
    const derived = coordsFromOverall(overall);
    if (round && pickInRound && overallFrom(round, pickInRound) !== overall) {
      recorder.warn(`round/pick (${round}.${pickInRound}) disagrees with overall ${overall}`);
    }
    return recorder.use('coords', 'text-overall', derived);
  }
  if (round && pickInRound) {
    const overallPick = overallFrom(round, pickInRound);
    if (isValidOverall(overallPick)) {
      return recorder.use('coords', 'text-round-pick', { round, pickInRound, overallPick });
    }
  }
  return null;
}

/* ---------------------------- who is picking --------------------------- */

function detectOnTheClock(
  atoms: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  current: CurrentPick | null,
  overallPick: number | null,
  recorder: Recorder,
): TeamRef | null {
  if (probe?.onTheClockTeam) {
    const team = resolveTeam(probe.onTheClockTeam);
    if (team) return recorder.use('onTheClock', 'main-world', toRef(team.id));
  }

  if (current?.teamName) {
    const team = resolveTeam(current.teamName);
    if (team) return recorder.use('onTheClock', 'dom-current-pick', toRef(team.id));
    recorder.warn(`ESPN says "${current.teamName}" is on the clock; no configured team matches`);
  }

  const found = teamNearPhrase(atoms, P.ON_THE_CLOCK, [P.ON_DECK, P.UP_NEXT]);
  if (found) return recorder.use('onTheClock', 'text-on-the-clock', found);

  if (overallPick !== null && isValidOverall(overallPick)) {
    const team = teamBySlot(slotForOverall(overallPick));
    if (team) return recorder.use('onTheClock', 'derived-draft-order', toRef(team.id));
  }
  return null;
}

function detectOnDeck(
  atoms: TextAtom[],
  strip: Map<number, string>,
  overallPick: number | null,
  recorder: Recorder,
): TeamRef | null {
  // ESPN's own upcoming-picks strip is the authority on who is next.
  if (overallPick !== null) {
    const next = strip.get(overallPick + 1);
    const fromStrip = next ? resolveTeam(next) : undefined;
    if (fromStrip) return recorder.use('onDeck', 'dom-pick-strip', toRef(fromStrip.id));
  }

  const found =
    teamNearPhrase(atoms, P.ON_DECK, [P.ON_THE_CLOCK]) ??
    teamNearPhrase(atoms, P.UP_NEXT, [P.ON_THE_CLOCK]);
  if (found) return recorder.use('onDeck', 'text-on-deck', found);
  if (overallPick !== null && isValidOverall(overallPick + 1)) {
    const team = teamBySlot(slotForOverall(overallPick + 1));
    if (team) return recorder.use('onDeck', 'derived-draft-order', toRef(team.id));
  }
  return null;
}

/**
 * Find a configured team name near a marker phrase.
 *
 * The tightest element wins: a wrapper that holds both "on the clock" and
 * "on deck" mentions two teams, and picking one of them at random is how the
 * wrong name ends up on the TV. Such an element is skipped in favour of a
 * narrower one, and only an unambiguous single match is accepted.
 */
function teamNearPhrase(atoms: TextAtom[], phrase: RegExp, competing: RegExp[] = []): TeamRef | null {
  const markers = atoms
    .filter((atom) => phrase.test(atom.text))
    .sort((a, b) => a.text.length - b.text.length);

  for (const marker of markers) {
    // An element carrying a competing marker describes more than one team.
    if (competing.some((pattern) => pattern.test(marker.text))) continue;
    if (!isVisible(marker.el)) continue;

    // Same element: "El Dandy is on the clock".
    const remainder = marker.text.replace(phrase, ' ').trim();
    const inline = resolveAllTeams(remainder);
    if (inline.length === 1 && inline[0]) return toRef(inline[0].id);

    // Otherwise widen one ancestor at a time and stop at the first level that
    // names exactly one team. Climbing further would eventually swallow the
    // neighbouring "on deck" block and make the answer a coin flip.
    let node: Element | null = marker.el.parentElement;
    for (let level = 0; level < 4 && node; level += 1) {
      const found = new Map<string, TeamRef>();
      for (const candidate of textAtoms(node, 80)) {
        if (phrase.test(candidate.text)) continue;
        if (competing.some((pattern) => pattern.test(candidate.text))) continue;
        const teams = resolveAllTeams(candidate.text);
        if (teams.length === 1 && teams[0]) found.set(teams[0].id, toRef(teams[0].id));
      }
      if (found.size === 1) {
        const only = [...found.values()][0];
        if (only) return only;
      }
      // More than one team at this level: the marker's own block did not name
      // a team, so stop rather than guess.
      if (found.size > 1) break;
      node = node.parentElement;
    }
  }
  return null;
}

function toRef(teamId: string): TeamRef {
  const team = LEAGUE.teams.find((candidate) => candidate.id === teamId);
  return {
    fantasyTeamId: teamId,
    fantasyTeamName: team?.name ?? teamId,
    ...(team ? { managerName: team.manager.name } : {}),
  };
}

/* ------------------------------- picks -------------------------------- */

function detectPicks(
  root: ParentNode,
  atoms: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  apiPicks: DraftPick[],
  leagueId: string,
  onTheClockPick: number | null,
  recorder: Recorder,
): DraftPick[] {
  const byOverall = new Map<number, DraftPick>();

  // 0. ESPN's own draft feed: complete, and the only place a finished pick
  //    reliably exists at all.
  for (const pick of apiPicks) byOverall.set(pick.overallPick, pick);
  if (byOverall.size > 0) recorder.use('picks', 'espn-api', byOverall.size);

  // 0b. ESPN's Pick History panel, when someone has it open. This is what
  //     carries the board in a room whose feed does not.
  for (const pick of readPickHistory(root, leagueId)) {
    if (!byOverall.has(pick.overallPick)) byOverall.set(pick.overallPick, pick);
  }
  if (byOverall.size > 0 && !recorder.strategies['picks']) {
    recorder.use('picks', 'dom-pick-history', byOverall.size);
  }

  // 1. Structured state, when ESPN gives it to us.
  if (probe?.picks?.length) {
    for (const raw of probe.picks) {
      const pick = pickFromProbe(raw, leagueId);
      // ESPN's feed already answered for this pick; two readings of the same
      // selection must never become two picks.
      if (pick && !byOverall.has(pick.overallPick)) byOverall.set(pick.overallPick, pick);
    }
    if (byOverall.size > 0 && !recorder.strategies['picks']) {
      recorder.use('picks', 'main-world', byOverall.size);
    }
  }

  // 2. Anything on screen with an ESPN player id attached to it.
  const anchors = Array.from(
    (root as ParentNode).querySelectorAll<HTMLElement>(
      'a[href*="/player/_/id/"], img[src*="headshots/nfl/players"], [data-player-id]',
    ),
  );
  const containers = new Set<Element>();
  for (const anchor of anchors) containers.add(rowContainer(anchor, 5));

  for (const container of containers) {
    const pick = pickFromRow(container, leagueId);
    if (pick && !byOverall.has(pick.overallPick)) byOverall.set(pick.overallPick, pick);
  }
  if (byOverall.size > 0 && !recorder.strategies['picks']) {
    recorder.use('picks', 'dom-rows', byOverall.size);
  }

  // 3. Rows that name a player without an id (rare, but the board sometimes
  //    renders plain text once a pick scrolls out of the live feed).
  if (byOverall.size === 0) {
    for (const atom of atoms) {
      const pick = pickFromRow(rowContainer(atom.el, 3), leagueId);
      if (pick && !byOverall.has(pick.overallPick)) byOverall.set(pick.overallPick, pick);
    }
    if (byOverall.size > 0) {
      recorder.use('picks', 'dom-text', byOverall.size);
      recorder.warn(`board read from page text, not ESPN's feed (${byOverall.size} picks)`);
    }
  }

  /*
   * Cross-check the board against the clock.
   *
   * ESPN tells us two things, and they can disagree. A practice room sitting
   * on pick 13 had its feed return all 180 picks, named and complete - so the
   * board filled, the presentation declared the draft over before it started,
   * and then ignored the clock, the round and every real pick of the night.
   *
   * The room's own "on the clock" is the statement about *now*, so it wins: a
   * pick at or beyond it has not been made yet, whatever the feed says. When
   * the draft really is finished there is no pick on the clock and nothing is
   * dropped.
   */
  const board = [...byOverall.values()].sort((a, b) => a.overallPick - b.overallPick);
  if (onTheClockPick === null) return board;

  const made = board.filter((pick) => pick.overallPick < onTheClockPick);
  if (made.length !== board.length) {
    recorder.warn(
      `ESPN's feed listed ${board.length} picks while pick ${onTheClockPick} is on the clock; ` +
        `kept the ${made.length} that have actually happened`,
    );
  }
  return made;
}

interface ProbePick {
  overallPick?: number | string;
  round?: number | string;
  pickInRound?: number | string;
  playerId?: number | string;
  playerName?: string;
  position?: string;
  proTeam?: string;
  teamName?: string;
  teamId?: number | string;
  autoPick?: boolean;
}

function pickFromProbe(raw: ProbePick, leagueId: string): DraftPick | null {
  const overallPick = numberOrNull(raw.overallPick);
  if (!overallPick || !isValidOverall(overallPick)) return null;
  const coords = coordsFromOverall(overallPick);

  const name = (raw.playerName ?? '').trim();
  const espnId = raw.playerId !== undefined ? String(raw.playerId) : undefined;
  if (!name && !espnId) return null;

  const player = buildPlayer({
    name: name || `Player ${espnId}`,
    espnId: espnId ?? null,
    position: raw.position ?? null,
    proTeam: raw.proTeam ?? null,
    headshot: null,
  });

  const team = resolveTeam(raw.teamName ?? null) ?? teamBySlot(slotForOverall(overallPick));
  if (!team) return null;

  return finishPick(
    {
      overallPick,
      round: numberOrNull(raw.round) ?? coords.round,
      pickInRound: numberOrNull(raw.pickInRound) ?? coords.pickInRound,
      player,
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.manager.name,
      ...(raw.autoPick ? { autoPick: true } : {}),
    },
    leagueId,
  );
}

/** Read one pick out of a rendered row: coordinate, player, drafting team. */
function pickFromRow(container: Element, leagueId: string): DraftPick | null {
  const text = visibleText(container);
  if (!text || text.length > 240) return null;

  const coords = coordsFromRowText(text);
  if (!coords) return null;

  const anchor = container.querySelector<HTMLElement>('a[href*="/player/_/id/"]');
  const espnId = findPlayerId(container);
  const name = playerNameFrom(container, anchor, text);
  if (!name) return null;

  const positionTeam = positionAndTeamFrom(text);
  /*
   * Proof of identity, and nothing looser.
   *
   * ESPN's numeric player id is the only thing on the page that actually
   * identifies a player: it is what the headshot is built from and what a
   * pick is deduplicated by. Everything softer has been tried and has put
   * fiction on the television twice - a club crest read as a player called
   * "Team logo", then a nameless one called "Team" at no position for no
   * club. The drafting team was never the check it looked like either,
   * because a row that does not name one falls back to whoever holds that
   * draft slot, which always succeeds and so never fails visibly.
   *
   * So a pick read off the page must carry an id. The board comes from
   * ESPN's feed, where every pick has one; this path exists for the case
   * where the feed is unreachable, and an empty board is far better than an
   * invented one.
   */
  if (!espnId) return null;

  const player = buildPlayer({
    name,
    espnId,
    position: positionTeam.position,
    proTeam: positionTeam.proTeam,
    headshot: findHeadshot(container),
  });

  const fantasyTeam =
    resolveTeam(fantasyTeamTextFrom(container, text)) ?? teamBySlot(slotForOverall(coords.overallPick));
  if (!fantasyTeam) return null;

  return finishPick(
    {
      overallPick: coords.overallPick,
      round: coords.round,
      pickInRound: coords.pickInRound,
      player,
      fantasyTeamId: fantasyTeam.id,
      fantasyTeamName: fantasyTeam.name,
      managerName: fantasyTeam.manager.name,
      ...(P.AUTOPICK.test(text) ? { autoPick: true } : {}),
    },
    leagueId,
  );
}

function coordsFromRowText(text: string): Coords | null {
  // 1. "R3 P7" - explicitly labelled, unambiguous anywhere in the row.
  const rp = text.match(P.PICK_COORD_RP);
  if (rp?.[1] && rp[2]) {
    const coords = coordsFromLabelled(Number(rp[1]), Number(rp[2]));
    if (coords) return coords;
  }

  // 2. "3.07" at the start of the row, which is how a pick row leads.
  const coord = text.match(P.PICK_COORD);
  if (coord?.[1] && coord[2]) {
    const coords = coordsFromLabelled(Number(coord[1]), Number(coord[2]));
    if (coords) return coords;
  }

  // 3. "Round 3 ... Pick 7" - both labelled.
  const roundMatch = text.match(P.ROUND);
  const pickMatch = text.match(P.PICK_IN_ROUND);
  if (roundMatch?.[1] && pickMatch?.[1]) {
    const coords = coordsFromLabelled(Number(roundMatch[1]), Number(pickMatch[1]));
    if (coords) return coords;
  }

  // 4. "43rd overall" - labelled, so safe anywhere.
  const overallMatch = text.match(P.OVERALL);
  const overallValue = overallMatch?.[1] ?? overallMatch?.[2];
  if (overallValue) {
    const overall = Number(overallValue);
    if (isValidOverall(overall)) return coordsFromOverall(overall);
  }
  return null;
}

/** "RND 9 of 16" - anchored, so it can never read a neighbouring clock. */
function readRound(atoms: TextAtom[], compact: TextAtom[]): { round: number; totalRounds: number } | null {
  for (const atom of [...compact, ...atoms]) {
    const match = atom.text.match(P.RND_OF);
    if (!match?.[1] || !match[2]) continue;
    const round = Number(match[1]);
    const totalRounds = Number(match[2]);
    if (round >= 1 && round <= 40 && totalRounds >= 1 && totalRounds <= 40) return { round, totalRounds };
  }
  return null;
}

function coordsFromLabelled(round: number, pickInRound: number): Coords | null {
  if (round < 1 || round > LEAGUE.rounds) return null;
  if (pickInRound < 1 || pickInRound > LEAGUE.teamCount) return null;
  const overallPick = overallFrom(round, pickInRound);
  return isValidOverall(overallPick) ? { round, pickInRound, overallPick } : null;
}

function playerNameFrom(container: Element, anchor: HTMLElement | null, text: string): string | null {
  const fromAnchor = visibleText(anchor);
  if (fromAnchor && fromAnchor.length >= 3 && fromAnchor.length <= 40) return fromAnchor;

  for (const label of anchor ? labelsOf(anchor) : []) {
    if (label.length >= 3 && label.length <= 40 && /[a-z]/i.test(label)) return label.trim();
  }

  /*
   * An image names a player only when it is a picture of the player. ESPN
   * labels fantasy club crests alt="Team logo", and taking any image's alt
   * put a crest on the board as a drafted player - 180 times over.
   */
  for (const image of container.querySelectorAll<HTMLImageElement>('img[alt]')) {
    const alt = (image.getAttribute('alt') ?? '').trim();
    if (alt.length < 3 || alt.length > 40) continue;
    if (P.GENERIC_IMAGE_ALT.test(alt)) continue;
    return alt;
  }

  // Last resort: the longest word-like run that is not a label we recognise.
  const candidate = text
    .split(/[|•·•]|\s{2,}/)
    .map((part) => part.trim())
    .find(
      (part) =>
        part.length >= 5 &&
        part.length <= 40 &&
        /^[A-Za-z][A-Za-z .'\-]+$/.test(part) &&
        !P.GENERIC_IMAGE_ALT.test(part) &&
        !P.ON_THE_CLOCK.test(part) &&
        !P.SELECTED_BY.test(part),
    );
  return candidate ?? null;
}

function positionAndTeamFrom(text: string): { position: string | null; proTeam: string | null } {
  const first = text.match(P.POSITION_TEAM);
  if (first?.[1]) {
    const proTeam = first[2] && resolveNflTeam(first[2]) ? first[2] : null;
    return { position: first[1], proTeam };
  }
  const second = text.match(P.TEAM_POSITION);
  if (second?.[2]) {
    const proTeam = second[1] && resolveNflTeam(second[1]) ? second[1] : null;
    return { position: second[2], proTeam };
  }
  return { position: null, proTeam: null };
}

/** The fantasy team credited with the pick, if the row names one. */
function fantasyTeamTextFrom(container: Element, text: string): string | null {
  const afterSelected = text.split(P.SELECTED_BY)[1];
  if (afterSelected) {
    const team = resolveTeam(afterSelected.trim());
    if (team) return team.name;
  }
  for (const label of labelsOf(container)) {
    if (resolveTeam(label)) return label;
  }
  for (const atom of textAtoms(container, 60)) {
    if (resolveTeam(atom.text)) return atom.text;
  }
  return null;
}

function buildPlayer(input: {
  name: string;
  espnId: string | null;
  position: string | null;
  proTeam: string | null;
  headshot: string | null;
}): Player {
  const nfl = resolveNflTeam(input.proTeam);
  const headshot = input.headshot ?? espnHeadshotUrl(input.espnId);
  return {
    name: input.name.trim(),
    position: normalizePosition(input.position),
    ...(input.position ? { rawPosition: input.position } : {}),
    ...(input.espnId ? { espnId: input.espnId } : {}),
    ...(nfl ? { nflTeamAbbr: nfl.abbr, nflTeamName: nfl.name } : {}),
    ...(headshot ? { headshotUrl: headshot } : {}),
    ...(nfl && nflLogoUrl(nfl.abbr) ? { teamLogoUrl: nflLogoUrl(nfl.abbr) as string } : {}),
  };
}

function finishPick(pick: Omit<DraftPick, 'eventId' | 'timestamp'>, leagueId: string): DraftPick {
  return {
    ...pick,
    timestamp: Date.now(),
    eventId: makeEventId({
      leagueId,
      overallPick: pick.overallPick,
      player: pick.player,
      fantasyTeamId: pick.fantasyTeamId,
    }),
  };
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
