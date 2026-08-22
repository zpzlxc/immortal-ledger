import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  createNewGame,
  parseSaveText,
} from './save';

const now = Date.parse('2026-01-01T00:00:00.000Z');

describe('save parsing', () => {
  it('round-trips a current save through the pure JSON parser', () => {
    const state = createNewGame('沈砚', [], undefined, [], now);
    state.story.worldFlags.push('example-flag');
    state.character.currentAction = {
      id: 'long-plan',
      type: 'meditate',
      startedAt: now,
      endsAt: now + 60 * 60_000,
      cycleDurationMinutes: 5,
      plannedCycles: 12,
      completedCycles: 2,
      batchProgress: {
        cultivation: 40,
        spiritStones: 0,
        herbs: 0,
        techniqueFragments: 0,
        physique: 0,
        comprehension: 0,
        spiritSense: 0,
        mentalState: 0,
        proficiency: 0,
      },
    };

    const parsed = parseSaveText(JSON.stringify(state));

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.story.worldFlags).toContain('example-flag');
    expect(parsed.character.name).toBe('沈砚');
    expect(parsed.character.currentAction?.plannedCycles).toBe(12);
    expect(parsed.character.currentAction?.completedCycles).toBe(2);
    expect(parsed.character.currentAction?.batchProgress?.cultivation).toBe(40);
  });

  it('migrates old saves with missing story and medicine fields', () => {
    const state = createNewGame('旧梦', [], undefined, [], now) as Partial<ReturnType<typeof createNewGame>>;
    state.schemaVersion = 11;
    delete state.story;
    if (state.inventory) delete (state.inventory as Partial<typeof state.inventory>).healingPills;

    const parsed = parseSaveText(JSON.stringify(state));

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.story.choiceHistory).toEqual([]);
    expect(parsed.inventory.healingPills).toBe(0);
  });

  it('rejects malformed and future-version saves', () => {
    expect(() => parseSaveText('{"inventory":{}}')).toThrow('存档缺少必要字段');
    const future = createNewGame('来者', [], undefined, [], now);
    future.schemaVersion = CURRENT_SCHEMA_VERSION + 1;
    expect(() => parseSaveText(JSON.stringify(future))).toThrow('来自更新版本');
  });
});
