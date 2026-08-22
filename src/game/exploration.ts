import type { ExplorationEventId, ExplorationLocationId, GameState } from './types';

export type ExplorationLocation = {
  id: ExplorationLocationId;
  label: string;
  icon: string;
  image: string;
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
    image: '/assets/locations/qingstone-mountain.png',
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
    image: '/assets/locations/blackwind-valley.png',
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
    image: '/assets/locations/nameless-well.png',
    summary: '井底没有水，只有一圈听不懂的回声，和一条通往旧事的暗线。',
    atmosphere: '井口望下去深不见底，偶尔会传来像是你自己说过的话。',
    recommendation: '炼气六层后再深入',
    risk: '风险：高 · 可能影响心境与因果',
    durationMinutes: 35,
    reward: '稀有功法残页、因果线索、灵石',
    unlockHint: '完成一次黑风谷探索后开放',
  },
  'cloudbreak-ridge': {
    id: 'cloudbreak-ridge',
    label: '云岫古道',
    icon: '云',
    image: '/assets/locations/cloudbreak-ridge.png',
    summary: '石阶悬在云海之上，残破山门后藏着只对筑基修士显形的旧路。',
    atmosphere: '晨光越过群峰，云雾间偶尔亮起一线像是前世留下的灵痕。',
    recommendation: '筑基后完成三次试炼',
    risk: '风险：筑基 · 选择会回应本世旧事',
    durationMinutes: 45,
    reward: '大量修为、功法残页、长期剧情标记',
    unlockHint: '筑基后完成三次筑基试炼开放',
  },
};

export const isExplorationLocationUnlocked = (
  state: GameState,
  locationId: ExplorationLocationId,
) => state.discoveredLocations.includes(locationId);

export const getExplorationLocation = (locationId?: ExplorationLocationId) =>
  EXPLORATION_LOCATIONS[locationId ?? 'qingstone-mountain'];

export type WorldSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WorldWeatherId = 'clear' | 'rain' | 'wind' | 'mist';
export type WorldOmenId = 'quiet-stars' | 'falling-stars' | 'red-moon';

export type WorldCycle = {
  seasonId: WorldSeasonId;
  seasonLabel: string;
  weatherId: WorldWeatherId;
  weatherLabel: string;
  omenId: WorldOmenId;
  omenLabel: string;
  summary: string;
};

const SEASONS: Array<{ id: WorldSeasonId; label: string; summary: string }> = [
  { id: 'spring', label: '春生', summary: '草木先于人间醒来，灵脉也更容易露出细微的纹路。' },
  { id: 'summer', label: '夏盛', summary: '日火旺盛，适合追踪灵兽和淬炼体魄。' },
  { id: 'autumn', label: '秋藏', summary: '风里藏着旧事，残碑、落叶与被掩住的线索更容易重见天日。' },
  { id: 'winter', label: '冬寂', summary: '万物收声，只有神识足够敏锐的人还能听见雪下的回响。' },
];

const WEATHER = [
  { id: 'clear' as const, label: '晴空', summary: '天光开阔，远处的微小变化也无处藏身。' },
  { id: 'rain' as const, label: '灵雨', summary: '雨丝带着淡淡灵气，泥土和石缝里都有新的气息。' },
  { id: 'wind' as const, label: '罡风', summary: '风势忽紧忽松，适合寻找被吹散、也可能被吹醒的东西。' },
  { id: 'mist' as const, label: '山雾', summary: '雾气遮住了远路，却会把近处的痕迹放大。' },
];

const OMENS = [
  { id: 'quiet-stars' as const, label: '星河静', summary: '星位沉默，因果暂时没有明显的偏转。' },
  { id: 'falling-stars' as const, label: '流星雨', summary: '天外有光坠落，旧地图上没有标注的地方可能短暂显形。' },
  { id: 'red-moon' as const, label: '赤月照井', summary: '赤月映在水与石上，和名字、回声有关的旧事更容易浮出。' },
];

export const getWorldCycle = (state: GameState): WorldCycle => {
  const ageDay = Math.max(0, Math.floor(state.character.ageDays));
  const dayOfYear = ageDay % 360;
  const season = SEASONS[Math.floor(dayOfYear / 90) % SEASONS.length];
  const weather = WEATHER[Math.floor(dayOfYear / 15) % WEATHER.length];
  const omen = OMENS[Math.floor(dayOfYear / 30) % OMENS.length];
  return {
    seasonId: season.id,
    seasonLabel: season.label,
    weatherId: weather.id,
    weatherLabel: weather.label,
    omenId: omen.id,
    omenLabel: omen.label,
    summary: `${season.summary}${weather.summary}${omen.summary}`,
  };
};

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
  consequenceHint?: string;
};

export type ExplorationEventDefinition = {
  id: ExplorationEventId;
  locationId: ExplorationLocationId;
  title: string;
  eyebrow: string;
  summary: string;
  choices: ExplorationEventChoice[];
  repeatable?: boolean;
  condition?: (state: GameState) => boolean;
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
        consequenceHint: '这枚铜铃可能在筑基后再次回应',
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
  'qingstone-spring-rain': {
    id: 'qingstone-spring-rain',
    locationId: 'qingstone-mountain',
    title: '春雨落进旧药圃',
    eyebrow: 'SEASONAL TRACE · 春生灵雨',
    summary: '春雨沿着山脊落下，旧药圃里有一层新泥正在缓慢呼吸。你可以趁雨势未停，把这场灵气留在自己身上，也可以把它还给山野。',
    repeatable: true,
    condition: (state) => {
      const cycle = getWorldCycle(state);
      return cycle.seasonId === 'spring' && cycle.weatherId === 'rain';
    },
    choices: [
      {
        id: 'drink-spring-rain',
        label: '引雨入脉',
        summary: '你盘坐在药圃边，让雨水顺着灵脉走过一周天。泥土里的灵草也因此长得更稳。',
        effects: { herbs: 2, cultivation: 6, mentalState: 1 },
      },
      {
        id: 'follow-spring-roots',
        label: '顺雨找根',
        summary: '你沿着雨水汇聚的方向挖出一截旧根，根须上残留着不属于这一季的灵力。',
        effects: { spiritSense: 1, herbs: 1, karma: 1 },
      },
      {
        id: 'shelter-spring-rain',
        label: '在树下避雨',
        summary: '你没有急着取巧，只在树洞里发现几枚被雨水洗亮的灵石。',
        effects: { spiritStones: 6, mentalState: 2, fortune: -1 },
      },
    ],
  },
  'qingstone-star-moth': {
    id: 'qingstone-star-moth',
    locationId: 'qingstone-mountain',
    title: '流星落在蝶翼上',
    eyebrow: 'CELESTIAL OMEN · 流星雨',
    summary: '流星划过山口时，一群银色山蛾忽然离开树影，像是要带你去看一处刚刚被天光擦亮的石台。',
    repeatable: true,
    condition: (state) => getWorldCycle(state).omenId === 'falling-stars',
    choices: [
      {
        id: 'follow-star-moths',
        label: '跟随银蛾',
        summary: '银蛾落在一方新裂的石台上，石缝中凝着一点天外微尘。',
        effects: { techniqueFragments: 1, spiritSense: 1, cultivation: 4 },
      },
      {
        id: 'catch-star-dust',
        label: '收起星尘',
        summary: '你用灵石承住落尘，星光很快熄灭，却留下了一点稳定的暖意。',
        effects: { spiritStones: -3, fortune: 2, mentalState: 2 },
      },
    ],
  },
  'qingstone-root-script': {
    id: 'qingstone-root-script',
    locationId: 'qingstone-mountain',
    title: '树根下的无字诀',
    eyebrow: 'CONDITION TRACE · 根骨渐成',
    summary: '你用手掌按住老树根部时，才发现树皮下藏着一段无字口诀。它不传声音，只传一种让身体先于意识记住的节奏。',
    condition: (state) => state.character.attributes.physique >= 12,
    choices: [
      {
        id: 'learn-root-script',
        label: '让身体记住它',
        summary: '你没有强行拆解口诀，而是让每一次呼吸都贴着树根的节奏走。根骨因此更沉，气息也更稳。',
        effects: { physique: 1, cultivation: 14, mentalState: 2 },
      },
      {
        id: 'copy-root-script',
        label: '把它抄成残页',
        summary: '你将无字诀拓在薄纸上，纸面只留下三道浅痕，却足够让后来者继续追问。',
        effects: { techniqueFragments: 2, spiritSense: 1, karma: 1 },
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
  'blackwind-wind-tide': {
    id: 'blackwind-wind-tide',
    locationId: 'blackwind-valley',
    title: '罡风换了一口气',
    eyebrow: 'WEATHER TRACE · 黑风罡潮',
    summary: '黑风谷的风忽然停了一瞬，下一口气却从地底涌上来。碎石在风中排成一条只存在片刻的路。',
    repeatable: true,
    condition: (state) => getWorldCycle(state).weatherId === 'wind',
    choices: [
      {
        id: 'hold-wind-line',
        label: '站在风口不退',
        summary: '你用根骨撑住身体，风过之后才发现袖口里多了一枚被磨圆的灵石。',
        effects: { physique: 1, spiritStones: 8, mentalState: -2 },
      },
      {
        id: 'read-wind-path',
        label: '记下风路',
        summary: '你不与罡风硬碰，只记住它每一次转折。那条路后来在脑中化成了一页残缺的阵图。',
        effects: { techniqueFragments: 1, spiritSense: 1, karma: 1 },
      },
    ],
  },
  'blackwind-sand-map': {
    id: 'blackwind-sand-map',
    locationId: 'blackwind-valley',
    title: '秋沙写成一张地图',
    eyebrow: 'SEASONAL TRACE · 秋藏风沙',
    summary: '秋风把细沙吹过断碑，短暂露出一张没有终点的地图。地图上的每一处红点，都像有人刚刚走过。',
    repeatable: true,
    condition: (state) => getWorldCycle(state).seasonId === 'autumn',
    choices: [
      {
        id: 'trace-sand-map',
        label: '沿红点走一段',
        summary: '你跟着红点走到一处废弃石室，里面只剩一小袋灵石，却没有留下脚印的人。',
        effects: { spiritStones: 12, cultivation: 5, fortune: 1 },
      },
      {
        id: 'copy-sand-map',
        label: '先把地图记下',
        summary: '你没有急着追踪，而是把每一条风痕记进神识。回头时，地图已经被秋沙重新盖住。',
        effects: { techniqueFragments: 2, spiritSense: 1, mentalState: 2 },
      },
    ],
  },
  'blackwind-sealed-word': {
    id: 'blackwind-sealed-word',
    locationId: 'blackwind-valley',
    title: '石缝里有人封了一句话',
    eyebrow: 'CONDITION TRACE · 神识过谷',
    summary: '你的神识穿过断碑底部时，听见石缝里传来半句话。那不是风声，而是有人在很久以前，把一句提醒封进了山里。',
    condition: (state) => state.character.attributes.spiritSense >= 14 && state.character.realm.stage >= 3,
    choices: [
      {
        id: 'unseal-the-word',
        label: '解开封字',
        summary: '封字裂开后，一段关于黑风谷旧主的记录浮出石面。你只取走最关键的几笔。',
        effects: { techniqueFragments: 3, cultivation: 12, karma: 1 },
      },
      {
        id: 'guard-the-word',
        label: '替它继续守口',
        summary: '你没有把旧事带出山谷，只在封字旁留下自己的灵息，让它不至于被风磨平。',
        effects: { mentalState: 5, fortune: 2, karma: 2 },
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
  'nameless-moon-tide': {
    id: 'nameless-moon-tide',
    locationId: 'nameless-well',
    title: '赤月让井水有了影子',
    eyebrow: 'CELESTIAL OMEN · 赤月照井',
    summary: '井底本来没有水，赤月升起后，石面却映出一层薄薄的红光。那光里有一个不属于你的影子，正等着你先开口。',
    repeatable: true,
    condition: (state) => getWorldCycle(state).omenId === 'red-moon',
    choices: [
      {
        id: 'answer-the-shadow',
        label: '向影子报上名字',
        summary: '影子没有回答，却把一枚灵石推到你脚边。你意识到井底记住的也许不是名字，而是回应。',
        effects: { spiritStones: 9, karma: 1, mentalState: -2 },
      },
      {
        id: 'watch-the-shadow',
        label: '只看不答',
        summary: '你守住沉默，影子最终自行散去，石壁上留下了一行短暂可见的呼吸口诀。',
        effects: { spiritSense: 2, techniqueFragments: 1, fortune: 1 },
      },
    ],
  },
  'nameless-starfall': {
    id: 'nameless-starfall',
    locationId: 'nameless-well',
    title: '井底接住一颗星',
    eyebrow: 'CELESTIAL OMEN · 流星入井',
    summary: '流星雨经过时，一点天光穿过井口，没有坠入石底，反而停在半空。它照亮了三条只存在于这一刻的旧路。',
    repeatable: true,
    condition: (state) => getWorldCycle(state).omenId === 'falling-stars',
    choices: [
      {
        id: 'touch-the-fallen-star',
        label: '伸手触星',
        summary: '星光在你掌心化成一段陌生记忆，记忆没有主人，却留下了可以反复推演的灵息。',
        effects: { cultivation: 10, spiritSense: 1, mentalState: -4 },
      },
      {
        id: 'let-star-return',
        label: '让它回到天上',
        summary: '你没有把天外之物据为己有。星光离开前，井壁上短暂显出一枚指向出口的符号。',
        effects: { fortune: 3, karma: 2, spiritStones: 6 },
      },
    ],
  },
  'nameless-true-name': {
    id: 'nameless-true-name',
    locationId: 'nameless-well',
    title: '回声把真名还给你',
    eyebrow: 'CONDITION TRACE · 因果回潮',
    summary: '你的因果线积到足够深时，井底终于没有模仿你的声音。它用一种更古老的语气，叫出了一个你从未告诉过任何人的名字。',
    condition: (state) => state.character.attributes.karma >= 3 && state.social.relationships['nameless-soul'].affinity >= 20,
    choices: [
      {
        id: 'accept-the-true-name',
        label: '承认这个名字',
        summary: '你没有追问名字从何而来，只把它收进心底。井底的回声因此少了一层敌意。',
        effects: { techniqueFragments: 3, spiritSense: 2, mentalState: 3, karma: -2 },
      },
      {
        id: 'refuse-the-true-name',
        label: '拒绝替它命名',
        summary: '你认为名字应当由自己走出来，而不是从井底领取。回声沉默片刻，留下了一点不属于任何人的气运。',
        effects: { fortune: 3, cultivation: 8, karma: 1 },
      },
    ],
  },
  'cloudbreak-stone-gate': {
    id: 'cloudbreak-stone-gate',
    locationId: 'cloudbreak-ridge',
    title: '山门只认走过的路',
    eyebrow: 'CLOUDBREAK RIDGE · 云岫古道',
    summary: '残破山门没有门扇，只有三道被云水磨浅的刻痕。你靠近时，它们依次映出青石山、黑风谷和无名古井。',
    choices: [
      { id: 'carve-this-life', label: '刻下本世名字', summary: '你不借前人的名号，只把这一世的名字留在最浅的一道石痕里。', effects: { cultivation: 28, mentalState: 4, karma: 1 } },
      { id: 'read-old-marks', label: '先读旧日刻痕', summary: '你沿着旧痕辨认前人的呼吸，残缺的运气法门在识海中重新连成一页。', effects: { techniqueFragments: 3, spiritSense: 2, mentalState: -2 } },
    ],
  },
  'cloudbreak-red-thread': {
    id: 'cloudbreak-red-thread',
    locationId: 'cloudbreak-ridge',
    title: '红线越过云海',
    eyebrow: 'CHOICE ECHO · 铃声的后文',
    summary: '一根褪色红线从山脚一直系到云上。你认出它与青石山树梢的铜铃同出一处，只是这一次，线的另一端系着一扇门。',
    condition: (state) => state.story.worldFlags.includes('exploration:qingstone-red-bell:climb-for-bell'),
    choices: [
      { id: 'return-the-bell', label: '把铜铃还给云门', summary: '铃声终于找到归处，门后送来一阵温和灵风，替你梳理了尚未稳固的道基。', effects: { cultivation: 36, mentalState: 5, karma: 2 } },
      { id: 'keep-the-bell', label: '留下铜铃继续前行', summary: '你把铃声留作自己的路标。它不再指向过去，而开始回应更远处的山风。', effects: { fortune: 3, spiritSense: 2, techniqueFragments: 2 } },
    ],
  },
  'cloudbreak-name-echo': {
    id: 'cloudbreak-name-echo',
    locationId: 'cloudbreak-ridge',
    title: '云海念出旧名',
    eyebrow: 'CHOICE ECHO · 无名之后',
    summary: '云海深处有人念出一个曾在古井中出现的名字。那不是召唤，更像是在问：你最终替谁保留了它。',
    condition: (state) => state.story.worldFlags.some((flag) => flag.startsWith('person:nameless-well-ending:')),
    choices: [
      { id: 'answer-for-the-soul', label: '替残魂回应', summary: '你替那段没有主人认领的旧事应了一声，云中因果随之松开一个结。', effects: { karma: -2, cultivation: 32, mentalState: 3 } },
      { id: 'answer-as-yourself', label: '只报自己的名字', summary: '你没有替任何前尘作答。云海散开时，一道属于你自己的路出现在脚下。', effects: { fortune: 3, spiritSense: 2, cultivation: 20 } },
    ],
  },
};

export const getExplorationEvent = (eventId: ExplorationEventId) => EXPLORATION_EVENTS[eventId];

export const getExplorationEventsForLocation = (locationId: ExplorationLocationId) =>
  Object.values(EXPLORATION_EVENTS).filter((event) => event.locationId === locationId);
