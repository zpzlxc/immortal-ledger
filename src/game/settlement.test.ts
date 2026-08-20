import { describe, expect, it } from 'vitest';
import {
  BREAKTHROUGH_COST_SPIRIT_STONES,
  BREAKTHROUGH_FAILURE_COOLDOWN_MINUTES,
  MAX_OFFLINE_MINUTES,
  REAL_MINUTE_TO_GAME_DAYS,
} from './content';
import { createNewGame, normalizeGameState } from './save';
import {
  getBreakthroughStartError,
  getActionStartError,
  settleGame,
  startBreakthrough,
  startAction,
  treatInjury,
  tryBreakthrough,
} from './settlement';
import type { GameState } from './types';

const MINUTE_MS = 60_000;
const now = Date.parse('2026-01-01T00:00:00.000Z');

const createGame = () => createNewGame('沈砚', [], undefined, [], now);

describe('settlement rules', () => {
  it('settles a completed action once', () => {
    const active = startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const first = settleGame(active, now + 5 * MINUTE_MS, () => 0.99);

    expect(first.state.character.currentAction).toBeNull();
    expect(first.state.character.realm.cultivation).toBeGreaterThan(0);
    expect(first.newEntries).toHaveLength(1);

    const second = settleGame(first.state, now + 10 * MINUTE_MS, () => 0.99);

    expect(second.state.character.realm.cultivation).toBe(first.state.character.realm.cultivation);
    expect(second.newEntries).toHaveLength(0);
  });

  it('ages a character only while the current action is running', () => {
    const active = startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const ageBefore = active.character.ageDays;
    const settled = settleGame(active, now + 10 * 60 * MINUTE_MS, () => 0.99);

    expect(settled.state.character.ageDays - ageBefore).toBe(2.5);
  });

  it('caps active action aging at the offline settlement limit', () => {
    const active = startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    active.character.currentAction!.endsAt = now + 12 * 60 * MINUTE_MS;
    const ageBefore = active.character.ageDays;
    const settled = settleGame(active, now + 12 * 60 * MINUTE_MS, () => 0.99);

    expect(settled.state.character.ageDays - ageBefore).toBe(
      MAX_OFFLINE_MINUTES * REAL_MINUTE_TO_GAME_DAYS,
    );
  });

  it('does not grant resources when time moves backwards', () => {
    const state = createGame();
    const inventoryBefore = structuredClone(state.inventory);
    const settled = settleGame(state, now - MINUTE_MS, () => 0);

    expect(settled.state.inventory).toEqual(inventoryBefore);
    expect(settled.state.lastSettledAt).toBe(now - MINUTE_MS);
    expect(settled.newEntries[0]?.title).toBe('天机紊乱');
  });

  it('requires enough cultivation before attempting a breakthrough', () => {
    const state = createGame();
    const result = tryBreakthrough(state, now, () => 0);

    expect(result.state.character.realm).toEqual(state.character.realm);
    expect(result.newEntries).toHaveLength(0);
  });

  it('uses the injected random source for a successful breakthrough', () => {
    const state = createGame();
    state.character.realm.cultivation = state.character.realm.cultivationRequired;
    const result = tryBreakthrough(state, now, () => 0);

    expect(result.state.character.realm.stage).toBe(2);
    expect(result.state.character.realm.cultivation).toBe(0);
    expect(result.newEntries[0]?.tags).toContain('突破成功');
  });

  it('turns breakthrough into a timed action with a preparation cost', () => {
    const state = createGame();
    state.character.realm.cultivation = state.character.realm.cultivationRequired;
    const result = startBreakthrough(state, now, () => 0);

    expect(result.error).toBeUndefined();
    expect(result.state.inventory.spiritStones).toBe(30 - BREAKTHROUGH_COST_SPIRIT_STONES);
    expect(result.state.character.currentAction?.type).toBe('breakthrough');
    expect(result.state.character.currentAction?.endsAt).toBe(now + 30 * MINUTE_MS);
    expect(result.newEntries[0]?.tags).toContain(`灵石 -${BREAKTHROUGH_COST_SPIRIT_STONES}`);
  });

  it('applies a failure cooldown after the prepared breakthrough resolves', () => {
    const state = createGame();
    state.character.realm.cultivation = state.character.realm.cultivationRequired;
    const prepared = startBreakthrough(state, now, () => 0);
    const result = settleGame(prepared.state, now + 30 * MINUTE_MS, () => 0.99);

    expect(result.state.character.realm.stage).toBe(1);
    expect(result.state.character.breakthroughCooldownUntil).toBe(
      now + (30 + BREAKTHROUGH_FAILURE_COOLDOWN_MINUTES) * MINUTE_MS,
    );
    expect(result.newEntries[0]?.tags).toContain(`冲关冷却 ${BREAKTHROUGH_FAILURE_COOLDOWN_MINUTES} 分钟`);
    expect(getBreakthroughStartError(result.state, now + 31 * MINUTE_MS)).toContain('冲关余波未散');
  });

  it('opens the foundation path after the final qi-refining breakthrough', () => {
    const state = createGame();
    state.character.realm.stage = 12;
    state.character.realm.cultivation = state.character.realm.cultivationRequired;
    const prepared = startBreakthrough(state, now, () => 0);
    const result = settleGame(prepared.state, now + 30 * MINUTE_MS, () => 0);

    expect(result.state.character.realm.major).toBe('foundation_establishment');
    expect(result.newEntries.some((entry) => entry.title === '筑基新途')).toBe(true);
  });

  it('unlocks the foundation trial only after foundation establishment', () => {
    const locked = createGame();
    expect(getActionStartError(locked, 'foundation_trial')).toBe('筑基之后才能踏入试炼场。先继续修炼，跨过当前境界关隘。');

    const state = createGame();
    state.character.realm.major = 'foundation_establishment';
    const active = startAction(state, 'foundation_trial', now, 'qingstone-mountain', undefined, () => 0);
    const result = settleGame(active, now + 45 * MINUTE_MS, () => 0);

    expect(active.character.currentAction?.type).toBe('foundation_trial');
    expect(result.state.character.currentAction).toBeNull();
    expect(result.state.inventory.spiritStones).toBe(48);
    expect(result.state.inventory.techniqueFragments).toBe(1);
    expect(result.state.character.realm.cultivation).toBe(26);
    expect(result.newEntries[0]?.title).toBe('云外峰场归来');
  });

  it('rejects breakthrough preparation without enough spirit stones', () => {
    const state = createGame();
    state.character.realm.cultivation = state.character.realm.cultivationRequired;
    state.inventory.spiritStones = BREAKTHROUGH_COST_SPIRIT_STONES - 1;

    const result = startBreakthrough(state, now, () => 0);

    expect(result.error).toBe(`准备突破需要 ${BREAKTHROUGH_COST_SPIRIT_STONES} 枚灵石。`);
    expect(result.state.character.currentAction).toBeNull();
  });

  it('persists dangerous-action injuries and blocks overdrive while seriously injured', () => {
    const active = startAction(createGame(), 'overdrive', now, 'qingstone-mountain', undefined, () => 0);
    const settled = settleGame(active, now + 10 * MINUTE_MS, () => 0);

    expect(settled.state.character.injury?.severity).toBe(2);
    expect(settled.state.character.injury?.recoveryPoints).toBe(4);
    expect(settled.newEntries[0]?.tags.some((tag) => tag.startsWith('持续伤势'))).toBe(true);
    const severelyInjured = structuredClone(settled.state);
    severelyInjured.character.injury = {
      severity: 3,
      recoveryPoints: 6,
      source: 'overdrive',
      startedAt: now,
    };
    expect(getActionStartError(severelyInjured, 'overdrive')).toBe('重伤未愈，不能继续极限运功。先用平稳功课或灵草调养伤势。');
  });

  it('can leave persistent injuries through dangerous exploration and sect work', () => {
    const explorationState = createGame();
    explorationState.discoveredLocations.push('blackwind-valley');
    const exploration = settleGame(
      startAction(explorationState, 'explore', now, 'blackwind-valley', undefined, () => 0),
      now + 25 * MINUTE_MS,
      () => 0,
    );

    expect(exploration.state.character.injury?.source).toBe('exploration');

    const missionState = createGame();
    missionState.social.sect.sectId = 'qingxiao-sword-sect';
    const mission = settleGame(
      startAction(missionState, 'sect_mission', now, 'qingstone-mountain', 'qingxiao-escort', () => 0),
      now + 40 * MINUTE_MS,
      () => 0,
    );

    expect(mission.state.character.injury?.source).toBe('sect_mission');
  });

  it('recovers an injury through a safe cultivation action', () => {
    const state = createGame();
    state.character.injury = {
      severity: 1,
      recoveryPoints: 1,
      source: 'overdrive',
      startedAt: now,
    };
    const active = startAction(state, 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const settled = settleGame(active, now + 5 * MINUTE_MS, () => 0.99);

    expect(settled.state.character.injury).toBeNull();
    expect(settled.newEntries[0]?.tags).toContain('伤势痊愈');
  });

  it('reduces cultivation gains while an injury is healing', () => {
    const healthy = settleGame(
      startAction(createGame(), 'meditate', now, 'qingstone-mountain', undefined, () => 0),
      now + 5 * MINUTE_MS,
      () => 0.99,
    );
    const injuredState = createGame();
    injuredState.character.injury = {
      severity: 2,
      recoveryPoints: 5,
      source: 'exploration',
      startedAt: now,
    };
    const injured = settleGame(
      startAction(injuredState, 'meditate', now, 'qingstone-mountain', undefined, () => 0),
      now + 5 * MINUTE_MS,
      () => 0.99,
    );

    expect(healthy.state.character.realm.cultivation).toBe(20);
    expect(injured.state.character.realm.cultivation).toBe(16);
    expect(injured.state.character.injury?.recoveryPoints).toBe(4);
  });

  it('uses cave herbs to treat an injury', () => {
    const state = createGame();
    state.cave.unlocked = true;
    state.character.injury = {
      severity: 2,
      recoveryPoints: 4,
      source: 'exploration',
      startedAt: now,
    };
    state.inventory.herbs = 2;
    const result = treatInjury(state, now);

    expect(result.error).toBeUndefined();
    expect(result.state.inventory.herbs).toBe(0);
    expect(result.state.character.injury?.recoveryPoints).toBe(1);
    expect(result.newEntries[0]?.tags).toContain('恢复进度 +3');
  });

  it('ends the life when an action consumes the remaining lifespan', () => {
    const state = createGame();
    state.character.ageDays = state.character.lifespanDays - 1;
    const active = startAction(state, 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const settled = settleGame(active, now + 5 * MINUTE_MS, () => 0.99);

    expect(settled.state.lifeStatus).toBe('dead');
    expect(settled.state.lifeSummary?.deathReason).toBe('lifespan_exhausted');
    expect(settled.state.character.currentAction).toBeNull();
    expect(settled.newEntries.at(-1)?.category).toBe('death');
  });

  it('prevents invalid actions at the rules boundary', () => {
    const state = createGame();
    const active = startAction(state, 'meditate', now, 'qingstone-mountain', undefined, () => 0);
    const duplicate = startAction(active, 'insight', now + MINUTE_MS, 'qingstone-mountain', undefined, () => 0);
    const lockedExplore = startAction(state, 'explore', now, 'blackwind-valley', undefined, () => 0);

    expect(getActionStartError(active, 'insight')).toBe('你正在进行另一项行动。');
    expect(duplicate.character.currentAction).toEqual(active.character.currentAction);
    expect(lockedExplore.character.currentAction).toBeNull();
    expect(lockedExplore.ledger).toEqual(state.ledger);
  });

  it('migrates an older state with missing feature fields', () => {
    const legacy = createGame() as Partial<GameState>;
    delete legacy.cave;
    delete legacy.cultivationPath;
    delete legacy.social;
    delete legacy.pendingExplorationEvent;
    delete legacy.completedExplorationEventIds;
    delete (legacy.character as Partial<GameState['character']>).injury;
    delete (legacy.character as Partial<GameState['character']>).breakthroughCooldownUntil;

    const normalized = normalizeGameState(legacy as GameState);

    expect(normalized.schemaVersion).toBeGreaterThanOrEqual(9);
    expect(normalized.cave).toBeDefined();
    expect(normalized.cultivationPath).toBeDefined();
    expect(normalized.social).toBeDefined();
    expect(normalized.pendingExplorationEvent).toBeNull();
    expect(normalized.completedExplorationEventIds).toEqual([]);
    expect(normalized.character.injury).toBeNull();
    expect(normalized.character.breakthroughCooldownUntil).toBeNull();
  });
});
