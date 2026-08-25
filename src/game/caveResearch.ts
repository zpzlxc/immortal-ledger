import type { CaveResearchId, CaveState, Inventory } from './types';

export type CaveResearchDefinition = {
  id: CaveResearchId;
  label: string;
  icon: string;
  summary: string;
  detail: string;
  durationMinutes: number;
  cost: Pick<Inventory, 'spiritStones' | 'herbs' | 'techniqueFragments'>;
  prerequisiteId?: CaveResearchId;
  flag: string;
  result: string;
};

export const CAVE_RESEARCH_DEFINITIONS: Record<CaveResearchId, CaveResearchDefinition> = {
  'trace-atlas': {
    id: 'trace-atlas',
    label: '山河批注',
    icon: '图',
    summary: '把四处山河的灵脉走向重新画在一张图上，寻找被岁月掩住的共同源头。',
    detail: '完成后获得 2 页功法残页，并留下可供后续研究使用的山河批注。',
    durationMinutes: 45,
    cost: { spiritStones: 18, herbs: 2, techniqueFragments: 2 },
    flag: 'cave-research:trace-atlas',
    result: '山河批注终于连成一线。四处看似无关的风土，原来都在指向同一条旧灵脉。',
  },
  'soul-annotation': {
    id: 'soul-annotation',
    label: '井中旁注',
    icon: '魂',
    summary: '以山河批注为引，整理无名古井里那段没有署名的残魂记录。',
    detail: '完成后获得 2 点神识；若这一世走到终章，研究会成为下一世可读取的轮回刻印。',
    durationMinutes: 60,
    cost: { spiritStones: 28, herbs: 3, techniqueFragments: 3 },
    prerequisiteId: 'trace-atlas',
    flag: 'cave-research:soul-annotation',
    result: '你在残卷边角补上了一行旁注：无名不是空白，而是仍在等待回应的名字。',
  },
  'omen-calendar': {
    id: 'omen-calendar',
    label: '天象推演',
    icon: '历',
    summary: '把铃声、风潮与云海的变化排成一卷小历，推演下一次机缘会从哪里来。',
    detail: '完成后获得 2 点气运；研究链闭合后，云岫古道的旧痕会更容易回应你。',
    durationMinutes: 60,
    cost: { spiritStones: 36, herbs: 4, techniqueFragments: 4 },
    prerequisiteId: 'soul-annotation',
    flag: 'cave-research:omen-calendar',
    result: '天象在纸页上闭合成环。你还不能看见未来，却已经学会辨认未来靠近时的风。',
  },
};

export const getCaveResearch = (researchId?: CaveResearchId | null) =>
  researchId ? CAVE_RESEARCH_DEFINITIONS[researchId] : undefined;

export const isCaveResearchCompleted = (cave: CaveState, researchId: CaveResearchId) =>
  cave.research.completedIds.includes(researchId);

