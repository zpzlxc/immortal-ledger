import { describe, expect, it } from 'vitest';
import {
  BREAKTHROUGH_COST_SPIRIT_STONES,
  BREAKTHROUGH_FAILURE_COOLDOWN_MINUTES,
  MAX_OFFLINE_MINUTES,
  REAL_MINUTE_TO_GAME_DAYS,
  SECT_DEFECTION_COOLDOWN_MINUTES,
} from './content';
import { createNewGame, normalizeGameState } from './save';
import { getWorldCycle } from './exploration';
import {
  craftHealingPill,
  getBreakthroughStartError,
  getActionStartError,
  defectSect,
  joinSect,
  promoteSectPosition,
  settleGame,
  resolveExplorationEvent,
  resolvePersonEvent,
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
  it('runs a long cultivation plan as ordinary cycles and stops at the breakthrough gate', () => {
    const active = startAction(
      createGame(),
      'meditate',
      now,
      'qingstone-mountain',
      undefined,
      () => 0.99,
      4 * 60,
    );

    expect(active.character.currentAction?.plannedCycles).toBe(48);
    expect(active.character.currentAction?.endsAt).toBe(now + 4 * 60 * MINUTE_MS);

    const settled = settleGame(active, now + 4 * 60 * MINUTE_MS, () => 0.99);

    expect(settled.state.character.currentAction).toBeNull();
    expect(settled.state.character.realm.cultivation).toBe(100);
    expect(settled.newEntries).toHaveLength(1);
    expect(settled.newEntries[0]?.title).toContain('提前出关');
    expect(settled.newEntries[0]?.tags).toContain('完成 5 轮');
    expect(settled.newEntries[0]?.tags).toContain('修为 +100');
  });

  it('keeps a long plan active between cycles and writes one summary at the end', () => {
    const active = startAction(
      createGame(),
      'insight',
      now,
      'qingstone-mountain',
      undefined,
      () => 0.99,
      60,
    );
    const partial = settleGame(active, now + 24 * MINUTE_MS, () => 0.99);

    expect(partial.state.character.currentAction?.completedCycles).toBe(2);
    expect(partial.state.character.attributes.comprehension).toBe(12);
    expect(partial.newEntries).toHaveLength(0);

    const completed = settleGame(partial.state, now + 60 * MINUTE_MS, () => 0.99);

    expect(completed.state.character.currentAction).toBeNull();
    expect(completed.state.character.attributes.comprehension).toBe(15);
    expect(completed.newEntries).toHaveLength(1);
    expect(completed.newEntries[0]?.tags).toContain('完成 5 轮');
    expect(completed.newEntries[0]?.tags).toContain('悟性 +5');
  });

  it('pauses continuous study when a person event needs a response', () => {
    const state = createGame();
    state.cultivationPath.schoolId = 'sword';
    const active = startAction(
      state,
      'study',
      now,
      'qingstone-mountain',
      undefined,
      () => 0.99,
      4 * 60,
    );
    const settled = settleGame(active, now + 4 * 60 * MINUTE_MS, () => 0.99);

    expect(settled.state.character.currentAction).toBeNull();
    expect(settled.state.social.pendingPersonEvent?.eventId).toBe('xuan-song-lesson');
    expect(settled.newEntries.some((entry) => entry.title.includes('提前出关'))).toBe(true);
    expect(settled.newEntries.some((entry) => entry.title === '人物事件：松下三问')).toBe(true);
  });

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

  it('continues the nameless soul story across three foundation trials', () => {
    const state = createGame();
    state.character.realm.major = 'foundation_establishment';
    state.social.relationships['nameless-soul'].affinity = 15;
    state.social.completedPersonEventIds = ['nameless-well-soul', 'nameless-well-echo'];

    const first = settleGame(
      startAction(state, 'foundation_trial', now, 'qingstone-mountain', undefined, () => 0),
      now + 45 * MINUTE_MS,
      () => 0.99,
    );
    expect(first.state.social.pendingPersonEvent?.eventId).toBe('nameless-well-oath');

    const oath = resolvePersonEvent(first.state, 'carry-soul-lantern', now + 45 * MINUTE_MS);
    const second = settleGame(
      startAction(oath.state, 'foundation_trial', now + 45 * MINUTE_MS, 'qingstone-mountain', undefined, () => 0),
      now + 90 * MINUTE_MS,
      () => 0.99,
    );
    expect(second.state.social.pendingPersonEvent?.eventId).toBe('nameless-well-gate');

    const gate = resolvePersonEvent(second.state, 'open-soul-gate', now + 90 * MINUTE_MS);
    const third = settleGame(
      startAction(gate.state, 'foundation_trial', now + 90 * MINUTE_MS, 'qingstone-mountain', undefined, () => 0),
      now + 135 * MINUTE_MS,
      () => 0.99,
    );
    expect(third.state.social.pendingPersonEvent?.eventId).toBe('nameless-well-ending');

    const ending = resolvePersonEvent(third.state, 'give-the-soul-a-name', now + 135 * MINUTE_MS);
    expect(ending.error).toBeUndefined();
    expect(ending.state.social.completedPersonEventIds).toContain('nameless-well-ending');
    expect(ending.state.inventory.techniqueFragments).toBe(12);
    expect(ending.state.character.realm.cultivation).toBe(158);
    expect(ending.newEntries[0]?.title).toContain('替它写下一个名字');
  });

  it('opens a different sect story after the first follow-up mission', () => {
    const cases = [
      { sectId: 'qingxiao-sword-sect' as const, missionId: 'qingxiao-patrol' as const, eventId: 'qingxiao-sword-trial' as const, choiceId: 'guard-the-sword-blank' },
      { sectId: 'baicao-valley' as const, missionId: 'baicao-gathering' as const, eventId: 'baicao-valley-oath' as const, choiceId: 'record-the-medicine' },
      { sectId: 'tianji-pavilion' as const, missionId: 'tianji-star-chart' as const, eventId: 'tianji-pavilion-star-chart' as const, choiceId: 'leave-the-blank' },
    ];

    for (const testCase of cases) {
      const state = createGame();
      state.social.sect.sectId = testCase.sectId;
      state.social.relationships['xuan-song'].affinity = 20;
      state.social.completedPersonEventIds = ['xuan-song-lesson', 'xuan-song-mountain-gate'];
      const settled = settleGame(
        startAction(state, 'sect_mission', now, 'qingstone-mountain', testCase.missionId, () => 0),
        now + 120 * MINUTE_MS,
        () => 0.99,
      );

      expect(settled.state.social.pendingPersonEvent?.eventId).toBe(testCase.eventId);
      const resolved = resolvePersonEvent(settled.state, testCase.choiceId, now + 120 * MINUTE_MS);
      expect(resolved.error).toBeUndefined();
      expect(resolved.newEntries[0]?.tags.some((tag) => tag.startsWith('宗门贡献'))).toBe(true);
    }
  });

  it('promotes sect positions and makes defection costly before rejoining', () => {
    const state = createGame();
    state.social.sect.sectId = 'qingxiao-sword-sect';
    state.social.sect.invited = true;
    state.social.sect.positionId = 'outer-disciple';
    state.social.sect.reputation = 60;
    state.social.sect.contribution = 12;

    const inner = promoteSectPosition(state, now);
    expect(inner.error).toBeUndefined();
    expect(inner.state.social.sect.positionId).toBe('inner-disciple');
    expect(inner.state.social.sect.contribution).toBe(6);

    inner.state.social.sect.reputation = 120;
    inner.state.social.sect.contribution = 30;
    const steward = promoteSectPosition(inner.state, now + MINUTE_MS);
    expect(steward.error).toBeUndefined();
    expect(steward.state.social.sect.positionId).toBe('sect-steward');
    expect(steward.state.social.sect.contribution).toBe(15);

    const mission = settleGame(
      startAction(steward.state, 'sect_mission', now + 2 * MINUTE_MS, 'qingstone-mountain', 'qingxiao-patrol', () => 0),
      now + 30 * MINUTE_MS,
      () => 0.99,
    );
    expect(mission.state.social.sect.contribution).toBe(21);

    mission.state.character.attributes.karma = 5;
    mission.state.character.attributes.fortune = 5;
    const defected = defectSect(mission.state, now + 31 * MINUTE_MS);
    expect(defected.error).toBeUndefined();
    expect(defected.state.social.sect.sectId).toBeNull();
    expect(defected.state.social.sect.positionId).toBeNull();
    expect(defected.state.social.sect.reputation).toBe(0);
    expect(defected.state.social.sect.contribution).toBe(0);
    expect(defected.state.social.sect.defectionCount).toBe(1);
    expect(defected.state.social.sect.cooldownUntil).toBe(
      now + (31 + SECT_DEFECTION_COOLDOWN_MINUTES) * MINUTE_MS,
    );
    expect(defected.state.character.attributes.karma).toBe(3);
    expect(defected.state.character.attributes.fortune).toBe(4);

    const tooSoon = joinSect(defected.state, 'baicao-valley', now + 32 * MINUTE_MS);
    expect(tooSoon.error).toContain('叛门余波未散');
    const rejoined = joinSect(
      defected.state,
      'baicao-valley',
      now + (31 + SECT_DEFECTION_COOLDOWN_MINUTES) * MINUTE_MS,
    );
    expect(rejoined.error).toBeUndefined();
    expect(rejoined.state.social.sect.positionId).toBe('outer-disciple');
  });

  it('supports conditional and repeatable exploration events across changing skies', () => {
    const repeatableState = createGame();
    repeatableState.social.completedPersonEventIds = ['lin-qiu-caravan', 'lin-qiu-ledger'];
    repeatableState.completedExplorationEventIds = ['qingstone-red-bell', 'qingstone-fox-path'];
    expect(getWorldCycle(repeatableState).seasonId).toBe('spring');
    expect(getWorldCycle(repeatableState).weatherId).toBe('rain');
    const repeatableSettled = settleGame(
      startAction(repeatableState, 'explore', now, 'qingstone-mountain', undefined, () => 0.1),
      now + 15 * MINUTE_MS,
      () => 0.1,
    );

    expect(repeatableSettled.state.pendingExplorationEvent?.eventId).toBe('qingstone-spring-rain');
    const repeatableResolved = resolveExplorationEvent(
      repeatableSettled.state,
      'drink-spring-rain',
      now + 15 * MINUTE_MS,
    );
    expect(repeatableResolved.error).toBeUndefined();
    expect(repeatableResolved.state.completedExplorationEventIds).not.toContain('qingstone-spring-rain');
    expect(repeatableResolved.state.lastExplorationEventId).toBe('qingstone-spring-rain');

    const conditionalState = createGame();
    conditionalState.social.completedPersonEventIds = ['lin-qiu-caravan', 'lin-qiu-ledger'];
    conditionalState.character.attributes.physique = 12;
    conditionalState.completedExplorationEventIds = [
      'qingstone-red-bell',
      'qingstone-fox-path',
      'qingstone-spring-rain',
      'qingstone-star-moth',
    ];
    conditionalState.lastExplorationEventId = 'qingstone-spring-rain';
    const conditionalSettled = settleGame(
      startAction(conditionalState, 'explore', now, 'qingstone-mountain', undefined, () => 0.1),
      now + 15 * MINUTE_MS,
      () => 0.1,
    );

    expect(conditionalSettled.state.pendingExplorationEvent?.eventId).toBe('qingstone-root-script');

    const nextSkyState = repeatableResolved.state;
    nextSkyState.character.ageDays = 16 * 365 - 50;
    const starfallSettled = settleGame(
      startAction(nextSkyState, 'explore', now + 20 * MINUTE_MS, 'qingstone-mountain', undefined, () => 0.1),
      now + 35 * MINUTE_MS,
      () => 0.1,
    );
    expect(starfallSettled.state.pendingExplorationEvent?.eventId).toBe('qingstone-star-moth');
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
    delete legacy.lastExplorationEventId;
    delete (legacy.character as Partial<GameState['character']>).injury;
    delete (legacy.character as Partial<GameState['character']>).breakthroughCooldownUntil;

    const normalized = normalizeGameState(legacy as GameState);

    expect(normalized.schemaVersion).toBeGreaterThanOrEqual(11);
    expect(normalized.cave).toBeDefined();
    expect(normalized.cultivationPath).toBeDefined();
    expect(normalized.social).toBeDefined();
    expect(normalized.pendingExplorationEvent).toBeNull();
    expect(normalized.completedExplorationEventIds).toEqual([]);
    expect(normalized.lastExplorationEventId).toBeNull();
    expect(normalized.character.injury).toBeNull();
    expect(normalized.character.breakthroughCooldownUntil).toBeNull();
  });

  it('stops progression at foundation completion instead of creating hidden stages', () => {
    const state = createGame();
    state.character.realm = {
      major: 'foundation_establishment',
      stage: 4,
      cultivation: 500,
      cultivationRequired: 500,
    };

    expect(getBreakthroughStartError(state, now)).toContain('尚未开放金丹境');
  });

  it('does not inherit this-life locations until the life ends', () => {
    const state = createGame();
    state.discoveredLocations = ['qingstone-mountain', 'blackwind-valley', 'nameless-well'];

    const normalized = normalizeGameState(state);

    expect(normalized.legacy.discoveredLocations).toEqual([]);
  });

  it('records choices structurally so later stories can react to them', () => {
    const state = createGame();
    state.pendingExplorationEvent = { eventId: 'qingstone-red-bell', createdAt: now };

    const resolved = resolveExplorationEvent(state, 'climb-for-bell', now);

    expect(resolved.state.story.choiceHistory.at(-1)).toMatchObject({
      kind: 'exploration',
      eventId: 'qingstone-red-bell',
      choiceId: 'climb-for-bell',
    });
    expect(resolved.state.story.worldFlags).toContain('exploration:qingstone-red-bell:climb-for-bell');
  });

  it('opens Cloudbreak Ridge after three foundation trials', () => {
    let state = createGame();
    state.character.realm.major = 'foundation_establishment';
    for (let index = 0; index < 3; index += 1) {
      const startedAt = now + index * 45 * MINUTE_MS;
      state = settleGame(
        startAction(state, 'foundation_trial', startedAt, 'qingstone-mountain', undefined, () => 0),
        startedAt + 45 * MINUTE_MS,
        () => 0.99,
      ).state;
    }

    expect(state.story.foundationTrialCount).toBe(3);
    expect(state.discoveredLocations).toContain('cloudbreak-ridge');
    expect(state.story.worldFlags).toContain('foundation-cloud-path-open');
  });

  it('turns cave resources into a stored healing pill', () => {
    const state = createGame();
    state.cave.unlocked = true;
    state.inventory.herbs = 4;
    state.inventory.spiritStones = 6;

    const crafted = craftHealingPill(state, now);

    expect(crafted.error).toBeUndefined();
    expect(crafted.state.inventory).toMatchObject({ herbs: 0, spiritStones: 0, healingPills: 1 });
    expect(crafted.newEntries[0]?.tags).toContain('养脉丹 +1');

    crafted.state.character.injury = { severity: 3, recoveryPoints: 8, source: 'exploration', startedAt: now };
    const treated = treatInjury(crafted.state, now, 'pill');
    expect(treated.state.inventory.healingPills).toBe(0);
    expect(treated.state.character.injury?.recoveryPoints).toBe(2);
    expect(treated.newEntries[0]?.tags).toContain('恢复进度 +6');
  });

  it('uses upgraded cave buildings as a medicine-production combination', () => {
    const state = createGame();
    state.cave.unlocked = true;
    state.cave.buildings['spirit-gathering-array'].level = 2;
    state.cave.buildings['spirit-field'].level = 2;
    state.inventory.herbs = 4;
    state.inventory.spiritStones = 6;

    const crafted = craftHealingPill(state, now);

    expect(crafted.state.inventory.healingPills).toBe(2);
    expect(crafted.newEntries[0]?.tags).toContain('洞府组合生效');
  });

  it('can end a life when another dangerous action pushes an injury past its limit', () => {
    const state = createGame();
    state.discoveredLocations.push('blackwind-valley');
    state.character.injury = { severity: 2, recoveryPoints: 9, source: 'exploration', startedAt: now };

    const settled = settleGame(
      startAction(state, 'explore', now, 'blackwind-valley', undefined, () => 0),
      now + 25 * MINUTE_MS,
      () => 0,
    );

    expect(settled.state.lifeStatus).toBe('dead');
    expect(settled.state.lifeSummary?.deathReason).toBe('fatal_injury');
    expect(settled.newEntries.at(-1)?.category).toBe('death');
  });
});
