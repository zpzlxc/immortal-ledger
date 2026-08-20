export type ActionType = 'meditate' | 'overdrive' | 'explore' | 'study' | 'sect_mission';

export type ExplorationLocationId = 'qingstone-mountain' | 'blackwind-valley' | 'nameless-well';

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
  contribution: number;
  reputation: number;
};

export type PersonEventId =
  | 'lin-qiu-caravan'
  | 'lin-qiu-ledger'
  | 'xuan-song-lesson'
  | 'xuan-song-mountain-gate'
  | 'nameless-well-soul'
  | 'nameless-well-echo';

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
  locationId?: ExplorationLocationId;
  missionId?: SectMissionId;
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
};

export type CaveBuildingId = 'spirit-gathering-array' | 'spirit-field' | 'scripture-pavilion';

export type CaveBuilding = {
  level: number;
};

export type CaveState = {
  unlocked: boolean;
  lastSettledAt: number;
  stored: {
    cultivation: number;
    herbs: number;
  };
  buildings: Record<CaveBuildingId, CaveBuilding>;
};

export type GameState = {
  schemaVersion: number;
  lastSettledAt: number;
  character: Character;
  inventory: Inventory;
  cave: CaveState;
  cultivationPath: CultivationPathState;
  social: SocialState;
  ledger: LedgerEntry[];
  discoveredLocations: string[];
};

export type SettlementResult = {
  state: GameState;
  newEntries: LedgerEntry[];
};
