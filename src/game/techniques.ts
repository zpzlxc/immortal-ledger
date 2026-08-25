import type {
  CultivationPathState,
  CultivationSchoolId,
  TechniqueBranchId,
  TechniqueCombinationId,
  TechniqueId,
  TechniqueProgress,
} from './types';

export type TechniqueEffectBonuses = {
  cultivationMultiplier: number;
  explorationStoneBonus: number;
  studyFragmentBonus: number;
  studyProficiencyBonus: number;
  foundationTrialCultivationMultiplier: number;
  injuryRecoveryBonus: number;
  overdriveInjuryChanceBonus: number;
};

export type TechniqueBranch = {
  id: TechniqueBranchId;
  label: string;
  summary: string;
  requiredProficiency: number;
  costTechniqueFragments: number;
  effects: Partial<TechniqueEffectBonuses>;
};

export type CultivationSchool = {
  id: CultivationSchoolId;
  label: string;
  icon: string;
  summary: string;
  style: string;
};

export type TechniqueDefinition = {
  id: TechniqueId;
  schoolId: CultivationSchoolId;
  name: string;
  grade: string;
  summary: string;
  auxiliaryEffectLabel: string;
  auxiliaryEffects: Partial<TechniqueEffectBonuses>;
  branches: TechniqueBranch[];
};

export type TechniqueCombination = {
  id: TechniqueCombinationId;
  techniqueIds: [TechniqueId, TechniqueId];
  label: string;
  summary: string;
  kind: 'resonance' | 'conflict';
  effects: Partial<TechniqueEffectBonuses>;
};

export const CULTIVATION_SCHOOLS: Record<CultivationSchoolId, CultivationSchool> = {
  sword: {
    id: 'sword',
    label: '剑修',
    icon: '剑',
    summary: '以锋芒破局，以身法换取探索中的主动权。',
    style: '探索收益更高，危险之地更有回报。',
  },
  alchemy: {
    id: 'alchemy',
    label: '丹修',
    icon: '炉',
    summary: '辨药性、炼心火，把寻常材料熬成稳定的成长。',
    style: '研读残卷更容易获得功法残页和熟练度。',
  },
  formation: {
    id: 'formation',
    label: '阵修',
    icon: '阵',
    summary: '借天地纹理布下小阵，让每一次吐纳都更有章法。',
    style: '修炼收益稳定提升，后续可与洞府建筑联动。',
  },
  soul: {
    id: 'soul',
    label: '魂修',
    icon: '魂',
    summary: '守住识海的一点灯火，向心神深处寻找力量。',
    style: '研究熟练度成长更快，适合把一门功法钻得更深。',
  },
};

export const TECHNIQUE_DEFINITIONS: Record<TechniqueId, TechniqueDefinition> = {
  'wind-chasing-sword': {
    id: 'wind-chasing-sword',
    schoolId: 'sword',
    name: '逐风剑诀',
    grade: '黄阶上品',
    summary: '剑未出鞘，先听风向。适合在山野和险地中寻找破绽。',
    auxiliaryEffectLabel: '辅修·听风',
    auxiliaryEffects: { explorationStoneBonus: 1 },
    branches: [
      { id: 'listen-wind', label: '听风守势', summary: '先看清路，再决定剑往哪里落。', requiredProficiency: 0, costTechniqueFragments: 0, effects: {} },
      { id: 'chasing-edge', label: '追锋', summary: '把风势化为脚下的速度，探索时更容易找到值钱的东西。', requiredProficiency: 25, costTechniqueFragments: 2, effects: { explorationStoneBonus: 2 } },
      { id: 'broken-mountain', label: '断岳秘篇', summary: '以一线锋芒破开厚重阻碍，运功和探索收益进一步提升。', requiredProficiency: 60, costTechniqueFragments: 4, effects: { cultivationMultiplier: 0.06, explorationStoneBonus: 1 } },
    ],
  },
  'hundred-herbs-canon': {
    id: 'hundred-herbs-canon',
    schoolId: 'alchemy',
    name: '百草丹经',
    grade: '黄阶上品',
    summary: '先认药，再认火，最后才轮到丹炉认你。',
    auxiliaryEffectLabel: '辅修·辨药',
    auxiliaryEffects: { studyFragmentBonus: 1 },
    branches: [
      { id: 'taste-herbs', label: '辨草识性', summary: '从药香里分辨出功法残页的细微脉络。', requiredProficiency: 0, costTechniqueFragments: 0, effects: { studyProficiencyBonus: 2 } },
      { id: 'separate-fire', label: '炉火分丹', summary: '控制火候不再只靠运气，研读时更容易留下有用残页。', requiredProficiency: 25, costTechniqueFragments: 2, effects: { studyFragmentBonus: 1, studyProficiencyBonus: 2 } },
      { id: 'red-furnace', label: '赤炉秘法', summary: '以心火炼神，连普通吐纳也能获得额外收益。', requiredProficiency: 60, costTechniqueFragments: 4, effects: { studyFragmentBonus: 2, cultivationMultiplier: 0.04 } },
    ],
  },
  'star-pattern-manual': {
    id: 'star-pattern-manual',
    schoolId: 'formation',
    name: '聚星阵解',
    grade: '黄阶上品',
    summary: '以星位排气，以阵眼收束灵光，和洞府的聚灵阵颇有共鸣。',
    auxiliaryEffectLabel: '辅修·引气',
    auxiliaryEffects: { cultivationMultiplier: 0.02 },
    branches: [
      { id: 'draw-qi', label: '引气入阵', summary: '先把散乱灵气引到该在的位置。', requiredProficiency: 0, costTechniqueFragments: 0, effects: { cultivationMultiplier: 0.04 } },
      { id: 'fold-pattern', label: '叠纹', summary: '多叠一层阵纹，平稳修炼时的积累会变得更扎实。', requiredProficiency: 25, costTechniqueFragments: 2, effects: { cultivationMultiplier: 0.05 } },
      { id: 'celestial-eye', label: '周天阵眼', summary: '让洞府与自身功法互相照应，并加快研究进度。', requiredProficiency: 60, costTechniqueFragments: 4, effects: { cultivationMultiplier: 0.08, studyProficiencyBonus: 2 } },
    ],
  },
  'guarding-one-meditation': {
    id: 'guarding-one-meditation',
    schoolId: 'soul',
    name: '守一观想法',
    grade: '黄阶上品',
    summary: '在识海中守住一点微光，任外界风声来去，不让心神先乱。',
    auxiliaryEffectLabel: '辅修·守灯',
    auxiliaryEffects: { studyProficiencyBonus: 1 },
    branches: [
      { id: 'hold-lamp', label: '守灯', summary: '先学会在杂念中保留一寸清明。', requiredProficiency: 0, costTechniqueFragments: 0, effects: { studyProficiencyBonus: 3 } },
      { id: 'see-heart', label: '照见心魔', summary: '看清恐惧从何而来，修炼和研究都会更稳。', requiredProficiency: 25, costTechniqueFragments: 2, effects: { studyProficiencyBonus: 3, cultivationMultiplier: 0.03 } },
      { id: 'soul-echo', label: '摄魂回响', summary: '借回声反观自身，能从残卷中听出别人忽略的部分。', requiredProficiency: 60, costTechniqueFragments: 4, effects: { studyFragmentBonus: 1, cultivationMultiplier: 0.06 } },
    ],
  },
};

const EMPTY_EFFECTS: TechniqueEffectBonuses = {
  cultivationMultiplier: 0,
  explorationStoneBonus: 0,
  studyFragmentBonus: 0,
  studyProficiencyBonus: 0,
  foundationTrialCultivationMultiplier: 0,
  injuryRecoveryBonus: 0,
  overdriveInjuryChanceBonus: 0,
};

export const TECHNIQUE_COMBINATIONS: TechniqueCombination[] = [
  {
    id: 'sword-formation-resonance',
    techniqueIds: ['wind-chasing-sword', 'star-pattern-manual'],
    label: '剑阵同调',
    summary: '剑势替阵纹找到出口，阵纹替剑势守住归路；探索与筑基试炼更有收获。',
    kind: 'resonance',
    effects: { explorationStoneBonus: 1, foundationTrialCultivationMultiplier: 0.2 },
  },
  {
    id: 'alchemy-soul-resonance',
    techniqueIds: ['hundred-herbs-canon', 'guarding-one-meditation'],
    label: '丹火照魂',
    summary: '药性安顿识海，魂火反照丹理；研读更深，静修疗伤也更快。',
    kind: 'resonance',
    effects: { studyProficiencyBonus: 2, injuryRecoveryBonus: 1 },
  },
  {
    id: 'sword-soul-conflict',
    techniqueIds: ['wind-chasing-sword', 'guarding-one-meditation'],
    label: '剑魄相激',
    summary: '剑意求快，魂法求定，两股气机在极限运功时更容易彼此冲撞。',
    kind: 'conflict',
    effects: { overdriveInjuryChanceBonus: 0.2 },
  },
  {
    id: 'sword-alchemy-resonance',
    techniqueIds: ['wind-chasing-sword', 'hundred-herbs-canon'],
    label: '剑火淬锋',
    summary: '丹火替剑意洗去杂质，剑意替药性劈开滞碍；日常修炼与探索都更加利落。',
    kind: 'resonance',
    effects: { cultivationMultiplier: 0.03, explorationStoneBonus: 1 },
  },
  {
    id: 'alchemy-formation-conflict',
    techniqueIds: ['hundred-herbs-canon', 'star-pattern-manual'],
    label: '炉阵争灵',
    summary: '丹炉与阵眼都要占住灵气最盛的位置，强行催动周天时更容易留下暗伤。',
    kind: 'conflict',
    effects: { cultivationMultiplier: 0.04, overdriveInjuryChanceBonus: 0.12 },
  },
  {
    id: 'formation-soul-resonance',
    techniqueIds: ['star-pattern-manual', 'guarding-one-meditation'],
    label: '星灯守一',
    summary: '阵纹替识海定下方位，魂灯替阵眼照见缺口；研读与疗伤都更从容。',
    kind: 'resonance',
    effects: { studyProficiencyBonus: 1, injuryRecoveryBonus: 1, foundationTrialCultivationMultiplier: 0.1 },
  },
];

export const createCultivationPath = (): CultivationPathState => ({
  schoolId: null,
  activeTechniqueId: null,
  auxiliaryTechniqueId: null,
  techniques: {},
});

export const createTechniqueProgress = (technique: TechniqueDefinition): TechniqueProgress => ({
  proficiency: 0,
  activeBranchId: technique.branches[0].id,
  unlockedBranchIds: [technique.branches[0].id],
});

export const getTechniqueForSchool = (schoolId: CultivationSchoolId) =>
  Object.values(TECHNIQUE_DEFINITIONS).find((technique) => technique.schoolId === schoolId);

export const getActiveTechnique = (path: CultivationPathState) =>
  path.activeTechniqueId ? TECHNIQUE_DEFINITIONS[path.activeTechniqueId] : null;

export const getAuxiliaryTechnique = (path: CultivationPathState) =>
  path.auxiliaryTechniqueId ? TECHNIQUE_DEFINITIONS[path.auxiliaryTechniqueId] : null;

export const getTechniqueCombination = (path: CultivationPathState) => {
  if (!path.activeTechniqueId || !path.auxiliaryTechniqueId) return null;
  return TECHNIQUE_COMBINATIONS.find(({ techniqueIds }) =>
    techniqueIds.includes(path.activeTechniqueId!) && techniqueIds.includes(path.auxiliaryTechniqueId!),
  ) ?? null;
};

export const getTechniqueProgress = (
  path: CultivationPathState,
  techniqueId = path.activeTechniqueId,
): TechniqueProgress | null => {
  if (!techniqueId) return null;
  return path.techniques[techniqueId] ?? null;
};

export const getTechniqueEffects = (path: CultivationPathState): TechniqueEffectBonuses => {
  const effects = { ...EMPTY_EFFECTS };
  const technique = getActiveTechnique(path);
  const progress = getTechniqueProgress(path);
  if (!technique || !progress) return effects;

  const activeBranch = technique.branches.find((branch) => branch.id === progress.activeBranchId);
  if (!activeBranch) return effects;
  for (const key of Object.keys(effects) as Array<keyof TechniqueEffectBonuses>) {
    effects[key] += activeBranch.effects[key] ?? 0;
  }
  const auxiliaryTechnique = getAuxiliaryTechnique(path);
  if (auxiliaryTechnique) {
    for (const key of Object.keys(effects) as Array<keyof TechniqueEffectBonuses>) {
      effects[key] += auxiliaryTechnique.auxiliaryEffects[key] ?? 0;
    }
  }
  const combination = getTechniqueCombination(path);
  if (combination) {
    for (const key of Object.keys(effects) as Array<keyof TechniqueEffectBonuses>) {
      effects[key] += combination.effects[key] ?? 0;
    }
  }
  return effects;
};
