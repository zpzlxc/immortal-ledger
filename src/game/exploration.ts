import type { ExplorationEventId, ExplorationLocationId, GameState } from './types';

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

export type ExplorationEventEffects = {
  spiritStones?: number;
  herbs?: number;
  techniqueFragments?: number;
  cultivation?: number;
  physique?: number;
  spiritSense?: number;
  mentalState?: number;
  fortune?: number;
  karma?: number;
};

export type ExplorationEventChoice = {
  id: string;
  label: string;
  summary: string;
  effects: ExplorationEventEffects;
};

export type ExplorationEventDefinition = {
  id: ExplorationEventId;
  locationId: ExplorationLocationId;
  title: string;
  eyebrow: string;
  summary: string;
  choices: ExplorationEventChoice[];
};

export const EXPLORATION_EVENTS: Record<ExplorationEventId, ExplorationEventDefinition> = {
  'qingstone-red-bell': {
    id: 'qingstone-red-bell',
    locationId: 'qingstone-mountain',
    title: '铃声停在树梢',
    eyebrow: 'QINGSTONE MOUNTAIN · 青石山',
    summary: '旧铃声忽然近得像挂在你头顶。抬头时，树梢上只有一枚系着红线的铜铃，铃下还压着一张写了一半的纸条。',
    choices: [
      {
        id: 'climb-for-bell',
        label: '爬上去取铃',
        summary: '你踩着湿滑的树皮取下铜铃，纸条背面露出一行辨认灵脉的口诀。',
        effects: { spiritSense: 1, techniqueFragments: 1, karma: 1 },
      },
      {
        id: 'leave-red-thread',
        label: '只取纸条，留下红线',
        summary: '你没有碰那枚铃，只把纸条收好，并在树根旁添了一小撮灵草作为回礼。',
        effects: { herbs: -1, fortune: 2, mentalState: 2, karma: 1 },
      },
      {
        id: 'answer-the-bell',
        label: '对着铃声回应',
        summary: '你用指节敲了三下剑鞘。铃声没有回响，却有一枚灵石从枝叶间落了下来。',
        effects: { spiritStones: 8, fortune: -1, karma: -1 },
      },
    ],
  },
  'qingstone-fox-path': {
    id: 'qingstone-fox-path',
    locationId: 'qingstone-mountain',
    title: '山狐不肯回头',
    eyebrow: 'QINGSTONE MOUNTAIN · 青石山',
    summary: '一只叼着红果的山狐在旧猎道上等你。它走几步便回头一次，像是在确认你是否愿意跟上。',
    choices: [
      {
        id: 'follow-fox',
        label: '跟它走进密林',
        summary: '山狐把你带到一片背阴药圃，红果落地后，露出几株尚未被人发现的灵草。',
        effects: { herbs: 3, spiritSense: 1, karma: 2 },
      },
      {
        id: 'trade-red-fruit',
        label: '用灵石换下红果',
        summary: '你没有追赶它，只在石头上放下灵石。山狐留下红果，自己钻回了灌木深处。',
        effects: { spiritStones: -4, mentalState: 3, fortune: 1, cultivation: 4 },
      },
    ],
  },
  'blackwind-broken-stele': {
    id: 'blackwind-broken-stele',
    locationId: 'blackwind-valley',
    title: '断碑下的阵眼',
    eyebrow: 'BLACKWIND VALLEY · 黑风谷',
    summary: '风停的那一瞬，你看见断碑底部有三道新刻的凹痕。它们不像文字，更像一座阵法被人故意拆开的三个角。',
    choices: [
      {
        id: 'read-the-stele',
        label: '按阵纹推回原位',
        summary: '你没有急着搬动石碑，而是先在砂地上补齐阵图。碑阴吐出两页残卷，风声也随之变得清晰。',
        effects: { techniqueFragments: 2, spiritSense: 2, mentalState: -3, karma: 1 },
      },
      {
        id: 'break-the-stele',
        label: '直接劈开断碑',
        summary: '石片四散时，一小袋灵石滚进你的靴边。阵纹被彻底毁掉，谷中的风却像记住了你的名字。',
        effects: { spiritStones: 16, physique: -1, fortune: 1, karma: -2 },
      },
      {
        id: 'wait-for-wind',
        label: '等风把答案吹出来',
        summary: '你在断碑旁坐到天色变暗，终于从风里听懂一段不完整的口诀，心境也因此沉了下来。',
        effects: { cultivation: 8, mentalState: 4, spiritSense: 1 },
      },
    ],
  },
  'blackwind-ghost-lantern': {
    id: 'blackwind-ghost-lantern',
    locationId: 'blackwind-valley',
    title: '风里的无灯人',
    eyebrow: 'BLACKWIND VALLEY · 黑风谷',
    summary: '乱石滩深处亮起一盏没有灯芯的青灯。灯后站着一个模糊的人影，只抬手指向两条不同的谷路。',
    choices: [
      {
        id: 'take-the-lamp',
        label: '接过青灯',
        summary: '青灯落进掌心便冷得刺骨。你借它照见一处藏在风后的石缝，里面有一页残卷。',
        effects: { techniqueFragments: 1, spiritStones: 8, mentalState: -5, karma: 2 },
      },
      {
        id: 'ask-the-way',
        label: '先问它要去哪里',
        summary: '人影没有回答，只把手指向来路。你沿原路退回，却在脚印旁捡到一块温热的灵石。',
        effects: { spiritStones: 10, mentalState: 3, fortune: 1 },
      },
    ],
  },
  'nameless-reversed-name': {
    id: 'nameless-reversed-name',
    locationId: 'nameless-well',
    title: '井壁上的倒名',
    eyebrow: 'NAMELESS WELL · 无名古井',
    summary: '火光照到井壁最深处时，你发现那里刻着一个倒写的名字。它的最后一笔，恰好和你名字中的一笔相同。',
    choices: [
      {
        id: 'touch-the-name',
        label: '伸手触碰刻痕',
        summary: '指尖贴上石壁后，一段不属于你的记忆短暂亮起。你没有看懂，却记住了其中的呼吸节奏。',
        effects: { techniqueFragments: 2, cultivation: 6, mentalState: -6, karma: 2 },
      },
      {
        id: 'erase-the-name',
        label: '抹去最后一笔',
        summary: '你用灵力擦掉那一笔，井底的回声立刻安静下来，胸口却像少了一块一直压着的石头。',
        effects: { mentalState: 6, spiritSense: -1, karma: -2, fortune: 1 },
      },
    ],
  },
  'nameless-empty-lantern': {
    id: 'nameless-empty-lantern',
    locationId: 'nameless-well',
    title: '井底的空灯',
    eyebrow: 'NAMELESS WELL · 无名古井',
    summary: '暗槽里放着一盏空灯，灯腹刻着“借火一刻，偿梦一生”。井底没有火，却有一根刚刚熄灭的灯芯。',
    choices: [
      {
        id: 'light-with-spirit',
        label: '用灵力点灯',
        summary: '灯火照亮井壁上密密麻麻的旧字，你从其中取下一页残卷，却听见自己的心跳慢了一拍。',
        effects: { techniqueFragments: 2, spiritSense: 1, mentalState: -4, karma: 1 },
      },
      {
        id: 'leave-the-lamp',
        label: '不替它续火',
        summary: '你把空灯放回原处，只在灯下找到几枚被潮气浸亮的灵石，随后立即离开井底。',
        effects: { spiritStones: 14, mentalState: 2, fortune: -1, karma: -1 },
      },
    ],
  },
};

export const getExplorationEvent = (eventId: ExplorationEventId) => EXPLORATION_EVENTS[eventId];

export const getExplorationEventsForLocation = (locationId: ExplorationLocationId) =>
  Object.values(EXPLORATION_EVENTS).filter((event) => event.locationId === locationId);
