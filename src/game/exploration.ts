import type { ExplorationLocationId, GameState } from './types';

export type ExplorationLocation = {
  id: ExplorationLocationId;
  label: string;
  icon: string;
  summary: string;
  atmosphere: string;
  recommendation: string;
  risk: string;
  durationMinutes: number;
  reward: string;
  unlockHint: string;
};

export const EXPLORATION_LOCATIONS: Record<ExplorationLocationId, ExplorationLocation> = {
  'qingstone-mountain': {
    id: 'qingstone-mountain',
    label: '青石山',
    icon: '山',
    summary: '沿旧猎道采药寻石，偶尔会听见不属于鸟兽的铃声。',
    atmosphere: '山风清冷，旧路和猎户棚之间藏着许多小秘密。',
    recommendation: '炼气一层即可前往',
    risk: '风险：低 · 适合初次探索',
    durationMinutes: 15,
    reward: '灵草、灵石、少量修为',
    unlockHint: '初始开放',
  },
  'blackwind-valley': {
    id: 'blackwind-valley',
    label: '黑风谷',
    icon: '风',
    summary: '黑风常年不散，残破石碑和功法残页埋在乱石之间。',
    atmosphere: '谷底风声像有人贴着耳边说话，稍不留神就会迷失方向。',
    recommendation: '炼气三层后更稳妥',
    risk: '风险：中 · 可能损失根骨或心境',
    durationMinutes: 25,
    reward: '较多灵石、功法残页、修为',
    unlockHint: '完成一次青石山探索后开放',
  },
  'nameless-well': {
    id: 'nameless-well',
    label: '无名古井',
    icon: '井',
    summary: '井底没有水，只有一圈听不懂的回声，和一条通往旧事的暗线。',
    atmosphere: '井口望下去深不见底，偶尔会传来像是你自己说过的话。',
    recommendation: '炼气六层后再深入',
    risk: '风险：高 · 可能影响心境与因果',
    durationMinutes: 35,
    reward: '稀有功法残页、因果线索、灵石',
    unlockHint: '完成一次黑风谷探索后开放',
  },
};

export const isExplorationLocationUnlocked = (
  state: GameState,
  locationId: ExplorationLocationId,
) => state.discoveredLocations.includes(locationId);

export const getExplorationLocation = (locationId?: ExplorationLocationId) =>
  EXPLORATION_LOCATIONS[locationId ?? 'qingstone-mountain'];
