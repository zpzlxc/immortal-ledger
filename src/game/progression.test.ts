import { describe, expect, it } from 'vitest';
import { performCaveMastery } from './caveActions';
import { getOfflineLimitMinutes } from './cave';
import { getGoldenCoreEnding, recordLegacyProgress } from './legacy';
import { EXPLORATION_EVENTS } from './exploration';
import { createNewGame, startNextLife } from './save';
import { getActionStartError, settleGame, startCaveResearch, startGoldenCoreOrdeal } from './settlement';
import { TECHNIQUE_COMBINATIONS, createTechniqueProgress, TECHNIQUE_DEFINITIONS } from './techniques';

const MINUTE_MS = 60_000;
const now = Date.parse('2026-01-01T00:00:00.000Z');

const createGoldenCoreCandidate = () => {
  const state = createNewGame('照夜', [], undefined, [], now);
  state.character.realm = {
    major: 'foundation_establishment',
    stage: 4,
    cultivation: 600,
    cultivationRequired: 600,
  };
  state.story.foundationTrialCount = 3;
  state.inventory = { spiritStones: 100, herbs: 20, techniqueFragments: 10, healingPills: 0 };
  state.cultivationPath.schoolId = 'sword';
  state.cultivationPath.activeTechniqueId = 'wind-chasing-sword';
  state.cultivationPath.auxiliaryTechniqueId = 'star-pattern-manual';
  state.cultivationPath.techniques['wind-chasing-sword'] = createTechniqueProgress(TECHNIQUE_DEFINITIONS['wind-chasing-sword']);
  state.cultivationPath.techniques['star-pattern-manual'] = createTechniqueProgress(TECHNIQUE_DEFINITIONS['star-pattern-manual']);
  return state;
};

describe('long-term progression', () => {
  it('defines a distinct result for all six two-technique pairs', () => {
    const pairs = TECHNIQUE_COMBINATIONS.map((combination) => [...combination.techniqueIds].sort().join('+'));
    expect(TECHNIQUE_COMBINATIONS).toHaveLength(6);
    expect(new Set(pairs)).toHaveLength(6);
  });

  it('completes a life through the golden-core ordeal and records its path ending', () => {
    const candidate = createGoldenCoreCandidate();
    const started = startGoldenCoreOrdeal(candidate, now, () => 0).state;

    expect(started.inventory).toMatchObject({ spiritStones: 20, herbs: 8, techniqueFragments: 4 });
    const settled = settleGame(started, now + 60 * MINUTE_MS, () => 0);

    expect(settled.state.lifeStatus).toBe('dead');
    expect(settled.state.lifeSummary?.deathReason).toBe('golden_core_quest');
    expect(settled.state.lifeSummary?.endingId).toBe('dual-path-core');
    expect(settled.state.social.pendingPersonEvent).toBeNull();
    expect(settled.state.legacy.completedEndingIds).toContain('dual-path-core');
    expect(settled.state.legacy.techniqueCombinationIds).toContain('sword-formation-resonance');
    expect(settled.state.legacy.achievementIds).toContain('first-golden-core');
  });

  it('records cross-life achievements and applies their small next-life rewards', () => {
    const legacy = createGoldenCoreCandidate().legacy;
    legacy.achievementIds = [
      'first-golden-core',
      'all-locations',
      'three-sects',
      'all-golden-endings',
    ];

    const nextLife = createNewGame('留痕', [], legacy, [], now);

    expect(nextLife.inventory).toMatchObject({
      spiritStones: 35,
      herbs: 4,
      techniqueFragments: 1,
    });
  });

  it('requires trials and endgame resources before the golden-core ordeal', () => {
    const candidate = createGoldenCoreCandidate();
    candidate.story.foundationTrialCount = 2;
    expect(getActionStartError(candidate, 'golden_core_ordeal')).toContain('三次筑基试炼');
    candidate.story.foundationTrialCount = 3;
    candidate.inventory.spiritStones = 0;
    expect(getActionStartError(candidate, 'golden_core_ordeal')).toContain('叩问金丹需要');
  });

  it('derives distinct golden-core endings from conflict, sect, character story, and solitude', () => {
    const conflict = createGoldenCoreCandidate();
    conflict.cultivationPath.auxiliaryTechniqueId = 'guarding-one-meditation';
    expect(getGoldenCoreEnding(conflict)).toBe('discord-forged-core');

    const sect = createGoldenCoreCandidate();
    sect.cultivationPath.auxiliaryTechniqueId = null;
    sect.social.sect.sectId = 'qingxiao-sword-sect';
    sect.social.sect.positionId = 'sect-steward';
    expect(getGoldenCoreEnding(sect)).toBe('sect-dharma-core');

    const named = createGoldenCoreCandidate();
    named.cultivationPath.auxiliaryTechniqueId = null;
    named.social.completedPersonEventIds.push('nameless-well-ending');
    expect(getGoldenCoreEnding(named)).toBe('nameless-heart-core');

    const solitary = createGoldenCoreCandidate();
    solitary.cultivationPath.auxiliaryTechniqueId = null;
    expect(getGoldenCoreEnding(solitary)).toBe('solitary-golden-core');
  });

  it('applies the selected reincarnation boon to the next life', () => {
    const ended = settleGame(
      startGoldenCoreOrdeal(createGoldenCoreCandidate(), now, () => 0).state,
      now + 60 * MINUTE_MS,
      () => 0,
    ).state;
    const friendLife = startNextLife(ended, '故人', [], now + 61 * MINUTE_MS, 'old-friend-echo');
    const caveLife = startNextLife(ended, '归府', [], now + 61 * MINUTE_MS, 'cave-ember');
    const longLife = startNextLife(ended, '长夜', [], now + 61 * MINUTE_MS, 'long-watch-mark');

    expect(friendLife.social.relationships['lin-qiu']).toMatchObject({ discovered: true, affinity: 8 });
    expect(friendLife.social.relationships['xuan-song']).toMatchObject({ discovered: true, affinity: 8 });
    expect(caveLife.cave.unlocked).toBe(true);
    expect(caveLife.cave.buildings['spirit-gathering-array'].level).toBe(1);
    expect(getOfflineLimitMinutes(longLife)).toBe(20 * 60);
  });

  it('turns maxed cave buildings into repeatable resource sinks', () => {
    const state = createNewGame('守庐', [], undefined, [], now);
    state.cave.unlocked = true;
    state.cave.buildings['spirit-gathering-array'].level = 3;
    state.cave.buildings['spirit-field'].level = 3;
    state.cave.buildings['scripture-pavilion'].level = 3;
    state.inventory = { spiritStones: 200, herbs: 30, techniqueFragments: 10, healingPills: 0 };
    state.cultivationPath.schoolId = 'sword';
    state.cultivationPath.activeTechniqueId = 'wind-chasing-sword';
    state.cultivationPath.techniques['wind-chasing-sword'] = createTechniqueProgress(TECHNIQUE_DEFINITIONS['wind-chasing-sword']);

    const marrow = performCaveMastery(state, 'spirit-marrow', now).state;
    const years = performCaveMastery(marrow, 'years-herb', now).state;
    const script = performCaveMastery(years, 'merged-script', now).state;

    expect(script.character.realm.cultivation).toBe(60);
    expect(script.character.lifespanDays).toBe(81 * 365);
    expect(script.cultivationPath.techniques['wind-chasing-sword'].proficiency).toBe(12);
    expect(script.cave.mastery).toMatchObject({ spiritMarrowRefinements: 1, yearsHerbRituals: 1, mergedScriptDeductions: 1 });
  });

  it('grows the offline cap through a mastered cave and the long-watch boon', () => {
    const state = createNewGame('长夜', [], { ...createNewGame('引', [], undefined, [], now).legacy, activeBoonId: 'long-watch-mark' }, [], now);
    expect(getOfflineLimitMinutes(state)).toBe(20 * 60);
    state.cave.buildings['spirit-gathering-array'].level = 3;
    state.cave.buildings['spirit-field'].level = 3;
    state.cave.buildings['scripture-pavilion'].level = 3;
    expect(getOfflineLimitMinutes(state)).toBe(24 * 60);
  });

  it('uses the grown cap when settling cave production', () => {
    const legacy = createNewGame('引', [], undefined, [], now).legacy;
    const state = createNewGame('长夜', [], { ...legacy, activeBoonId: 'long-watch-mark' }, [], now);
    state.cave.unlocked = true;
    state.cave.buildings['spirit-gathering-array'].level = 1;

    const settled = settleGame(state, now + 20 * 60 * MINUTE_MS, () => 0.99).state;

    expect(settled.cave.stored.cultivation).toBe(40);
  });

  it('turns a maxed scripture pavilion into a staged research chain', () => {
    const state = createNewGame('藏卷', [], undefined, [], now);
    state.cave.unlocked = true;
    state.cave.buildings['scripture-pavilion'].level = 3;
    state.inventory = { spiritStones: 100, herbs: 20, techniqueFragments: 12, healingPills: 0 };

    const started = startCaveResearch(state, 'trace-atlas', now).state;
    expect(started.inventory).toMatchObject({ spiritStones: 82, herbs: 18, techniqueFragments: 10 });
    expect(started.character.currentAction).toMatchObject({ type: 'cave_research', researchId: 'trace-atlas' });

    const completed = settleGame(started, now + 45 * MINUTE_MS, () => 0.99).state;
    expect(completed.cave.research.completedIds).toContain('trace-atlas');
    expect(completed.story.worldFlags).toContain('cave-research:trace-atlas');
    expect(completed.inventory.techniqueFragments).toBe(12);
    expect(getActionStartError(completed, 'cave_research', 'qingstone-mountain', undefined, now, 'soul-annotation')).toBeNull();
  });

  it('carries meaningful choices into next-life exploration conditions', () => {
    const base = createNewGame('留名', [], undefined, [], now).legacy;
    const marked = recordLegacyProgress(base, {
      endingId: 'unfinished-page',
      deathReason: 'lifespan_exhausted',
      discoveredLocations: ['qingstone-mountain', 'blackwind-valley', 'nameless-well'],
      sectId: null,
      techniqueCombinationId: null,
      storyWorldFlags: [
        'exploration:qingstone-red-bell:climb-for-bell',
        'exploration:blackwind-broken-stele:read-the-stele',
        'person:nameless-well-ending:give-the-soul-a-name',
        'cave-research:soul-annotation',
      ],
    });
    const nextLife = createNewGame('回声', [], marked, [], now);

    expect(nextLife.legacy.storyMarks).toEqual(expect.arrayContaining(['bell-taken', 'stele-repaired', 'named-soul', 'annotated-soul']));
    expect(EXPLORATION_EVENTS['qingstone-inherited-bell'].condition?.(nextLife)).toBe(true);
    expect(EXPLORATION_EVENTS['blackwind-inherited-stele'].condition?.(nextLife)).toBe(true);
    expect(EXPLORATION_EVENTS['nameless-returning-name'].condition?.(nextLife)).toBe(true);
  });
});
