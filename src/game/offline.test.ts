import { describe, expect, it } from 'vitest';
import { getOfflineSummary } from './offline';
import { createNewGame } from './save';
import { settleGame, startAction } from './settlement';

const MINUTE_MS = 60_000;
const now = Date.parse('2026-01-01T00:00:00.000Z');

const createGame = () => createNewGame('沈砚', [], undefined, [], now);

describe('offline summary rules', () => {
  it('summarizes a completed action and its resource changes', () => {
    const before = startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const settled = settleGame(before, now + 5 * MINUTE_MS, () => 0.99);
    const summary = getOfflineSummary(before, settled.state, now + 5 * MINUTE_MS);

    expect(summary?.elapsedMinutes).toBe(5);
    expect(summary?.completedAction).toBe('meditate');
    expect(summary?.resourceChanges.cultivation).toBeGreaterThan(0);
    expect(summary?.caveProduction).toEqual({ cultivation: 0, herbs: 0 });
  });

  it('reports cave production separately from carried resources', () => {
    const before = createGame();
    before.cave.unlocked = true;
    before.cave.buildings['spirit-gathering-array'].level = 1;
    before.cave.buildings['spirit-field'].level = 1;
    const after = settleGame(before, now + 2 * 60 * MINUTE_MS, () => 0.99).state;
    const summary = getOfflineSummary(before, after, now + 2 * 60 * MINUTE_MS);

    expect(summary?.completedAction).toBeNull();
    expect(summary?.caveProduction).toEqual({ cultivation: 4, herbs: 2 });
    expect(summary?.resourceChanges.herbs).toBe(0);
  });

  it('does not create a summary while an action is still running', () => {
    const before = startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const after = settleGame(before, now + 2 * MINUTE_MS, () => 0.99).state;

    expect(getOfflineSummary(before, after, now + 2 * MINUTE_MS)).toBeNull();
  });

  it('reports a long plan that ends early at a breakthrough gate', () => {
    const before = startAction(
      createGame(),
      'meditate',
      now,
      'qingstone-mountain',
      undefined,
      () => 0.99,
      4 * 60,
    );
    const after = settleGame(before, now + 60 * MINUTE_MS, () => 0.99).state;
    const summary = getOfflineSummary(before, after, now + 60 * MINUTE_MS);

    expect(after.character.currentAction).toBeNull();
    expect(summary?.completedAction).toBe('meditate');
    expect(summary?.resourceChanges.cultivation).toBe(100);
  });
});
