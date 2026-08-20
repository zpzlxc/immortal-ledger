import { SAVE_KEY, TALENTS } from './content';
import { createCave } from './cave';
import { createSocialState, PERSON_EVENTS, RELATIONSHIPS, SECTS, getRelationshipStatus } from './people';
import {
  createCultivationPath,
  createTechniqueProgress,
  getTechniqueForSchool,
  TECHNIQUE_DEFINITIONS,
} from './techniques';
import type {
  CultivationSchoolId,
  ExplorationLocationId,
  GameState,
  LedgerEntry,
  PersonEventId,
} from './types';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

export const createNewGame = (name: string, talentIds: string[]): GameState => {
  const selectedTalents = talentIds
    .map((id) => TALENTS.find((talent) => talent.id === id))
    .filter((talent): talent is (typeof TALENTS)[number] => Boolean(talent));
  const now = Date.now();

  return {
    schemaVersion: 5,
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
    },
    inventory: {
      spiritStones: 30,
      herbs: 3,
      techniqueFragments: 0,
    },
    cave: createCave(now),
    cultivationPath: createCultivationPath(),
    social: createSocialState(),
    discoveredLocations: ['qingstone-mountain'],
    ledger: [
      createLedgerEntry(
        'system',
        '长生簿初页',
        '你的名字落在一页尚未干透的墨迹上。此后每一次呼吸、每一个选择，都会成为这本簿册中的一行小字。',
        ['开始', '命运'],
        now,
      ),
    ],
  };
};

const hasCompletedExploration = (state: GameState) =>
  state.ledger.some((entry) => entry.category === 'exploration');

export const normalizeGameState = (input: GameState): GameState => {
  const state = structuredClone(input);
  const now = Date.now();
  const legacyCave = input.cave;
  const shouldUnlockCave = Boolean(legacyCave?.unlocked || hasCompletedExploration(state));
  const initialCave = createCave(now, shouldUnlockCave);
  const cave = legacyCave ?? initialCave;

  state.schemaVersion = Math.max(5, Number(state.schemaVersion) || 1);
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
