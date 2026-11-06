import type { DraftPick, DraftSnapshot } from './draft';
import type { TeamRef } from './league';
import type { SyncStatus } from './sync';

/**
 * Everything a DraftProvider can tell the presentation. The state machine
 * reduces these into DraftState; nothing else may mutate draft state.
 */
export type ProviderEvent =
  | { type: 'DRAFT_WAITING'; at: number }
  | { type: 'DRAFT_STARTED'; at: number }
  | { type: 'DRAFT_PAUSED'; at: number }
  | { type: 'DRAFT_RESUMED'; at: number }
  | {
      type: 'ON_THE_CLOCK';
      at: number;
      round: number;
      pickInRound: number;
      overallPick: number;
      team: TeamRef;
      onDeck?: TeamRef | null;
    }
  | { type: 'CLOCK'; at: number; remainingMs: number | null; running: boolean; raw?: string }
  | { type: 'PICK_MADE'; at: number; pick: DraftPick }
  | { type: 'SNAPSHOT'; at: number; snapshot: DraftSnapshot }
  | { type: 'DRAFT_COMPLETE'; at: number }
  | { type: 'SYNC_STATUS'; at: number; status: Partial<SyncStatus> };

export type ProviderEventType = ProviderEvent['type'];
