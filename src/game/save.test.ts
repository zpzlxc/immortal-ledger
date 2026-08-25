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
    if (state.legacy) delete (state.legacy as Partial<typeof state.legacy>).storyMarks;
    if (state.cave) delete (state.cave as Partial<typeof state.cave>).research;

    const parsed = parseSaveText(JSON.stringify(state));

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.story.choiceHistory).toEqual([]);
    expect(parsed.inventory.healingPills).toBe(0);
    expect(parsed.legacy.completedEndingIds).toEqual([]);
    expect(parsed.legacy.visitedSectIds).toEqual([]);
    expect(parsed.legacy.techniqueCombinationIds).toEqual([]);
    expect(parsed.legacy.achievementIds).toEqual([]);
    expect(parsed.legacy.storyMarks).toEqual([]);
    expect(parsed.cave.research).toEqual({ completedIds: [] });
  });

  it('keeps a legacy main technique and initializes the auxiliary slot', () => {
    const state = createNewGame('旧功', [], undefined, [], now);
    state.cultivationPath.schoolId = 'sword';
    state.cultivationPath.activeTechniqueId = 'wind-chasing-sword';
    state.cultivationPath.techniques['wind-chasing-sword'] = {
      proficiency: 30,
      activeBranchId: 'listen-wind',
      unlockedBranchIds: ['listen-wind'],
    };
    const legacy = JSON.parse(JSON.stringify(state));
    legacy.schemaVersion = 13;
    delete legacy.cultivationPath.auxiliaryTechniqueId;

    const parsed = parseSaveText(JSON.stringify(legacy));

    expect(parsed.cultivationPath.activeTechniqueId).toBe('wind-chasing-sword');
    expect(parsed.cultivationPath.auxiliaryTechniqueId).toBeNull();
    expect(parsed.cultivationPath.techniques['wind-chasing-sword']?.proficiency).toBe(30);
  });

  it('clamps foundation stages and initializes legacy boon and cave mastery fields', () => {
    const state = createNewGame('旧境', [], undefined, [], now);
    state.character.realm.major = 'foundation_establishment';
    state.character.realm.stage = 12;
    const legacy = JSON.parse(JSON.stringify(state));
    legacy.schemaVersion = 14;
    delete legacy.legacy.activeBoonId;
    delete legacy.cave.mastery;

    const parsed = parseSaveText(JSON.stringify(legacy));

    expect(parsed.character.realm.stage).toBe(4);
    expect(parsed.legacy.activeBoonId).toBeNull();
    expect(parsed.cave.mastery).toEqual({
      spiritMarrowRefinements: 0,
      yearsHerbRituals: 0,
      mergedScriptDeductions: 0,
    });
  });

  it('rejects malformed and future-version saves', () => {
    expect(() => parseSaveText('{"inventory":{}}')).toThrow('存档缺少必要字段');
    const future = createNewGame('来者', [], undefined, [], now);
    future.schemaVersion = CURRENT_SCHEMA_VERSION + 1;
    expect(() => parseSaveText(JSON.stringify(future))).toThrow('来自更新版本');
  });
});
