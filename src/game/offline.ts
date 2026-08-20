import { MAX_OFFLINE_MINUTES } from './content';
import type { ActionType, GameState } from './types';

const MINUTE_MS = 60_000;

export type OfflineSummary = {
  elapsedMinutes: number;
  capped: boolean;
  completedAction: ActionType | null;
  resourceChanges: {
    cultivation: number;
    spiritStones: number;
    herbs: number;
    techniqueFragments: number;
  };
  caveProduction: {
    cultivation: number;
    herbs: number;
  };
};

const getStoredValue = (state: GameState, key: 'cultivation' | 'herbs') =>
  state.cave?.stored?.[key] ?? 0;

export const getOfflineSummary = (
  before: GameState,
  after: GameState,
  now: number,
): OfflineSummary | null => {
  const elapsedMs = now - before.lastSettledAt;
  if (elapsedMs <= 0) return null;

  const previousAction = before.character.currentAction;
  const completedAction = previousAction &&
    !after.character.currentAction &&
    now >= previousAction.endsAt
    ? previousAction.type
    : null;
  const caveProduction = {
    cultivation: Math.max(0, getStoredValue(after, 'cultivation') - getStoredValue(before, 'cultivation')),
    herbs: Math.max(0, getStoredValue(after, 'herbs') - getStoredValue(before, 'herbs')),
  };

  if (!completedAction && caveProduction.cultivation <= 0 && caveProduction.herbs <= 0) {
    return null;
  }

  const cappedElapsedMs = Math.min(elapsedMs, MAX_OFFLINE_MINUTES * MINUTE_MS);
  return {
    elapsedMinutes: Math.max(1, Math.floor(cappedElapsedMs / MINUTE_MS)),
    capped: elapsedMs > cappedElapsedMs,
    completedAction,
    resourceChanges: {
      cultivation: after.character.realm.cultivation - before.character.realm.cultivation,
      spiritStones: after.inventory.spiritStones - before.inventory.spiritStones,
      herbs: after.inventory.herbs - before.inventory.herbs,
      techniqueFragments: after.inventory.techniqueFragments - before.inventory.techniqueFragments,
    },
    caveProduction,
  };
};
