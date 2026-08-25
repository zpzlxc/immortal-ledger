import { getTechniqueCombination } from './techniques';
import type {
  DeathReason,
  ExplorationLocationId,
  GameState,
  LegacyAchievementId,
  LegacyBoonId,
  LegacyStoryMarkId,
  LegacyState,
  LifeEndingId,
  SectId,
  TechniqueCombinationId,
} from './types';

export const LEGACY_BOONS: Record<LegacyBoonId, {
  label: string;
  summary: string;
  effect: string;
}> = {
  'old-friend-echo': {
    label: '故人回响',
    summary: '前世见过的人会更早认出你眼中的旧意。',
    effect: '林秋与玄松开局即被发现，并各有 8 点好感。',
  },
  'cave-ember': {
    label: '洞府余烬',
    summary: '旧洞府的一点阵火穿过轮回，在新世仍未完全熄灭。',
    effect: '开局解锁洞府，并保留一级聚灵阵。',
  },
  'long-watch-mark': {
    label: '长夜刻痕',
    summary: '长生簿替你记住更多无人看守的时辰。',
    effect: '行动与洞府离线上限增加 12 小时。',
  },
};

export const LIFE_ENDINGS: Record<LifeEndingId, { label: string; summary: string }> = {
  'unfinished-page': { label: '未竟之页', summary: '寿元走到了纸页尽头，仍有许多问题没有得到回答。' },
  'fell-on-the-path': { label: '道途折锋', summary: '这一世倒在险路上，却把伤痕留成了后来者看得见的路标。' },
  'dual-path-core': { label: '两仪同丹', summary: '两门功法在最后一问中彼此照见，共同凝成一枚从未被前人命名的金丹。' },
  'discord-forged-core': { label: '逆火铸丹', summary: '你没有消除功法冲突，而是让两股相斥气机在金丹中留下永恒裂纹。' },
  'sect-dharma-core': { label: '山门法丹', summary: '宗门传承、人间责任与自身道途在最后一刻合为一体。' },
  'nameless-heart-core': { label: '无名心丹', summary: '你替无人回应的旧事留下位置，也终于不再需要别人替自己命名。' },
  'solitary-golden-core': { label: '孤照金丹', summary: '没有借谁的名号，也没有依靠现成答案；你只用这一世本身完成了结丹。' },
};

export const GOLDEN_CORE_ENDING_IDS: LifeEndingId[] = [
  'dual-path-core',
  'discord-forged-core',
  'sect-dharma-core',
  'nameless-heart-core',
  'solitary-golden-core',
];

export const LEGACY_ACHIEVEMENTS: Record<LegacyAchievementId, {
  label: string;
  summary: string;
  requirement: string;
  reward: string;
}> = {
  'first-golden-core': {
    label: '金丹初问',
    summary: '第一次把这一世写到金丹之问。',
    requirement: '完成一次叩问金丹',
    reward: '下一世多展示一项先天天赋',
  },
  'all-locations': {
    label: '四方留痕',
    summary: '四处山河都曾留下你的脚印。',
    requirement: '跨世发现全部四处地点',
    reward: '下一世开局多获得 1 株灵草',
  },
  'three-sects': {
    label: '三门行脚',
    summary: '剑宗、百草谷与天机阁都记得你的名字。',
    requirement: '跨世加入过三座宗门',
    reward: '下一世开局多获得 5 枚灵石',
  },
  'six-technique-pairs': {
    label: '六脉交汇',
    summary: '四门功法的六种主辅组合都曾在你身上运转。',
    requirement: '跨世完成全部六种功法组合',
    reward: '解锁完整的功法组合收集记录',
  },
  'all-golden-endings': {
    label: '五相金丹',
    summary: '五种金丹终局，五种回答，都被长生簿收下。',
    requirement: '跨世完成全部五种金丹终局',
    reward: '下一世开局多获得 1 页功法残页',
  },
};

export const LEGACY_STORY_MARKS: Record<LegacyStoryMarkId, {
  label: string;
  summary: string;
  effect: string;
}> = {
  'bell-taken': {
    label: '铃路旧痕',
    summary: '前世曾从青石山树梢取下那枚红线铜铃。',
    effect: '下一世会在青石山遇见铜铃留下的回响。',
  },
  'stele-repaired': {
    label: '断碑复纹',
    summary: '前世曾按阵纹推回黑风谷断碑的原位。',
    effect: '下一世会在黑风谷遇见尚未写完的旧阵。',
  },
  'named-soul': {
    label: '替魂留名',
    summary: '前世曾替无名残魂写下一个新的称呼。',
    effect: '下一世无名古井会更早回应这段被留下的名字。',
  },
  'kept-soul-nameless': {
    label: '守住无名',
    summary: '前世选择让残魂继续以无名之魂留在井底。',
    effect: '下一世会读到一份不要求被命名的井底遗书。',
  },
  'annotated-soul': {
    label: '井中旁注',
    summary: '前世曾在藏经阁整理过无名残魂的旁注。',
    effect: '下一世与无名古井相关的回声会带着更清晰的线索。',
  },
};

export const getLegacyStartingBonuses = (
  legacy?: Pick<LegacyState, 'achievementIds'>,
) => {
  const achievements = new Set(legacy?.achievementIds ?? []);
  return {
    spiritStones: achievements.has('three-sects') ? 5 : 0,
    herbs: achievements.has('all-locations') ? 1 : 0,
    techniqueFragments: achievements.has('all-golden-endings') ? 1 : 0,
    talentOptions: achievements.has('first-golden-core') ? 1 : 0,
  };
};

export const getLegacyTalentOptionCount = (legacy?: Pick<LegacyState, 'achievementIds'>) =>
  3 + getLegacyStartingBonuses(legacy).talentOptions;

export type LegacyLifeRecord = {
  endingId: LifeEndingId;
  deathReason: DeathReason;
  discoveredLocations: ExplorationLocationId[];
  sectId: SectId | null;
  techniqueCombinationId: TechniqueCombinationId | null;
  storyWorldFlags?: string[];
};

const getStoryMarks = (flags: string[]): LegacyStoryMarkId[] => {
  const marks = new Set<LegacyStoryMarkId>();
  if (flags.includes('exploration:qingstone-red-bell:climb-for-bell')) marks.add('bell-taken');
  if (flags.includes('exploration:blackwind-broken-stele:read-the-stele')) marks.add('stele-repaired');
  if (flags.includes('person:nameless-well-ending:give-the-soul-a-name')) marks.add('named-soul');
  if (flags.includes('person:nameless-well-ending:keep-the-soul-nameless')) marks.add('kept-soul-nameless');
  if (flags.includes('cave-research:soul-annotation')) marks.add('annotated-soul');
  return [...marks];
};

export const recordLegacyProgress = (
  legacy: LegacyState,
  record: LegacyLifeRecord,
): LegacyState => {
  const completedEndingIds = Array.from(new Set([
    ...(legacy.completedEndingIds ?? []),
    record.endingId,
  ]));
  const visitedSectIds = Array.from(new Set([
    ...(legacy.visitedSectIds ?? []),
    ...(record.sectId ? [record.sectId] : []),
  ]));
  const techniqueCombinationIds = Array.from(new Set([
    ...(legacy.techniqueCombinationIds ?? []),
    ...(record.techniqueCombinationId ? [record.techniqueCombinationId] : []),
  ]));
  const discoveredLocations = Array.from(new Set([
    ...(legacy.discoveredLocations ?? []),
    ...record.discoveredLocations,
  ]));
  const achievementIds = new Set(legacy.achievementIds ?? []);
  const storyMarks = new Set([
    ...(legacy.storyMarks ?? []),
    ...getStoryMarks(record.storyWorldFlags ?? []),
  ]);

  if (record.deathReason === 'golden_core_quest') achievementIds.add('first-golden-core');
  if (discoveredLocations.length >= 4) achievementIds.add('all-locations');
  if (visitedSectIds.length >= 3) achievementIds.add('three-sects');
  if (techniqueCombinationIds.length >= 6) achievementIds.add('six-technique-pairs');
  if (GOLDEN_CORE_ENDING_IDS.every((endingId) => completedEndingIds.includes(endingId))) {
    achievementIds.add('all-golden-endings');
  }

  return {
    ...legacy,
    discoveredLocations,
    completedEndingIds,
    visitedSectIds,
    techniqueCombinationIds,
    achievementIds: Array.from(achievementIds),
    storyMarks: Array.from(storyMarks),
  };
};

export const getGoldenCoreEnding = (state: GameState): LifeEndingId => {
  const combination = getTechniqueCombination(state.cultivationPath);
  if (combination?.kind === 'conflict') return 'discord-forged-core';
  if (combination?.kind === 'resonance') return 'dual-path-core';
  if (state.social.sect.positionId === 'sect-steward') return 'sect-dharma-core';
  if (state.social.completedPersonEventIds.includes('nameless-well-ending')) return 'nameless-heart-core';
  return 'solitary-golden-core';
};
