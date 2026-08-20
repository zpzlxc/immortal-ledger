import { ACTIONS } from './content';
import { getExplorationLocation } from './exploration';
import { getSectEffects } from './people';
import type { ActionType, CaveBuildingId, CaveState, ExplorationLocationId, SectId } from './types';

export const CAVE_MAX_LEVEL = 3;
export const CAVE_PRODUCTION_INTERVAL_MINUTES = 60;
export const CAVE_MAX_OFFLINE_MINUTES = 8 * 60;

export const CAVE_BUILDINGS: Record<
  CaveBuildingId,
  {
    label: string;
    icon: string;
    description: string;
    effect: string;
  }
> = {
  'spirit-gathering-array': {
    label: '聚灵阵',
    icon: '◎',
    description: '牵引洞府周围的灵气，离线时积攒修为，也会提高日常修炼收益。',
    effect: '每级每小时积攒 2 点修为，修炼收益提高 8%。',
  },
  'spirit-field': {
    label: '灵田',
    icon: '田',
    description: '将灵脉余气化作适合培植灵草的土壤，定时产出基础材料。',
    effect: '每级每小时产出 1 株灵草。',
  },
  'scripture-pavilion': {
    label: '藏经阁',
    icon: '卷',
    description: '整理功法残页，减少研读残卷所需的时间。',
    effect: '每级使研读残卷时间减少 2 分钟。',
  },
};

const UPGRADE_COSTS: Record<
  CaveBuildingId,
  Array<{ spiritStones: number; herbs: number }>
> = {
  'spirit-gathering-array': [
    { spiritStones: 20, herbs: 1 },
    { spiritStones: 35, herbs: 2 },
    { spiritStones: 55, herbs: 4 },
  ],
  'spirit-field': [
    { spiritStones: 15, herbs: 2 },
    { spiritStones: 30, herbs: 3 },
    { spiritStones: 50, herbs: 5 },
  ],
  'scripture-pavilion': [
    { spiritStones: 18, herbs: 1 },
    { spiritStones: 32, herbs: 2 },
    { spiritStones: 50, herbs: 4 },
  ],
};

const createEmptyBuildings = () => ({
  'spirit-gathering-array': { level: 0 },
  'spirit-field': { level: 0 },
  'scripture-pavilion': { level: 0 },
});

export const createCave = (now = Date.now(), unlocked = false): CaveState => ({
  unlocked,
  lastSettledAt: now,
  stored: {
    cultivation: 0,
    herbs: 0,
  },
  buildings: createEmptyBuildings(),
});

export const getUpgradeCost = (buildingId: CaveBuildingId, nextLevel: number) => {
  if (nextLevel < 1 || nextLevel > CAVE_MAX_LEVEL) return null;
  return UPGRADE_COSTS[buildingId][nextLevel - 1];
};

export const getCaveEffects = (cave: CaveState) => ({
  gatheringLevel: cave.buildings['spirit-gathering-array'].level,
  fieldLevel: cave.buildings['spirit-field'].level,
  pavilionLevel: cave.buildings['scripture-pavilion'].level,
  cultivationMultiplier: 1 + cave.buildings['spirit-gathering-array'].level * 0.08,
  cultivationPerHour: cave.buildings['spirit-gathering-array'].level * 2,
  herbsPerHour: cave.buildings['spirit-field'].level,
  studyDurationMinutes: Math.max(
    10,
    20 - cave.buildings['scripture-pavilion'].level * 2,
  ),
});

export const getCaveProduction = (cave: CaveState) => {
  const effects = getCaveEffects(cave);
  return {
    cultivation: effects.cultivationPerHour,
    herbs: effects.herbsPerHour,
  };
};

export const getActionDurationMinutes = (
  actionType: ActionType,
  cave: CaveState,
  locationId?: ExplorationLocationId,
  sectId: SectId | null = null,
) => {
  if (actionType === 'explore') return getExplorationLocation(locationId).durationMinutes;
  if (actionType !== 'study') return ACTIONS[actionType].durationMinutes;
  return Math.max(
    5,
    getCaveEffects(cave).studyDurationMinutes - getSectEffects(sectId).studyDurationReduction,
  );
};

export const settleCave = (input: CaveState, now = Date.now()) => {
  const cave = structuredClone(input);
  if (!cave.unlocked) {
    cave.lastSettledAt = now;
    return { cave, produced: { cultivation: 0, herbs: 0 } };
  }

  const elapsedMs = Math.max(0, now - cave.lastSettledAt);
  const cappedElapsedMs = Math.min(
    elapsedMs,
    CAVE_MAX_OFFLINE_MINUTES * 60_000,
  );
  const intervals = Math.floor(
    cappedElapsedMs / (CAVE_PRODUCTION_INTERVAL_MINUTES * 60_000),
  );
  const production = getCaveProduction(cave);
  const produced = {
    cultivation: intervals * production.cultivation,
    herbs: intervals * production.herbs,
  };

  cave.stored.cultivation += produced.cultivation;
  cave.stored.herbs += produced.herbs;

  const hasProduction = production.cultivation > 0 || production.herbs > 0;
  if (elapsedMs > cappedElapsedMs || !hasProduction) {
    cave.lastSettledAt = now;
  } else {
    cave.lastSettledAt += intervals * CAVE_PRODUCTION_INTERVAL_MINUTES * 60_000;
  }

  return { cave, produced };
};
