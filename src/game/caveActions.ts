import { CAVE_BUILDINGS, createCave, getCaveEffects, getOfflineLimitMinutes, getUpgradeCost, settleCave } from './cave';
import { recoverInjury } from './injury';
import { createLedgerEntry } from './save';
import type { CaveBuildingId, CaveMasteryId, GameState, LedgerEntry } from './types';

export type RandomSource = () => number;

export type CaveMutationResult = {
  state: GameState;
  newEntries: LedgerEntry[];
  error?: string;
};

const COLLECTION_RESULTS = [
  '你打开储物石室，把聚灵阵吐纳出的灵气和灵田养熟的灵草收拢起来。洞府第一次像是有了真正的主人。',
  '阵盘上的微光逐渐熄下，你将积攒的灵气引入丹田，又把灵草扎成一束，顺手挂在洞口晾晒。',
  '收获不算惊天动地，却很踏实：一部分进了经脉，一部分进了药篓。修仙的家底，就是这样一点点攒出来的。',
] as const;

const pick = <T,>(items: readonly T[], random: RandomSource) =>
  items[Math.floor(random() * items.length)];

const settleForMutation = (state: GameState, now: number) => {
  const cave = state.cave ?? createCave(now);
  state.cave = cave;
  const settled = settleCave(cave, now, getOfflineLimitMinutes(state));
  state.cave = settled.cave;
};

export const CAVE_MASTERY_DEFINITIONS: Record<CaveMasteryId, {
  label: string;
  buildingId: CaveBuildingId;
  summary: string;
  cost: { spiritStones: number; herbs: number; techniqueFragments: number };
}> = {
  'spirit-marrow': {
    label: '凝炼灵髓',
    buildingId: 'spirit-gathering-array',
    summary: '让满级聚灵阵压缩灵气，形成可直接纳入丹田的一滴灵髓。',
    cost: { spiritStones: 45, herbs: 4, techniqueFragments: 0 },
  },
  'years-herb': {
    label: '培育岁华草',
    buildingId: 'spirit-field',
    summary: '让满级灵田培育一株跨季不凋的岁华草，本世最多服用三次。',
    cost: { spiritStones: 30, herbs: 12, techniqueFragments: 0 },
  },
  'merged-script': {
    label: '推演合卷',
    buildingId: 'scripture-pavilion',
    summary: '在满级藏经阁中合并残页，同时推演当前主修与辅修。',
    cost: { spiritStones: 35, herbs: 0, techniqueFragments: 5 },
  },
};

export const performCaveMastery = (
  input: GameState,
  masteryId: CaveMasteryId,
  now = Date.now(),
): CaveMutationResult => {
  const state = structuredClone(input);
  settleForMutation(state, now);
  const definition = CAVE_MASTERY_DEFINITIONS[masteryId];
  if (!state.cave.unlocked) return { state, newEntries: [], error: '洞府尚未解锁。' };
  if (state.character.currentAction) return { state, newEntries: [], error: '行动进行中，无法主持洞府深层劳作。' };
  if (state.pendingExplorationEvent || state.social.pendingPersonEvent) return { state, newEntries: [], error: '请先处理眼前事件。' };
  if (state.cave.buildings[definition.buildingId].level < 3) return { state, newEntries: [], error: '对应建筑达到三级后才能开启这项劳作。' };
  if (masteryId === 'years-herb' && state.cave.mastery.yearsHerbRituals >= 3) {
    return { state, newEntries: [], error: '本世已经服用过三株岁华草，继续服用不会再有作用。' };
  }
  if (masteryId === 'merged-script' && !state.cultivationPath.activeTechniqueId) {
    return { state, newEntries: [], error: '尚未选定主修功法，无法推演合卷。' };
  }
  const { cost } = definition;
  if (
    state.inventory.spiritStones < cost.spiritStones ||
    state.inventory.herbs < cost.herbs ||
    state.inventory.techniqueFragments < cost.techniqueFragments
  ) return { state, newEntries: [], error: '现有资源不足以完成这项洞府劳作。' };

  state.inventory.spiritStones -= cost.spiritStones;
  state.inventory.herbs -= cost.herbs;
  state.inventory.techniqueFragments -= cost.techniqueFragments;
  const changes = [
    cost.spiritStones ? `灵石 -${cost.spiritStones}` : '',
    cost.herbs ? `灵草 -${cost.herbs}` : '',
    cost.techniqueFragments ? `功法残页 -${cost.techniqueFragments}` : '',
  ].filter(Boolean);
  let body = '';
  if (masteryId === 'spirit-marrow') {
    state.character.realm.cultivation += 60;
    state.cave.mastery.spiritMarrowRefinements += 1;
    changes.push('修为 +60');
    body = '阵纹把一夜灵光压成一滴沉重灵髓。它落入丹田时没有声响，却替你省下了许多寻常吐纳。';
  } else if (masteryId === 'years-herb') {
    state.character.lifespanDays += 365;
    state.cave.mastery.yearsHerbRituals += 1;
    changes.push('本世寿元 +1 年');
    body = '岁华草入口没有药香，只有一阵很淡的春雨气。长生簿上的余年随之多出了一笔。';
  } else {
    const techniqueIds = [state.cultivationPath.activeTechniqueId, state.cultivationPath.auxiliaryTechniqueId].filter(Boolean) as string[];
    for (const techniqueId of techniqueIds) {
      const progress = state.cultivationPath.techniques[techniqueId];
      if (progress) progress.proficiency = Math.min(100, progress.proficiency + 12);
    }
    state.cave.mastery.mergedScriptDeductions += 1;
    changes.push(`主辅功法熟练度 +12`);
    body = '残页在经阁灯下重新排成一卷。主辅两道周天彼此批注，你终于看清它们能够同行的下一段路。';
  }
  const entry = createLedgerEntry('action', definition.label, body, changes, now);
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const collectCave = (
  input: GameState,
  now = Date.now(),
  random: RandomSource = Math.random,
): CaveMutationResult => {
  const state = structuredClone(input);
  settleForMutation(state, now);
  if (!state.cave.unlocked) return { state, newEntries: [], error: '洞府尚未解锁。完成第一次探索后才能进入。' };
  const collected = { ...state.cave.stored };
  if (collected.cultivation <= 0 && collected.herbs <= 0) {
    return { state, newEntries: [], error: '洞府暂时没有可以收取的产出。' };
  }
  const cultivationBefore = state.character.realm.cultivation;
  state.character.realm.cultivation += collected.cultivation;
  state.inventory.herbs += collected.herbs;
  state.cave.stored = { cultivation: 0, herbs: 0 };
  const entries = [createLedgerEntry(
    'action',
    pick(['收好这一笔家底', '洞府今日有所得', '把灵气和灵草带回身边'], random),
    pick(COLLECTION_RESULTS, random),
    [collected.cultivation > 0 ? `修为 +${collected.cultivation}` : '', collected.herbs > 0 ? `灵草 +${collected.herbs}` : ''].filter(Boolean),
    now,
  )];
  if (cultivationBefore < state.character.realm.cultivationRequired && state.character.realm.cultivation >= state.character.realm.cultivationRequired) {
    entries.push(createLedgerEntry('breakthrough', '突破的念头', '洞府积攒的灵气汇入丹田，修为已经触及当前瓶颈。你可以继续夯实根基，也可以尝试冲关。', ['突破', '待处理'], now));
  }
  state.ledger = [...entries, ...state.ledger].slice(0, 100);
  return { state, newEntries: entries };
};

export const treatInjury = (
  input: GameState,
  now = Date.now(),
  treatment: 'herbs' | 'pill' = 'herbs',
): CaveMutationResult => {
  const state = structuredClone(input);
  settleForMutation(state, now);
  if (!state.cave.unlocked) return { state, newEntries: [], error: '洞府尚未解锁。完成第一次探索后才能治疗伤势。' };
  if (!state.character.injury) return { state, newEntries: [], error: '当前没有需要治疗的持续伤势。' };
  const herbCost = 2;
  if (treatment === 'pill' && state.inventory.healingPills < 1) return { state, newEntries: [], error: '养脉丹不足，先在洞府中炼制一枚。' };
  if (treatment === 'herbs' && state.inventory.herbs < herbCost) return { state, newEntries: [], error: `还需要 ${herbCost} 株灵草才能调配疗伤药。` };
  if (treatment === 'pill') state.inventory.healingPills -= 1;
  else state.inventory.herbs -= herbCost;
  const recoveryBefore = state.character.injury.recoveryPoints;
  const recoveryPoints = treatment === 'pill' ? 6 : 3;
  state.character.injury = recoverInjury(state.character.injury, recoveryPoints);
  const healed = !state.character.injury;
  const entry = createLedgerEntry(
    'action',
    healed ? '伤势终于痊愈' : treatment === 'pill' ? '丹力温养经脉' : '灵草调养经脉',
    treatment === 'pill'
      ? healed ? '养脉丹化作温热药力，沿经脉洗去最后一点暗伤。' : '丹药在识海中化开，原本纠缠的伤势被稳稳压下一大截。'
      : healed ? '你把灵草熬成一碗苦得发涩的药汤，药力沿着受损经脉慢慢铺开。等最后一缕痛意散去，这段险路才算真正翻页。' : '你在洞府里以灵草温养受创的经脉，疼痛退下去一些，但还需要几次这样的调养才能完全恢复。',
    [treatment === 'pill' ? '养脉丹 -1' : `灵草 -${herbCost}`, healed ? '伤势痊愈' : `恢复进度 +${recoveryBefore - (state.character.injury?.recoveryPoints ?? 0)}`],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const craftHealingPill = (input: GameState, now = Date.now()): CaveMutationResult => {
  const state = structuredClone(input);
  settleForMutation(state, now);
  if (!state.cave.unlocked) return { state, newEntries: [], error: '找到洞府后才能开炉炼药。' };
  if (state.character.currentAction) return { state, newEntries: [], error: '行动进行中，暂时无法照看丹火。' };
  if (state.inventory.herbs < 4 || state.inventory.spiritStones < 6) return { state, newEntries: [], error: '炼制养脉丹需要 4 株灵草和 6 枚灵石。' };
  state.inventory.herbs -= 4;
  state.inventory.spiritStones -= 6;
  const pillYield = getCaveEffects(state.cave).medicineYield;
  state.inventory.healingPills += pillYield;
  const entry = createLedgerEntry('action', '一炉养脉丹成', pillYield > 1 ? '聚灵阵稳住火候，灵田保住药性，同样一份材料最终凝成了两枚养脉丹。' : '你借聚灵阵稳住丹火，把四株灵草慢慢炼成一枚温润的养脉丹。它能一次恢复六点伤势进度。', ['灵草 -4', '灵石 -6', `养脉丹 +${pillYield}`, pillYield > 1 ? '洞府组合生效' : ''].filter(Boolean), now);
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const upgradeCaveBuilding = (
  input: GameState,
  buildingId: CaveBuildingId,
  now = Date.now(),
  random: RandomSource = Math.random,
): CaveMutationResult => {
  const state = structuredClone(input);
  settleForMutation(state, now);
  if (!state.cave.unlocked) return { state, newEntries: [], error: '洞府尚未解锁。完成第一次探索后才能建造。' };
  const building = state.cave.buildings[buildingId];
  const nextLevel = building.level + 1;
  const cost = getUpgradeCost(buildingId, nextLevel);
  if (!cost) return { state, newEntries: [], error: '这座建筑已经达到最高等级。' };
  if (state.inventory.spiritStones < cost.spiritStones || state.inventory.herbs < cost.herbs) return { state, newEntries: [], error: '材料不足，暂时无法完成这次建造。' };
  state.inventory.spiritStones -= cost.spiritStones;
  state.inventory.herbs -= cost.herbs;
  building.level = nextLevel;
  const buildingInfo = CAVE_BUILDINGS[buildingId];
  const entry = createLedgerEntry(
    'action',
    pick([`${buildingInfo.label}${nextLevel === 1 ? '落成' : '再上一层'}`, `洞府添置：${buildingInfo.label}`, `${buildingInfo.label}的阵纹亮了起来`], random),
    `你用灵石和灵草重新整理洞府，将${buildingInfo.label}提升到了${nextLevel}级。${pick(['新的阵纹刚刻下，石室里的灵气便顺着纹路流动起来。', '这回不用担心材料白费，洞府的气息确实比之前稳了一截。', '工程不大，却让这处石窟终于有了几分修仙居所的模样。'], random)}`,
    [`${buildingInfo.label} Lv.${nextLevel}`, `灵石 -${cost.spiritStones}`, `灵草 -${cost.herbs}`],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};
