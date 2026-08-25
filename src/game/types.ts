export type ActionType = 'meditate' | 'temper' | 'insight' | 'overdrive' | 'explore' | 'study' | 'sect_mission' | 'breakthrough' | 'foundation_trial' | 'technique_swap' | 'golden_core_ordeal' | 'cave_research';

export type ExplorationLocationId = 'qingstone-mountain' | 'blackwind-valley' | 'nameless-well' | 'cloudbreak-ridge';

export type ExplorationEventId =
  | 'qingstone-red-bell'
  | 'qingstone-fox-path'
  | 'qingstone-spring-rain'
  | 'qingstone-star-moth'
  | 'qingstone-root-script'
  | 'blackwind-broken-stele'
  | 'blackwind-ghost-lantern'
  | 'blackwind-wind-tide'
  | 'blackwind-sand-map'
  | 'blackwind-sealed-word'
  | 'nameless-reversed-name'
  | 'nameless-empty-lantern'
  | 'nameless-moon-tide'
  | 'nameless-starfall'
  | 'nameless-true-name'
  | 'cloudbreak-stone-gate'
  | 'cloudbreak-red-thread'
  | 'cloudbreak-name-echo'
  | 'qingstone-inherited-bell'
  | 'blackwind-inherited-stele'
  | 'nameless-returning-name'
  | 'nameless-unclaimed-letter';

export type PendingExplorationEvent = {
  eventId: ExplorationEventId;
  createdAt: number;
};

export type StoryChoiceKind = 'exploration' | 'person';

export type StoryChoiceRecord = {
  kind: StoryChoiceKind;
  eventId: ExplorationEventId | PersonEventId;
  choiceId: string;
  chosenAt: number;
};

export type StoryState = {
  choiceHistory: StoryChoiceRecord[];
  worldFlags: string[];
  foundationTrialCount: number;
};

export type CultivationSchoolId = 'sword' | 'alchemy' | 'formation' | 'soul';
export type TechniqueId = 'wind-chasing-sword' | 'hundred-herbs-canon' | 'star-pattern-manual' | 'guarding-one-meditation';
export type TechniqueBranchId = string;

export type TechniqueProgress = {
  proficiency: number;
  activeBranchId: string;
  unlockedBranchIds: string[];
};

export type CultivationPathState = {
  schoolId: CultivationSchoolId | null;
  activeTechniqueId: TechniqueId | null;
  auxiliaryTechniqueId: TechniqueId | null;
  techniques: Record<string, TechniqueProgress>;
};

export type RelationshipId = 'lin-qiu' | 'xuan-song' | 'nameless-soul';
export type RelationshipStatus = '陌生' | '熟悉' | '信任' | '敌对';

export type RelationshipState = {
  affinity: number;
  interactionCount: number;
  status: RelationshipStatus;
  discovered: boolean;
};

export type SectId = 'qingxiao-sword-sect' | 'baicao-valley' | 'tianji-pavilion';
export type SectPositionId = 'outer-disciple' | 'inner-disciple' | 'sect-steward';
export type SectMissionId =
  | 'qingxiao-patrol'
  | 'qingxiao-escort'
  | 'baicao-gathering'
  | 'baicao-cure'
  | 'tianji-star-chart'
  | 'tianji-seal';

export type SectState = {
  sectId: SectId | null;
  invited: boolean;
  joinedAt: number | null;
  positionId: SectPositionId | null;
  contribution: number;
  reputation: number;
  defectionCount: number;
  cooldownUntil: number | null;
};

export type PersonEventId =
  | 'lin-qiu-caravan'
  | 'lin-qiu-ledger'
  | 'xuan-song-lesson'
  | 'xuan-song-mountain-gate'
  | 'nameless-well-soul'
  | 'nameless-well-echo'
  | 'nameless-well-oath'
  | 'nameless-well-gate'
  | 'nameless-well-ending'
  | 'foundation-dual-technique'
  | 'qingxiao-sword-trial'
  | 'baicao-valley-oath'
  | 'tianji-pavilion-star-chart';

export type SectExchangeId = 'exchange-spirit-stones' | 'exchange-herbs' | 'exchange-technique-fragments';

export type PendingPersonEvent = {
  eventId: PersonEventId;
  createdAt: number;
};

export type SocialState = {
  relationships: Record<RelationshipId, RelationshipState>;
  sect: SectState;
  pendingPersonEvent: PendingPersonEvent | null;
  completedPersonEventIds: PersonEventId[];
};

export type LedgerCategory =
  | 'system'
  | 'action'
  | 'exploration'
  | 'breakthrough'
  | 'relationship'
  | 'death';

export type Talent = {
  id: string;
  name: string;
  summary: string;
  effect: string;
};

export type Realm = {
  major: 'qi_refining' | 'foundation_establishment';
  stage: number;
  cultivation: number;
  cultivationRequired: number;
};

export type CurrentAction = {
  id: string;
  type: ActionType;
  startedAt: number;
  endsAt: number;
  cycleDurationMinutes?: number;
  plannedCycles?: number;
  completedCycles?: number;
  batchProgress?: {
    cultivation: number;
    spiritStones: number;
    herbs: number;
    techniqueFragments: number;
    physique: number;
    comprehension: number;
    spiritSense: number;
    mentalState: number;
    proficiency: number;
  };
  locationId?: ExplorationLocationId;
  missionId?: SectMissionId;
  researchId?: CaveResearchId;
};

export type InjurySource = 'overdrive' | 'exploration' | 'sect_mission';

export type InjuryState = {
  severity: 1 | 2 | 3;
  recoveryPoints: number;
  source: InjurySource;
  startedAt: number;
};

export type Character = {
  id: string;
  name: string;
  createdAt: number;
  ageDays: number;
  lifespanDays: number;
  attributes: {
    physique: number;
    comprehension: number;
    spiritSense: number;
    mentalState: number;
    fortune: number;
    karma: number;
  };
  realm: Realm;
  talents: Talent[];
  currentAction: CurrentAction | null;
  injury: InjuryState | null;
  breakthroughCooldownUntil: number | null;
};

export type LifeStatus = 'alive' | 'dead';

export type DeathReason = 'lifespan_exhausted' | 'fatal_injury' | 'golden_core_quest';

export type TechniqueCombinationId =
  | 'sword-formation-resonance'
  | 'alchemy-soul-resonance'
  | 'sword-soul-conflict'
  | 'sword-alchemy-resonance'
  | 'alchemy-formation-conflict'
  | 'formation-soul-resonance';

export type LifeEndingId =
  | 'unfinished-page'
  | 'fell-on-the-path'
  | 'dual-path-core'
  | 'discord-forged-core'
  | 'sect-dharma-core'
  | 'nameless-heart-core'
  | 'solitary-golden-core';

export type LegacyBoonId = 'old-friend-echo' | 'cave-ember' | 'long-watch-mark';

export type LegacyAchievementId =
  | 'first-golden-core'
  | 'all-locations'
  | 'three-sects'
  | 'six-technique-pairs'
  | 'all-golden-endings';

export type LegacyStoryMarkId =
  | 'bell-taken'
  | 'stele-repaired'
  | 'named-soul'
  | 'kept-soul-nameless'
  | 'annotated-soul';

export type LifeSummary = {
  lifeNumber: number;
  characterName: string;
  deathReason: DeathReason;
  endedAt: number;
  ageDays: number;
  lifespanDays: number;
  realm: Realm;
  discoveredLocationCount: number;
  discoveredRelationshipCount: number;
  sectId: SectId | null;
  endingId: LifeEndingId;
  keyEvents: string[];
};

export type LegacyState = {
  lifeCount: number;
  discoveredLocations: ExplorationLocationId[];
  techniqueFragments: number;
  previousLifeNames: string[];
  activeBoonId: LegacyBoonId | null;
  completedEndingIds: LifeEndingId[];
  visitedSectIds: SectId[];
  techniqueCombinationIds: TechniqueCombinationId[];
  achievementIds: LegacyAchievementId[];
  storyMarks: LegacyStoryMarkId[];
};

export type LedgerEntry = {
  id: string;
  createdAt: number;
  category: LedgerCategory;
  title: string;
  body: string;
  tags: string[];
  read: boolean;
};

export type Inventory = {
  spiritStones: number;
  herbs: number;
  techniqueFragments: number;
  healingPills: number;
};

export type CaveBuildingId = 'spirit-gathering-array' | 'spirit-field' | 'scripture-pavilion';

export type CaveBuilding = {
  level: number;
};

export type CaveMasteryId = 'spirit-marrow' | 'years-herb' | 'merged-script';

export type CaveMasteryState = {
  spiritMarrowRefinements: number;
  yearsHerbRituals: number;
  mergedScriptDeductions: number;
};

export type CaveResearchId = 'trace-atlas' | 'soul-annotation' | 'omen-calendar';

export type CaveResearchState = {
  completedIds: CaveResearchId[];
};

export type CaveState = {
  unlocked: boolean;
  lastSettledAt: number;
  stored: {
    cultivation: number;
    herbs: number;
  };
  buildings: Record<CaveBuildingId, CaveBuilding>;
  mastery: CaveMasteryState;
  research: CaveResearchState;
};

export type GameState = {
  schemaVersion: number;
  lifeStatus: LifeStatus;
  lifeSummary: LifeSummary | null;
  pastLives: LifeSummary[];
  legacy: LegacyState;
  lastSettledAt: number;
  character: Character;
  inventory: Inventory;
  cave: CaveState;
  cultivationPath: CultivationPathState;
  social: SocialState;
  pendingExplorationEvent: PendingExplorationEvent | null;
  completedExplorationEventIds: ExplorationEventId[];
  lastExplorationEventId: ExplorationEventId | null;
  story: StoryState;
  ledger: LedgerEntry[];
  discoveredLocations: string[];
};

export type SettlementResult = {
  state: GameState;
  newEntries: LedgerEntry[];
};
