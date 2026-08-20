import { SAVE_KEY, TALENTS } from './content';
import { createCave } from './cave';
import { EXPLORATION_EVENTS } from './exploration';
import { normalizeInjury } from './injury';
import { createSocialState, PERSON_EVENTS, RELATIONSHIPS, SECTS, getRelationshipStatus } from './people';
import {
  createCultivationPath,
  createTechniqueProgress,
  getTechniqueForSchool,
  TECHNIQUE_DEFINITIONS,
} from './techniques';
import type {
  CultivationSchoolId,
  DeathReason,
  ExplorationEventId,
  ExplorationLocationId,
  GameState,
  LedgerEntry,
  LegacyState,
  LifeSummary,
  PersonEventId,
  Realm,
} from './types';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const LOCATION_IDS: ExplorationLocationId[] = [
  'qingstone-mountain',
  'blackwind-valley',
  'nameless-well',
];

const isExplorationLocationId = (locationId: unknown): locationId is ExplorationLocationId =>
  typeof locationId === 'string' && LOCATION_IDS.includes(locationId as ExplorationLocationId);

export const createLegacyState = (): LegacyState => ({
  lifeCount: 0,
  discoveredLocations: [],
  techniqueFragments: 0,
  previousLifeNames: [],
});

const normalizeLegacyState = (input?: Partial<LegacyState>): LegacyState => ({
  lifeCount: Math.max(0, Number(input?.lifeCount) || 0),
  discoveredLocations: Array.from(new Set(
    (Array.isArray(input?.discoveredLocations) ? input.discoveredLocations : []).filter(
      isExplorationLocationId,
    ),
  )),
  techniqueFragments: Math.max(0, Math.min(3, Number(input?.techniqueFragments) || 0)),
  previousLifeNames: (Array.isArray(input?.previousLifeNames) ? input.previousLifeNames : [])
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .slice(-20),
});

const normalizeRealm = (input?: Partial<Realm>): Realm => ({
  major: input?.major === 'foundation_establishment' ? 'foundation_establishment' : 'qi_refining',
  stage: Math.max(1, Math.min(12, Number(input?.stage) || 1)),
  cultivation: Math.max(0, Number(input?.cultivation) || 0),
  cultivationRequired: Math.max(1, Number(input?.cultivationRequired) || 100),
});

const normalizeLifeSummary = (input?: Partial<LifeSummary>): LifeSummary | null => {
  if (!input) return null;
  const deathReason: DeathReason = input.deathReason === 'lifespan_exhausted'
    ? input.deathReason
    : 'lifespan_exhausted';
  return {
    lifeNumber: Math.max(1, Number(input.lifeNumber) || 1),
    characterName: String(input.characterName || '无名'),
    deathReason,
    endedAt: Number(input.endedAt) || Date.now(),
    ageDays: Math.max(0, Number(input.ageDays) || 0),
    lifespanDays: Math.max(1, Number(input.lifespanDays) || 1),
    realm: normalizeRealm(input.realm),
    discoveredLocationCount: Math.max(0, Number(input.discoveredLocationCount) || 0),
    discoveredRelationshipCount: Math.max(0, Number(input.discoveredRelationshipCount) || 0),
    sectId: input.sectId && input.sectId in SECTS ? input.sectId : null,
    keyEvents: (Array.isArray(input.keyEvents) ? input.keyEvents : [])
      .filter((event): event is string => typeof event === 'string')
      .slice(0, 8),
  };
};

export const createLedgerEntry = (
  category: LedgerEntry['category'],
  title: string,
  body: string,
  tags: string[],
  createdAt = Date.now(),
): LedgerEntry => ({
  id: createId(),
  createdAt,
  category,
  title,
  body,
  tags,
  read: false,
});

export const createNewGame = (
  name: string,
  talentIds: string[],
  legacyInput: LegacyState = createLegacyState(),
  pastLives: LifeSummary[] = [],
  now = Date.now(),
): GameState => {
  const selectedTalents = talentIds
    .map((id) => TALENTS.find((talent) => talent.id === id))
    .filter((talent): talent is (typeof TALENTS)[number] => Boolean(talent));
  const legacy = normalizeLegacyState(legacyInput);
  const discoveredLocations = Array.from(new Set([
    'qingstone-mountain' as const,
    ...legacy.discoveredLocations,
  ]));
  const openingEntry = legacy.lifeCount > 0
    ? createLedgerEntry(
      'system',
      '轮回初页',
      `你带着前世留下的一点微光重新落笔。这是第 ${legacy.lifeCount + 1} 世，长生簿仍记得你曾走过的路。`,
      ['轮回', `第${legacy.lifeCount + 1}世`],
      now,
    )
    : createLedgerEntry(
      'system',
      '长生簿初页',
      '你的名字落在一页尚未干透的墨迹上。此后每一次呼吸、每一个选择，都会成为这本簿册中的一行小字。',
      ['开始', '命运'],
      now,
    );

  return {
    schemaVersion: 9,
    lifeStatus: 'alive',
    lifeSummary: null,
    pastLives: pastLives
      .map((summary) => normalizeLifeSummary(summary))
      .filter((summary): summary is LifeSummary => Boolean(summary))
      .slice(-20),
    legacy,
    lastSettledAt: now,
    character: {
      id: createId(),
      name: name.trim() || '无名',
      createdAt: now,
      ageDays: 16 * 365,
      lifespanDays: 80 * 365,
      attributes: {
        physique: 10,
        comprehension: 10,
        spiritSense: 10,
        mentalState: 80,
        fortune: 10,
        karma: 0,
      },
      realm: {
        major: 'qi_refining',
        stage: 1,
        cultivation: 0,
        cultivationRequired: 100,
      },
      talents: selectedTalents,
      currentAction: null,
      injury: null,
      breakthroughCooldownUntil: null,
    },
    inventory: {
      spiritStones: 30,
      herbs: 3,
      techniqueFragments: legacy.techniqueFragments,
    },
    cave: createCave(now),
    cultivationPath: createCultivationPath(),
    social: createSocialState(),
    pendingExplorationEvent: null,
    completedExplorationEventIds: [],
    discoveredLocations,
    ledger: [openingEntry],
  };
};

const hasCompletedExploration = (state: GameState) =>
  state.ledger.some((entry) => entry.category === 'exploration');

export const normalizeGameState = (input: GameState): GameState => {
  const state = structuredClone(input);
  const now = Date.now();
  state.lifeStatus = input.lifeStatus === 'dead' ? 'dead' : 'alive';
  state.lifeSummary = normalizeLifeSummary(input.lifeSummary ?? undefined);
  state.pastLives = (Array.isArray(input.pastLives) ? input.pastLives : [])
    .map((summary) => normalizeLifeSummary(summary))
    .filter((summary): summary is LifeSummary => Boolean(summary))
    .slice(-20);
  state.legacy = normalizeLegacyState(input.legacy);
  if (state.lifeStatus === 'dead' && !state.lifeSummary) {
    state.lifeStatus = 'alive';
  }
  if (state.lifeStatus === 'dead') {
    state.character.currentAction = null;
  }
  state.character.injury = normalizeInjury(input.character.injury);
  const breakthroughCooldownUntil = Number(input.character.breakthroughCooldownUntil);
  state.character.breakthroughCooldownUntil = Number.isFinite(breakthroughCooldownUntil) && breakthroughCooldownUntil > 0
    ? breakthroughCooldownUntil
    : null;
  const legacyCave = input.cave;
  const shouldUnlockCave = Boolean(legacyCave?.unlocked || hasCompletedExploration(state));
  const initialCave = createCave(now, shouldUnlockCave);
  const cave = legacyCave ?? initialCave;

  state.schemaVersion = Math.max(9, Number(state.schemaVersion) || 1);
  state.cave = {
    ...initialCave,
    ...cave,
    unlocked: shouldUnlockCave,
    stored: {
      ...initialCave.stored,
      ...(cave.stored ?? {}),
    },
    buildings: {
      ...initialCave.buildings,
      ...(cave.buildings ?? {}),
    },
  };

  for (const building of Object.values(state.cave.buildings)) {
    building.level = Math.max(0, Math.min(3, Number(building.level) || 0));
  }
  state.cave.stored.cultivation = Math.max(0, Number(state.cave.stored.cultivation) || 0);
  state.cave.stored.herbs = Math.max(0, Number(state.cave.stored.herbs) || 0);
  state.cave.lastSettledAt = Number(state.cave.lastSettledAt) || now;

  const initialPath = createCultivationPath();
  const legacyPath = input.cultivationPath;
  const schoolIds: CultivationSchoolId[] = ['sword', 'alchemy', 'formation', 'soul'];
  const validSchoolId = schoolIds.includes(legacyPath?.schoolId as CultivationSchoolId)
    ? legacyPath?.schoolId as CultivationSchoolId
    : null;
  state.cultivationPath = {
    ...initialPath,
    ...(legacyPath ?? {}),
    schoolId: validSchoolId,
    techniques: {
      ...initialPath.techniques,
      ...(legacyPath?.techniques ?? {}),
    },
  };
  if (state.cultivationPath.schoolId) {
    const schoolTechnique = getTechniqueForSchool(state.cultivationPath.schoolId);
    if (schoolTechnique) {
      state.cultivationPath.activeTechniqueId = schoolTechnique.id;
      const existingProgress = state.cultivationPath.techniques[schoolTechnique.id];
      state.cultivationPath.techniques[schoolTechnique.id] = existingProgress ?? createTechniqueProgress(schoolTechnique);
    }
  } else {
    state.cultivationPath.activeTechniqueId = null;
  }
  for (const [techniqueId, progress] of Object.entries(state.cultivationPath.techniques)) {
    if (!(techniqueId in TECHNIQUE_DEFINITIONS)) {
      delete state.cultivationPath.techniques[techniqueId];
      continue;
    }
    progress.proficiency = Math.max(0, Math.min(100, Number(progress.proficiency) || 0));
    progress.unlockedBranchIds = Array.isArray(progress.unlockedBranchIds)
      ? progress.unlockedBranchIds
      : [];
    if (!progress.activeBranchId) {
      progress.activeBranchId = TECHNIQUE_DEFINITIONS[techniqueId as keyof typeof TECHNIQUE_DEFINITIONS].branches[0].id;
    }
    if (!progress.unlockedBranchIds.includes(progress.activeBranchId)) {
      progress.unlockedBranchIds.push(progress.activeBranchId);
    }
  }

  const initialSocial = createSocialState();
  const legacySocial = input.social;
  state.social = {
    ...initialSocial,
    ...(legacySocial ?? {}),
    relationships: {
      ...initialSocial.relationships,
      ...(legacySocial?.relationships ?? {}),
    },
    sect: {
      ...initialSocial.sect,
      ...(legacySocial?.sect ?? {}),
    },
    pendingPersonEvent: legacySocial?.pendingPersonEvent ?? null,
    completedPersonEventIds: Array.isArray(legacySocial?.completedPersonEventIds)
      ? legacySocial.completedPersonEventIds
      : [],
  };
  for (const relationshipId of Object.keys(RELATIONSHIPS) as Array<keyof typeof RELATIONSHIPS>) {
    const relationship = state.social.relationships[relationshipId] ?? initialSocial.relationships[relationshipId];
    relationship.affinity = Math.max(-100, Math.min(100, Number(relationship.affinity) || 0));
    relationship.interactionCount = Math.max(0, Number(relationship.interactionCount) || 0);
    relationship.status = getRelationshipStatus(relationship.affinity);
    relationship.discovered = Boolean(relationship.discovered);
    state.social.relationships[relationshipId] = relationship;
  }
  state.social.sect.sectId = state.social.sect.sectId && state.social.sect.sectId in SECTS
    ? state.social.sect.sectId
    : null;
  state.social.sect.invited = Boolean(state.social.sect.invited);
  state.social.sect.joinedAt = state.social.sect.joinedAt ? Number(state.social.sect.joinedAt) : null;
  state.social.sect.contribution = Math.max(0, Number(state.social.sect.contribution) || 0);
  state.social.sect.reputation = Math.max(0, Number(state.social.sect.reputation) || 0);
  state.social.completedPersonEventIds = state.social.completedPersonEventIds.filter(
    (eventId): eventId is PersonEventId => eventId in PERSON_EVENTS,
  );
  if (
    state.social.pendingPersonEvent &&
    !(state.social.pendingPersonEvent.eventId in PERSON_EVENTS)
  ) {
    state.social.pendingPersonEvent = null;
  }
  if (state.social.pendingPersonEvent) {
    state.social.pendingPersonEvent.createdAt = Number(state.social.pendingPersonEvent.createdAt) || now;
  }

  state.pendingExplorationEvent = input.pendingExplorationEvent ?? null;
  if (
    state.pendingExplorationEvent &&
    !(state.pendingExplorationEvent.eventId in EXPLORATION_EVENTS)
  ) {
    state.pendingExplorationEvent = null;
  }
  if (state.pendingExplorationEvent) {
    state.pendingExplorationEvent.createdAt = Number(state.pendingExplorationEvent.createdAt) || now;
  }
  state.completedExplorationEventIds = Array.isArray(input.completedExplorationEventIds)
    ? input.completedExplorationEventIds.filter(
      (eventId): eventId is ExplorationEventId => eventId in EXPLORATION_EVENTS,
    )
    : [];

  const discovered = new Set<ExplorationLocationId>(
    (state.discoveredLocations ?? []).filter(
      (locationId): locationId is ExplorationLocationId =>
        locationId === 'qingstone-mountain' ||
        locationId === 'blackwind-valley' ||
        locationId === 'nameless-well',
    ),
  );
  discovered.add('qingstone-mountain');
  if (hasCompletedExploration(state)) discovered.add('blackwind-valley');
  if (
    state.ledger.some(
      (entry) => entry.body.includes('黑风谷') || entry.title.includes('黑风谷'),
    )
  ) {
    discovered.add('nameless-well');
  }
  state.discoveredLocations = [...discovered];
  state.legacy.discoveredLocations = Array.from(new Set([
    ...state.legacy.discoveredLocations,
    ...state.discoveredLocations,
  ])).filter(isExplorationLocationId);
  return state;
};

export const loadGame = (): GameState | null => {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.character || !parsed.ledger || !parsed.inventory) return null;
    return normalizeGameState(parsed);
  } catch {
    return null;
  }
};

export const saveGame = (state: GameState) => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
};

export const startNextLife = (
  input: GameState,
  name: string,
  talentIds: string[],
  now = Date.now(),
): GameState => {
  const state = normalizeGameState(input);
  if (state.lifeStatus !== 'dead') return state;
  return createNewGame(name, talentIds, state.legacy, state.pastLives, now);
};

export const clearGame = () => {
  localStorage.removeItem(SAVE_KEY);
};

export const downloadSave = (state: GameState) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `长生簿-${state.character.name}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const parseSaveFile = (file: File): Promise<GameState> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GameState;
        if (!parsed.character || !parsed.ledger || !parsed.inventory) {
          throw new Error('存档缺少必要字段');
        }
        resolve(normalizeGameState(parsed));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('无法读取存档文件'));
    reader.readAsText(file);
  });
