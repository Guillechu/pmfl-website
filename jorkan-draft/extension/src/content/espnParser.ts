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
  findByPhrase,
  findHeadshot,
  findPlayerId,
  isVisible,
  labelsOf,
  rowContainer,
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

export const PARSER_VERSION = '0.9.0-preflight';

export interface ParseInput {
  root?: ParentNode;
  leagueId: string | null;
  probe: ProbeSnapshot | null;
  previous: DraftSnapshot | null;
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
  const atoms = textAtoms(root).filter((atom) => isVisible(atom.el));

  const probe = input.probe?.draft ?? null;

  // Picks first: whether any selection has been made is itself evidence about
  // which phase the draft is in.
  const picks = detectPicks(root, atoms, probe, input.leagueId ?? LEAGUE.espnLeagueId, recorder);
  const phase = detectPhase(atoms, probe, picks.length, recorder);
  const clock = detectClock(atoms, probe, recorder);
  const coords = detectCoords(atoms, probe, recorder);
  const onTheClock = detectOnTheClock(atoms, probe, coords?.overallPick ?? null, recorder);
  const onDeck = detectOnDeck(atoms, coords?.overallPick ?? null, recorder);

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

  const expected = ['phase', 'clock', 'coords', 'onTheClock', 'picks'];
  const got = expected.filter((field) => recorder.strategies[field]).length;

  return {
    snapshot,
    meta: {
      parserVersion: PARSER_VERSION,
      strategies: recorder.strategies,
      confidence: got / expected.length,
      warnings: recorder.warnings,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

/* ------------------------------- phase -------------------------------- */

function detectPhase(
  atoms: TextAtom[],
  probe: NonNullable<ProbeSnapshot['draft']> | null,
  pickCount: number,
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
  if (findByPhrase('on the clock', atoms).length > 0) {
    return recorder.use('phase', 'text-on-the-clock', 'in_progress');
  }
  if (notStarted) return recorder.use('phase', 'text-waiting', 'waiting');
  return 'idle';
}

/* ------------------------------- clock -------------------------------- */

function detectClock(
  atoms: TextAtom[],
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
  for (const atom of atoms) {
    if (atom.text.length > 12) continue;
    const ms = P.matchClock(atom.text);
    if (ms === null) continue;
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
  probe: NonNullable<ProbeSnapshot['draft']> | null,
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

  let round: number | null = null;
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
  overallPick: number | null,
  recorder: Recorder,
): TeamRef | null {
  if (probe?.onTheClockTeam) {
    const team = resolveTeam(probe.onTheClockTeam);
    if (team) return recorder.use('onTheClock', 'main-world', toRef(team.id));
  }

  const found = teamNearPhrase(atoms, P.ON_THE_CLOCK, [P.ON_DECK, P.UP_NEXT]);
  if (found) return recorder.use('onTheClock', 'text-on-the-clock', found);

  if (overallPick !== null && isValidOverall(overallPick)) {
    const team = teamBySlot(slotForOverall(overallPick));
    if (team) return recorder.use('onTheClock', 'derived-draft-order', toRef(team.id));
  }
  return null;
}

function detectOnDeck(atoms: TextAtom[], overallPick: number | null, recorder: Recorder): TeamRef | null {
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
  leagueId: string,
  recorder: Recorder,
): DraftPick[] {
  const byOverall = new Map<number, DraftPick>();

  // 1. Structured state, when ESPN gives it to us.
  if (probe?.picks?.length) {
    for (const raw of probe.picks) {
      const pick = pickFromProbe(raw, leagueId);
      if (pick) byOverall.set(pick.overallPick, pick);
    }
    if (byOverall.size > 0) recorder.use('picks', 'main-world', byOverall.size);
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
    if (byOverall.size > 0) recorder.use('picks', 'dom-text', byOverall.size);
  }

  return [...byOverall.values()].sort((a, b) => a.overallPick - b.overallPick);
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
  const rp = text.match(P.PICK_COORD_RP);
  if (rp?.[1] && rp[2]) {
    const round = Number(rp[1]);
    const pickInRound = Number(rp[2]);
    const overallPick = overallFrom(round, pickInRound);
    if (isValidOverall(overallPick)) return { round, pickInRound, overallPick };
  }

  const coord = text.match(P.PICK_COORD);
  if (coord?.[1] && coord[2]) {
    const round = Number(coord[1]);
    const pickInRound = Number(coord[2]);
    if (round >= 1 && round <= LEAGUE.rounds && pickInRound >= 1 && pickInRound <= LEAGUE.teamCount) {
      const overallPick = overallFrom(round, pickInRound);
      if (isValidOverall(overallPick)) return { round, pickInRound, overallPick };
    }
  }

  const overallMatch = text.match(P.OVERALL);
  const overallValue = overallMatch?.[1] ?? overallMatch?.[2];
  if (overallValue) {
    const overall = Number(overallValue);
    if (isValidOverall(overall)) return coordsFromOverall(overall);
  }
  return null;
}

function playerNameFrom(container: Element, anchor: HTMLElement | null, text: string): string | null {
  const fromAnchor = visibleText(anchor);
  if (fromAnchor && fromAnchor.length >= 3 && fromAnchor.length <= 40) return fromAnchor;

  for (const label of anchor ? labelsOf(anchor) : []) {
    if (label.length >= 3 && label.length <= 40 && /[a-z]/i.test(label)) return label.trim();
  }

  const image = container.querySelector<HTMLImageElement>('img[alt]');
  const alt = image?.alt?.trim();
  if (alt && alt.length >= 3 && alt.length <= 40) return alt;

  // Last resort: the longest word-like run that is not a label we recognise.
  const candidate = text
    .split(/[|•·•]|\s{2,}/)
    .map((part) => part.trim())
    .find(
      (part) =>
        part.length >= 5 &&
        part.length <= 40 &&
        /^[A-Za-z][A-Za-z .'\-]+$/.test(part) &&
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
