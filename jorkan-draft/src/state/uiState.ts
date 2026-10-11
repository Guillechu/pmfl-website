import type { DraftPick } from '@/types/draft';
import type { PresentationView } from '@/types/settings';

/** Stages of the pick reveal choreography. */
export type RevealStage = 'incoming' | 'player';

export interface RevealState {
  pick: DraftPick;
  stage: RevealStage;
  startedAt: number;
}

export interface UiState {
  /** True once the operator has pressed ARM PRESENTATION (audio unlocked). */
  armed: boolean;
  view: PresentationView;
  reveal: RevealState | null;
  /** Round banner shown briefly when ESPN turns the snake. */
  roundBanner: number | null;
  showDebug: boolean;
  showMixer: boolean;
  showChecklist: boolean;
  showSimulator: boolean;
  fullscreen: boolean;
}

export const INITIAL_UI: UiState = {
  armed: false,
  view: 'live',
  reveal: null,
  roundBanner: null,
  showDebug: false,
  showMixer: false,
  showChecklist: false,
  showSimulator: false,
  fullscreen: false,
};
