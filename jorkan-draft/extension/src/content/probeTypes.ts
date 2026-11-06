/**
 * Shape of whatever the MAIN-world probe manages to find on the page.
 *
 * Everything is optional and everything is untrusted: this is ESPN's internal
 * state, not an API we control, so the parser treats it as a hint that has to
 * survive the same validation as scraped text.
 */
export interface ProbeDraftPick {
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

export interface ProbeDraftState {
  status?: string;
  round?: number | string;
  pickInRound?: number | string;
  overallPick?: number | string;
  onTheClockTeam?: string;
  onDeckTeam?: string;
  timeRemainingMs?: number;
  clockRunning?: boolean;
  picks?: ProbeDraftPick[];
}

export interface ProbeSnapshot {
  capturedAt: number;
  /** Where on the page the data came from, e.g. "window.__espnfitt__". */
  source: string;
  draft: ProbeDraftState | null;
  /** Paths that looked draft-shaped, for the debug export. */
  candidatePaths: string[];
}
