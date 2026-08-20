import { ACTIONS, MAX_OFFLINE_MINUTES, REAL_MINUTE_TO_GAME_DAYS } from './content';
import {
  CAVE_BUILDINGS,
  createCave,
  getActionDurationMinutes,
  getCaveEffects,
  getUpgradeCost,
  settleCave,
} from './cave';
import {
  EXPLORATION_LOCATIONS,
  getExplorationEvent,
  getExplorationEventsForLocation,
  getExplorationLocation,
} from './exploration';
import {
  createSocialState,
  getPersonEvent,
  getRelationshipStatus,
  getSectEffects,
  getSectExchange,
  getSectMission,
  PERSON_EVENTS,
  RELATIONSHIPS,
  SECTS,
} from './people';
import { createLedgerEntry } from './save';
import {
  CULTIVATION_SCHOOLS,
  createCultivationPath,
  createTechniqueProgress,
  getActiveTechnique,
  getTechniqueEffects,
  getTechniqueForSchool,
  getTechniqueProgress,
  TECHNIQUE_DEFINITIONS,
} from './techniques';
import type {
  ActionType,
  CaveBuildingId,
  CultivationSchoolId,
  ExplorationEventId,
  ExplorationLocationId,
  GameState,
  LedgerEntry,
  LifeSummary,
  PersonEventId,
  SectId,
  SectExchangeId,
  SectMissionId,
  SettlementResult,
} from './types';

const MINUTE_MS = 60_000;

const hasTalent = (state: GameState, talentId: string) =>
  state.character.talents.some((talent) => talent.id === talentId);

const hasCompletedPersonEvent = (state: GameState, eventId: PersonEventId) =>
  state.social.completedPersonEventIds.includes(eventId);

const getNextPersonEvent = (
  state: GameState,
  action: GameState['character']['currentAction'],
) => {
  if (state.social.pendingPersonEvent || !action) return null;

  if (
    action.type === 'explore' &&
    !hasCompletedPersonEvent(state, 'lin-qiu-caravan')
  ) {
    return PERSON_EVENTS['lin-qiu-caravan'];
  }
  if (
    action.type === 'explore' &&
    hasCompletedPersonEvent(state, 'lin-qiu-caravan') &&
    !hasCompletedPersonEvent(state, 'lin-qiu-ledger') &&
    state.social.relationships['lin-qiu'].affinity >= 10
  ) {
    return PERSON_EVENTS['lin-qiu-ledger'];
  }
  if (
    action.type === 'study' &&
    state.cultivationPath.schoolId &&
    !hasCompletedPersonEvent(state, 'xuan-song-lesson')
  ) {
    return PERSON_EVENTS['xuan-song-lesson'];
  }
  if (
    action.type === 'sect_mission' &&
    state.social.sect.sectId &&
    hasCompletedPersonEvent(state, 'xuan-song-lesson') &&
    !hasCompletedPersonEvent(state, 'xuan-song-mountain-gate') &&
    state.social.relationships['xuan-song'].affinity >= 10
  ) {
    return PERSON_EVENTS['xuan-song-mountain-gate'];
  }
  if (
    action.type === 'explore' &&
    action.locationId === 'nameless-well' &&
    !hasCompletedPersonEvent(state, 'nameless-well-soul')
  ) {
    return PERSON_EVENTS['nameless-well-soul'];
  }
  if (
    action.type === 'explore' &&
    action.locationId === 'nameless-well' &&
    hasCompletedPersonEvent(state, 'nameless-well-soul') &&
    !hasCompletedPersonEvent(state, 'nameless-well-echo') &&
    state.social.relationships['nameless-soul'].affinity >= 10
  ) {
    return PERSON_EVENTS['nameless-well-echo'];
  }
  return null;
};

const hasCompletedExplorationEvent = (state: GameState, eventId: ExplorationEventId) =>
  state.completedExplorationEventIds.includes(eventId);

const getNextExplorationEvent = (
  state: GameState,
  action: GameState['character']['currentAction'],
) => {
  if (state.pendingExplorationEvent || !action || action.type !== 'explore' || !action.locationId) {
    return null;
  }

  const availableEvents = getExplorationEventsForLocation(action.locationId).filter(
    (event) => !hasCompletedExplorationEvent(state, event.id),
  );
  if (availableEvents.length === 0) return null;

  const eventChance = state.completedExplorationEventIds.length === 0
    ? 1
    : hasTalent(state, 'solitary-star')
      ? 0.75
      : 0.45;
  if (Math.random() > eventChance) return null;
  return pick(availableEvents);
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

const endLife = (
  state: GameState,
  deathReason: LifeSummary['deathReason'],
  endedAt: number,
): LedgerEntry => {
  const character = state.character;
  const lifeNumber = Math.max(state.legacy?.lifeCount ?? 0, state.pastLives?.length ?? 0) + 1;
  const summary: LifeSummary = {
    lifeNumber,
    characterName: character.name,
    deathReason,
    endedAt,
    ageDays: character.ageDays,
    lifespanDays: character.lifespanDays,
    realm: structuredClone(character.realm),
    discoveredLocationCount: state.discoveredLocations.length,
    discoveredRelationshipCount: Object.values(state.social.relationships)
      .filter((relationship) => relationship.discovered).length,
    sectId: state.social.sect.sectId,
    keyEvents: state.ledger
      .filter((entry) => ['breakthrough', 'exploration', 'relationship'].includes(entry.category))
      .slice(0, 8)
      .map((entry) => entry.title),
  };

  state.lifeStatus = 'dead';
  state.lifeSummary = summary;
  state.pastLives = [...(state.pastLives ?? []), summary].slice(-20);
  state.legacy = {
    lifeCount: lifeNumber,
    discoveredLocations: Array.from(new Set([
      ...(state.legacy?.discoveredLocations ?? []),
      ...state.discoveredLocations.filter(
        (locationId): locationId is ExplorationLocationId =>
          locationId === 'qingstone-mountain' ||
          locationId === 'blackwind-valley' ||
          locationId === 'nameless-well',
      ),
    ])),
    techniqueFragments: Math.min(3, Math.max(0, state.inventory.techniqueFragments)),
    previousLifeNames: [...(state.legacy?.previousLifeNames ?? []), character.name].slice(-20),
  };
  character.currentAction = null;
  state.pendingExplorationEvent = null;
  state.social.pendingPersonEvent = null;

  const ageYears = Math.floor(character.ageDays / 365);
  return createLedgerEntry(
    'death',
    '本世终章',
    `${character.name}在${ageYears}岁时走完了这一世。长生簿合上最后一页，却替你保留了这段人生走过的山河与名字。`,
    ['终章', '寿元耗尽', `第${lifeNumber}世`],
    endedAt,
  );
};

const MEDITATE_RESULTS = [
  '窗纸外的天色换了几回，你始终守着一口气。灵气没有喧宾夺主，却在经脉深处留下了细细的暖意。',
  '你在蒲团上坐定，听见檐角落下一滴水。等那滴水声重复了许多遍，丹田里的灵气也恰好走完一周天。',
  '山雾从石缝里钻进来，在你肩头停了一会儿。你没有睁眼，反而借着这点清凉把散乱的念头一一收拢。',
  '今天没有天降异象，只有经脉里一圈比一圈顺畅的灵气。修仙大概就是这样，先把寻常日子过出一点不寻常。',
];

const TEMPER_WITH_HERB_RESULTS = [
  '你把灵草揉碎敷在关节和脊背，药力沿着骨缝一寸寸散开。疼痛没有立刻消失，却让每一次呼吸都变得更有重量。',
  '灵草的苦味在舌根化开，你引灵气撞过几处旧滞。等皮肤上的热意退下去，身体像换了一副更结实的架子。',
  '你没有追求声势，只把药力送到最细小的经络。几个周天之后，连坐起身时都能察觉到根骨里多了一点沉稳。',
];

const TEMPER_WITHOUT_HERB_RESULTS = [
  '手边没有灵草，你只好用最笨的办法以灵气磨脉。进展慢得几乎看不见，但骨缝里的酸意说明这一步并没有白费。',
  '没有药力帮忙，淬体变成了和疼痛讨价还价。你收功时浑身发热，至少让根骨记住了这次冲刷。',
];

const INSIGHT_RESULTS = [
  '你把纷乱的念头一一放下，终于听见灵气经过神识时极轻的一声回响。它没有带来立刻的修为，却让下一次呼吸有了方向。',
  '窗外的风吹过三次，你才发现自己一直在追逐一个并不存在的答案。停下来之后，功法里那处被忽略的转折反而清楚了。',
  '你没有强行推演口诀，只观察心境起伏与灵气涨落。等杂念沉到底部，识海里浮出一线清明，足够照亮今天的路。',
];

const OVERDRIVE_INJURY_RESULTS = [
  '你把灵气压得太狠，丹田像被一只无形的手攥紧。最后一刻虽然收住了功，手臂内侧仍传来一阵细密的刺痛。',
  '经脉深处响起一声不太吉利的轻裂声。你及时散去冲势，没让伤势继续扩大，只是这次冒险留下了明晃晃的警告。',
  '灵气冲得比预想更快，几乎撞开了闭塞的关窍。代价是气血翻涌了半晌，连指尖都带着麻意。',
];

const OVERDRIVE_SAFE_RESULTS = [
  '你把灵气一层层压缩，直到丹田像一枚将鸣未鸣的玉钟。险些失控时，你果断收功，竟从危险边缘捞回了一大截修为。',
  '经脉发出危险的鸣响，洞府里的烛火也跟着摇了三次。好在你没有贪最后一口气，退得及时，反而留下了丰厚积累。',
  '这一回你像是在刀锋上走了一趟：脚下每一步都险，却没有踩空。收功之后，胸口仍在发热，丹田却比平日充盈许多。',
];

const EXPLORE_RESULTS = [
  (herbs: number, stones: number) => `青石山昨夜下过雨，你在一块翻起的青苔下摸到灵草 ${herbs} 株。猎户棚的门槛旁还压着几枚灵石，风一吹，远处又传来那阵不合时宜的铃声。`,
  (herbs: number, stones: number) => `你顺着山鸟惊起的方向钻进矮林，发现一条被藤蔓遮住的旧路。路边的石缝里长着灵草 ${herbs} 株，碎石堆中还藏着灵石 ${stones} 枚。`,
  (herbs: number, stones: number) => `半山腰起了薄雾，你在雾里跟着一串浅浅的脚印走到废弃猎户棚。脚印在那里突然消失，只留下灵草 ${herbs} 株和灵石 ${stones} 枚。`,
  (herbs: number, stones: number) => `你本想抄近路下山，却被一只叼着红果的山狐带到背阴岩缝。它叼走红果后扬长而去，岩缝里则留下灵草 ${herbs} 株与灵石 ${stones} 枚。`,
  (herbs: number, stones: number) => `旧铃声在山风里忽远忽近。你循声走了半日，只找到一截锈断的铃舌，却也在旁边翻出灵草 ${herbs} 株和灵石 ${stones} 枚。`,
];

const BLACKWIND_RESULTS = [
  (herbs: number, stones: number, fragments: number) => `黑风卷着砂砾撞过谷底，你在一块断碑后找到灵草 ${herbs} 株和灵石 ${stones} 枚。碑阴还夹着${fragments > 0 ? `一页功法残页` : '几片写满鬼画符的石屑'}。`,
  (herbs: number, stones: number, fragments: number) => `你跟着风里若有若无的哭声走到乱石滩，声音最后只剩下风。好在石缝里有灵草 ${herbs} 株、灵石 ${stones} 枚${fragments > 0 ? '，以及一页被撕掉半角的残卷' : ''}。`,
  (herbs: number, stones: number, fragments: number) => `谷中黑风忽然停了一瞬，露出一条埋在砂下的旧栈道。你从栈道尽头带回灵草 ${herbs} 株、灵石 ${stones} 枚${fragments > 0 ? '和一页不知谁留下的功法残页' : ''}。`,
];

const WELL_RESULTS = [
  (stones: number, fragments: number, shaken: boolean) => `无名古井里没有水，只有一声声迟到的回音。你从井壁暗槽取出灵石 ${stones} 枚和${fragments} 页残卷${shaken ? '，代价是离开时发现自己的影子慢了半拍' : '，暂时没有惊动井底的东西'}。`,
  (stones: number, fragments: number, shaken: boolean) => `你把火折子探入井中，火光照出一行倒写的字。井底藏着灵石 ${stones} 枚与${fragments} 页残卷${shaken ? '，那行字也在你心里留下了一道擦不掉的痕迹' : '，回声却在你转身后才说出自己的名字'}。`,
  (stones: number, fragments: number, shaken: boolean) => `井下的风从脚底往上吹，带来一股旧纸和湿土的味道。你取走灵石 ${stones} 枚、残卷 ${fragments} 页${shaken ? '，并在耳边听见了一个不属于今夜的回答' : '，没有再向更深处探问'}。`,
];

const STUDY_WITH_HERB_RESULTS = [
  '安神香燃到一半时，残卷上的缺口竟像被烟气勾出了轮廓。你没能补全口诀，却看出它和某种古老的吐纳法同源。',
  '你把残卷摊在灯下，先用药香压住杂念，再逐字推敲。第三处断裂处藏着一个反常的转折，像有人故意把真正的门留在了纸外。',
  '药香让昏沉的脑子清醒了些。你从一堆互不相干的字句里拼出一条暗线：这门功法修的，似乎不只是丹田里的灵气。',
  '夜深时，残卷上的墨迹被烛火照得发红。你终于理顺其中一段呼吸法，只是最后一句仍像被谁从岁月里抹去了。',
];

const STUDY_WITHOUT_HERB_RESULTS = [
  '没有安神香，残卷上的字像一群乱飞的蚊虫。你强行记下几句，回过神时却发现自己把“聚气”看成了“聚财”。',
  '你忍着杂念研读残卷，窗外一声犬吠便能让思路断上半刻。好在仍抢救出几句口诀，暂时不至于空手而归。',
  '缺了药香压神，残卷读起来格外费力。你只抓住了其中一小段，但那段口诀在脑中盘旋许久，仿佛不肯轻易离开。',
];

const BREAKTHROUGH_HINTS = [
  '丹田里的灵气已经挤到了关隘前，像一群不肯安分的鱼。继续打磨根基，或许能让下一次冲关更稳。',
  '你察觉到瓶颈边缘出现了一道细缝。它还不是通往更高境界的路，却已经足够让人听见门后的风声。',
  '灵气在经脉中来回冲刷，终于把关隘磨出了棱角。现在是继续蓄力，还是趁热叩门，由你决定。',
];

const ACTION_PLAN_NOTES: Record<ActionType, readonly string[]> = {
  meditate: [
    '你把蒲团摆正，先从最稳妥的一口气开始。',
    '不求奇效，只求每一周天都走得比上一周更顺。',
    '今日的功课已经排下，山中风声会替你数着呼吸。',
  ],
  temper: [
    '你把灵草、热水和一方干净的石板摆好，准备先让身体学会承受灵气。',
    '修为不是只有丹田里的数字。你决定花一点时间，把根骨也磨成可靠的底子。',
    '你按住经脉里想要乱窜的灵气，从最疼的一处开始，一寸一寸地淬炼自己。',
  ],
  insight: [
    '你暂时合上残卷，给心神留出一小块不被口诀占满的地方。',
    '今天不急着把修为往前推。你想先看看，究竟是什么让自己的呼吸总在同一处走偏。',
    '你点起一盏清灯，准备在灵气和念头之间，找回那条容易被忽略的细线。',
  ],
  overdrive: [
    '你决定把经脉逼到极限，成与不成，今晚都要见分晓。',
    '这不是一趟适合胆小鬼的功课。你把心境压稳，开始向关窍发力。',
    '先把退路记在心里，再去借一借灵脉深处那股不太驯服的力量。',
  ],
  explore: [
    '你带上药篓和火折子，往选定的山路出发。今天会藏着什么，只有风知道。',
    '灵草不会自己走进药篓，旧故事也不会自己翻页。你决定亲自去问问这片山。',
    '这次探索不设大志：找到东西最好，听见故事也不亏。',
  ],
  study: [
    '你把残卷、灯盏和一份安神香摆好，准备和断裂的口诀耗上一阵。',
    '今晚的对手不是妖兽，而是残卷上缺掉的字，以及你自己的走神。',
    '你决定再读一遍那些不肯说完整话的口诀，看看它究竟藏了什么。',
  ],
  sect_mission: [
    '宗门令牌在袖中微微发热，看来今天的差事不打算自己完成。',
    '你把任务简报读了两遍，确认上面没有写“必死”二字，便收好行囊出发。',
    '门中长老说得轻描淡写，仿佛山路、阵眼和妖兽都只是纸上的墨点。',
  ],
};

const CAVE_PRODUCTION_RESULTS = [
  '你离开期间，聚灵阵吸来一缕清灵之气，灵田里的叶尖也挂满了露珠。洞府把这份收获安静地存了起来。',
  '石窟里无人说话，阵纹却一圈圈亮过。灵气和草木都没有偷懒，回来时已有一小笔产出等你签收。',
  '夜里风穿过洞口，带动阵旗轻响。等你再次查看长生簿，洞府已经替你攒下了一些修为与灵草。',
];

const CAVE_UNLOCK_RESULTS = [
  '第一次探索带回的不只是灵草和灵石。你在山脚找到一处背风石窟，洞口虽窄，里面的灵气却比野外安稳得多。',
  '那阵铃声把你引到一面断崖后。清理掉碎石后，一间天然石室露了出来——不算洞天福地，但至少不会漏雨。',
  '你在猎户旧棚后发现一条被藤根封住的石缝。石缝尽头有一方干燥小室，恰好够放下蒲团，也够放下一个修仙梦。',
];

const CAVE_COLLECTION_RESULTS = [
  '你打开储物石室，把聚灵阵吐纳出的灵气和灵田养熟的灵草收拢起来。洞府第一次像是有了真正的主人。',
  '阵盘上的微光逐渐熄下，你将积攒的灵气引入丹田，又把灵草扎成一束，顺手挂在洞口晾晒。',
  '收获不算惊天动地，却很踏实：一部分进了经脉，一部分进了药篓。修仙的家底，就是这样一点点攒出来的。',
];

const actionResult = (state: GameState, actionType: ActionType, completedAt: number) => {
  const { character, inventory } = state;
  const caveEffects = getCaveEffects(state.cave);
  const techniqueEffects = getTechniqueEffects(state.cultivationPath);
  const sectEffects = getSectEffects(state.social.sect.sectId);
  const entries: LedgerEntry[] = [];
  let cultivationGain = 0;
  let body = '';
  let title = `${ACTIONS[actionType].label}完成`;
  let newlyDiscoveredLocation: ExplorationLocationId | null = null;
  const changes: string[] = [];

  if (actionType === 'meditate') {
    cultivationGain = 18 + Math.floor(character.attributes.comprehension / 5);
    if (hasTalent(state, 'awakened-vein')) cultivationGain += 8;
    cultivationGain = Math.floor(
      cultivationGain * caveEffects.cultivationMultiplier * (1 + techniqueEffects.cultivationMultiplier + sectEffects.cultivationMultiplier),
    );
    title = pick(['一轮周天归于平稳', '蒲团上的安静功课', '灵气走过一周天', '今日吐纳无惊无险']);
    body = pick(MEDITATE_RESULTS);
    changes.push(`修为 +${cultivationGain}`);
  }

  if (actionType === 'temper') {
    const hasHerb = inventory.herbs > 0;
    if (hasHerb) inventory.herbs -= 1;
    const physiqueGain = hasHerb ? 2 : 1;
    cultivationGain = (hasHerb ? 14 : 8) + Math.floor(character.attributes.spiritSense / 6);
    cultivationGain = Math.floor(
      cultivationGain * caveEffects.cultivationMultiplier * (1 + techniqueEffects.cultivationMultiplier + sectEffects.cultivationMultiplier),
    );
    character.attributes.physique += physiqueGain;
    character.attributes.mentalState = Math.max(
      0,
      Math.min(100, character.attributes.mentalState + (hasHerb ? 1 : -1)),
    );
    title = hasHerb ? pick(['药力入骨', '一轮淬体归稳', '根骨添了一分沉意']) : pick(['无药磨脉', '硬熬一轮淬体', '以灵气锻身']);
    body = hasHerb ? pick(TEMPER_WITH_HERB_RESULTS) : pick(TEMPER_WITHOUT_HERB_RESULTS);
    changes.push(
      ...[
        `修为 +${cultivationGain}`,
        `根骨 +${physiqueGain}`,
        hasHerb ? '灵草 -1' : '心境 -1',
        hasHerb ? '心境 +1' : '',
      ].filter(Boolean),
    );
  }

  if (actionType === 'insight') {
    cultivationGain = 6 + Math.floor(character.attributes.comprehension / 6);
    cultivationGain = Math.floor(
      cultivationGain * caveEffects.cultivationMultiplier * (1 + techniqueEffects.cultivationMultiplier + sectEffects.cultivationMultiplier),
    );
    character.attributes.comprehension += 1;
    character.attributes.spiritSense += 1;
    character.attributes.mentalState = Math.min(100, character.attributes.mentalState + 6);
    title = pick(['识海微明', '静观所得', '念头沉入清水', '一线悟处']);
    body = pick(INSIGHT_RESULTS);
    changes.push('悟性 +1', '神识 +1', '心境 +6', `修为 +${cultivationGain}`);
    const techniqueProgress = getTechniqueProgress(state.cultivationPath);
    if (techniqueProgress) {
      const proficiencyGain = 4 + techniqueEffects.studyProficiencyBonus;
      techniqueProgress.proficiency = Math.min(100, techniqueProgress.proficiency + proficiencyGain);
      changes.push(`熟练度 +${proficiencyGain}`);
    }
  }

  if (actionType === 'overdrive') {
    cultivationGain = 36 + Math.floor(character.attributes.comprehension / 4);
    cultivationGain = Math.floor(
      cultivationGain * caveEffects.cultivationMultiplier * (1 + techniqueEffects.cultivationMultiplier + sectEffects.cultivationMultiplier),
    );
    const injured = Math.random() < 0.25;
    character.attributes.mentalState = Math.max(0, character.attributes.mentalState - 5);
    title = injured ? pick(['经脉微裂', '险招留下的刺痛', '强行运功，略受反噬']) : pick(['险中取进', '刀锋上的一轮运功', '压住了那口险气']);
    body = injured ? pick(OVERDRIVE_INJURY_RESULTS) : pick(OVERDRIVE_SAFE_RESULTS);
    changes.push(`修为 +${cultivationGain}`, '心境 -5');
    if (injured) {
      character.attributes.physique = Math.max(1, character.attributes.physique - 1);
      changes.push('根骨 -1');
    }
  }

  if (actionType === 'explore') {
    const locationId = state.character.currentAction?.locationId ?? 'qingstone-mountain';
    const location = getExplorationLocation(locationId);

    if (locationId === 'qingstone-mountain') {
      const herbGain = hasTalent(state, 'herbal-heart') ? randomInt(2, 4) : randomInt(1, 3);
      const stoneGain = (hasTalent(state, 'sword-intent') ? randomInt(5, 10) : randomInt(3, 8)) + techniqueEffects.explorationStoneBonus + sectEffects.explorationStoneBonus;
      inventory.herbs += herbGain;
      inventory.spiritStones += stoneGain;
      cultivationGain = 5;
      title = pick(['青石山回响', '山雾里的旧脚印', '铃声引路', '猎户棚遗物', '山狐留下的路标']);
      body = pick(EXPLORE_RESULTS)(herbGain, stoneGain);
      changes.push(`灵草 +${herbGain}`, `灵石 +${stoneGain}`, '修为 +5');
    }

    if (locationId === 'blackwind-valley') {
      const herbGain = hasTalent(state, 'herbal-heart') ? randomInt(1, 3) : randomInt(0, 2);
      const stoneGain = (hasTalent(state, 'sword-intent') ? randomInt(10, 18) : randomInt(6, 14)) + techniqueEffects.explorationStoneBonus + sectEffects.explorationStoneBonus;
      const fragmentGain = Math.random() < (hasTalent(state, 'perfect-memory') ? 0.65 : 0.4) ? 1 : 0;
      const injured = Math.random() < 0.22;
      const mentalLoss = Math.random() < 0.3 ? 4 : 0;
      inventory.herbs += herbGain;
      inventory.spiritStones += stoneGain;
      inventory.techniqueFragments += fragmentGain;
      cultivationGain = 12;
      title = pick(['黑风过碑', '谷底拾遗', '风里有字', '乱石滩归来']);
      body = pick(BLACKWIND_RESULTS)(herbGain, stoneGain, fragmentGain);
      changes.push(`灵草 +${herbGain}`, `灵石 +${stoneGain}`, '修为 +12');
      if (fragmentGain > 0) changes.push(`功法残页 +${fragmentGain}`);
      if (mentalLoss > 0) {
        character.attributes.mentalState = Math.max(0, character.attributes.mentalState - mentalLoss);
        changes.push(`心境 -${mentalLoss}`);
      }
      if (injured) {
        character.attributes.physique = Math.max(1, character.attributes.physique - 1);
        changes.push('根骨 -1');
      }
    }

    if (locationId === 'nameless-well') {
      const stoneGain = randomInt(10, 20);
      const fragmentGain = hasTalent(state, 'perfect-memory') ? randomInt(1, 3) : randomInt(1, 2);
      const shaken = Math.random() < 0.3;
      const karmaGain = Math.random() < 0.5 ? 1 : -1;
      inventory.spiritStones += stoneGain;
      inventory.techniqueFragments += fragmentGain;
      cultivationGain = 10;
      character.attributes.karma += karmaGain;
      title = pick(['井底回声', '无名之字', '迟到的回答', '井中取火']);
      body = pick(WELL_RESULTS)(stoneGain, fragmentGain, shaken);
      changes.push(`灵石 +${stoneGain}`, `功法残页 +${fragmentGain}`, '修为 +10', `因果 ${karmaGain > 0 ? '+' : ''}${karmaGain}`);
      if (shaken) {
        character.attributes.mentalState = Math.max(0, character.attributes.mentalState - 8);
        changes.push('心境 -8');
      }
    }

    const nextLocationId: ExplorationLocationId | null =
      locationId === 'qingstone-mountain'
        ? 'blackwind-valley'
        : locationId === 'blackwind-valley'
          ? 'nameless-well'
          : null;
    if (nextLocationId && !state.discoveredLocations.includes(nextLocationId)) {
      state.discoveredLocations.push(nextLocationId);
      newlyDiscoveredLocation = nextLocationId;
      changes.push(`发现：${EXPLORATION_LOCATIONS[nextLocationId].label}`);
    }

    if (!body) body = `${location.label}的风把你的脚印吹散了，但没有空手而归。`;
  }

  if (actionType === 'study') {
    const hasHerb = inventory.herbs > 0;
    if (hasHerb) inventory.herbs -= 1;
    const fragmentGain = (hasTalent(state, 'perfect-memory') ? 2 : 1) + techniqueEffects.studyFragmentBonus + sectEffects.studyFragmentBonus;
    inventory.techniqueFragments += fragmentGain;
    character.attributes.comprehension += 1;
    cultivationGain = 8;
    title = hasHerb ? pick(['残卷露出暗线', '烛火下的断句', '安神香未尽', '功法缺口']) : pick(['没有安神香的研读', '残卷与蚊虫齐飞', '勉强记下几句']);
    body = hasHerb ? pick(STUDY_WITH_HERB_RESULTS) : pick(STUDY_WITHOUT_HERB_RESULTS);
    changes.push(`功法残页 +${fragmentGain}`, '悟性 +1', '修为 +8');
    const techniqueProgress = getTechniqueProgress(state.cultivationPath);
    if (techniqueProgress) {
      const proficiencyGain = 8 + Math.floor(character.attributes.comprehension / 10) + techniqueEffects.studyProficiencyBonus + sectEffects.studyProficiencyBonus;
      techniqueProgress.proficiency = Math.min(100, techniqueProgress.proficiency + proficiencyGain);
      changes.push(`熟练度 +${proficiencyGain}`);
    }
  }

  if (actionType === 'sect_mission') {
    const missionId = state.character.currentAction?.missionId;
    const mission = missionId ? getSectMission(missionId) : null;
    if (mission && state.social.sect.sectId === mission.sectId) {
      const rewards = mission.rewards;
      inventory.spiritStones += rewards.spiritStones ?? 0;
      inventory.herbs += rewards.herbs ?? 0;
      inventory.techniqueFragments += rewards.techniqueFragments ?? 0;
      character.realm.cultivation += rewards.cultivation ?? 0;
      state.social.sect.reputation += rewards.reputation;
      state.social.sect.contribution += rewards.contribution;
      const risky = mission.id.endsWith('escort') || mission.id.endsWith('cure') || mission.id.endsWith('seal');
      const suffered = risky && Math.random() < 0.22;
      if (suffered) {
        character.attributes.mentalState = Math.max(0, character.attributes.mentalState - 4);
      }
      title = `${mission.title}完成`;
      body = `${mission.summary}你把任务交回宗门，门中执事没有夸你，只在名册上多添了一笔。${suffered ? '回程时的一点意外让你心神不宁了片刻。' : '这回没有留下多余的伤口。'}`;
      changes.push(
        `宗门声望 +${rewards.reputation}`,
        `宗门贡献 +${rewards.contribution}`,
        rewards.spiritStones ? `灵石 +${rewards.spiritStones}` : '',
        rewards.herbs ? `灵草 +${rewards.herbs}` : '',
        rewards.techniqueFragments ? `功法残页 +${rewards.techniqueFragments}` : '',
        rewards.cultivation ? `修为 +${rewards.cultivation}` : '',
        suffered ? '心境 -4' : '',
      );
    } else {
      title = '宗门令未能对上名册';
      body = '你带着一枚没有归属的令牌走了半天，最后只好把它放回桌上。长生簿没有替你虚报这笔功劳。';
    }
  }

  character.realm.cultivation += cultivationGain;
  const entry = createLedgerEntry(
    actionType === 'explore' ? 'exploration' : actionType === 'sect_mission' ? 'relationship' : 'action',
    title,
    body,
    changes,
    completedAt,
  );
  entries.push(entry);

  if (newlyDiscoveredLocation) {
    const discoveredLocation = EXPLORATION_LOCATIONS[newlyDiscoveredLocation];
    entries.push(
      createLedgerEntry(
        'system',
        `新地点：${discoveredLocation.label}`,
        `${discoveredLocation.label}已经出现在长生簿的边角。${discoveredLocation.atmosphere}${discoveredLocation.unlockHint}。`,
        ['探索解锁', discoveredLocation.recommendation],
        completedAt,
      ),
    );
  }

  if (character.realm.cultivation >= character.realm.cultivationRequired) {
    entries.push(
      createLedgerEntry(
        'breakthrough',
        '关隘露出缝隙',
        pick(BREAKTHROUGH_HINTS),
        ['突破', '待处理'],
        completedAt,
      ),
    );
  }

  return entries;
};

export const settleGame = (input: GameState, now = Date.now()): SettlementResult => {
  const state = structuredClone(input);
  state.lifeStatus = state.lifeStatus ?? 'alive';
  state.pastLives = state.pastLives ?? [];
  state.legacy = state.legacy ?? {
    lifeCount: state.pastLives.length,
    discoveredLocations: [],
    techniqueFragments: 0,
    previousLifeNames: [],
  };
  if (state.lifeStatus === 'dead') {
    return { state, newEntries: [] };
  }
  state.cultivationPath = state.cultivationPath ?? createCultivationPath();
  state.social = state.social ?? createSocialState();
  state.pendingExplorationEvent = state.pendingExplorationEvent ?? null;
  state.completedExplorationEventIds = state.completedExplorationEventIds ?? [];
  const newEntries: LedgerEntry[] = [];
  const elapsedMs = now - state.lastSettledAt;

  const settledCave = settleCave(state.cave ?? createCave(now), now);
  state.cave = settledCave.cave;
  if (settledCave.produced.cultivation > 0 || settledCave.produced.herbs > 0) {
    newEntries.push(
      createLedgerEntry(
        'action',
        pick(['洞府替你守了一夜', '石室里攒下了一点东西', '阵旗微亮，灵田有收成', '归来时的洞府回信']),
        pick(CAVE_PRODUCTION_RESULTS),
        [
          settledCave.produced.cultivation > 0
            ? `待收修为 +${settledCave.produced.cultivation}`
            : '',
          settledCave.produced.herbs > 0 ? `待收灵草 +${settledCave.produced.herbs}` : '',
        ].filter(Boolean),
        now,
      ),
    );
  }

  if (elapsedMs < 0) {
    state.lastSettledAt = now;
    newEntries.push(
      createLedgerEntry(
        'system',
        '天机紊乱',
        '长生簿察觉到时间向后退了一步。本次没有结算离线收益，修行仍需顺应真实流逝的时间。',
        ['时间异常'],
        now,
      ),
    );
    state.ledger = [...newEntries, ...state.ledger].slice(0, 100);
    return { state, newEntries };
  }

  const cappedElapsedMs = Math.min(elapsedMs, MAX_OFFLINE_MINUTES * MINUTE_MS);
  if (state.character.currentAction) {
    state.character.ageDays += (cappedElapsedMs / MINUTE_MS) * REAL_MINUTE_TO_GAME_DAYS;
  }

  if (state.character.currentAction && now >= state.character.currentAction.endsAt) {
    const completedAction = state.character.currentAction;
    newEntries.push(...actionResult(state, completedAction.type, completedAction.endsAt));
    if (state.social.sect.sectId) {
      state.social.sect.contribution += 1;
    }
    state.character.currentAction = null;

    if (state.character.ageDays < state.character.lifespanDays) {
      const personEvent = getNextPersonEvent(state, completedAction);
      if (personEvent) {
        state.social.pendingPersonEvent = {
          eventId: personEvent.id,
          createdAt: completedAction.endsAt,
        };
        state.social.relationships[personEvent.relationshipId].discovered = true;
        newEntries.push(
          createLedgerEntry(
            'relationship',
            `人物事件：${personEvent.title}`,
            personEvent.summary,
            ['待处理', personEvent.eyebrow],
            completedAction.endsAt,
          ),
        );
      }
      const explorationEvent = !personEvent && !state.social.pendingPersonEvent
        ? getNextExplorationEvent(state, completedAction)
        : null;
      if (explorationEvent) {
        state.pendingExplorationEvent = {
          eventId: explorationEvent.id,
          createdAt: completedAction.endsAt,
        };
        newEntries.push(
          createLedgerEntry(
            'exploration',
            `探索抉择：${explorationEvent.title}`,
            explorationEvent.summary,
            ['待处理', explorationEvent.eyebrow],
            completedAction.endsAt,
          ),
        );
      }
      if (
        completedAction.type === 'explore' &&
        !state.cave.unlocked
      ) {
        state.cave = createCave(completedAction.endsAt, true);
        newEntries.push(
          createLedgerEntry(
            'action',
            pick(['寻得一处归处', '石窟初成', '洞府终于有门了']),
            pick(CAVE_UNLOCK_RESULTS),
            ['洞府解锁', '可建造'],
            completedAction.endsAt,
          ),
        );
      }
    }
  }

  if (state.character.ageDays >= state.character.lifespanDays) {
    newEntries.push(endLife(state, 'lifespan_exhausted', now));
  }

  state.lastSettledAt = now;
  state.ledger = [...newEntries, ...state.ledger].slice(0, 100);
  return { state, newEntries };
};

export const startAction = (
  input: GameState,
  type: ActionType,
  now = Date.now(),
  locationId: ExplorationLocationId = 'qingstone-mountain',
  missionId?: SectMissionId,
): GameState => {
  const state = structuredClone(input);
  const selectedLocationId = state.discoveredLocations.includes(locationId)
    ? locationId
    : 'qingstone-mountain';
  const selectedLocation = type === 'explore' ? getExplorationLocation(selectedLocationId) : null;
  const duration = getActionDurationMinutes(type, state.cave, selectedLocationId, state.social?.sect?.sectId ?? null, missionId) * MINUTE_MS;
  state.character.currentAction = {
    id: `${now}-${type}`,
    type,
    startedAt: now,
    endsAt: now + duration,
    ...(type === 'explore' ? { locationId: selectedLocationId } : {}),
    ...(type === 'sect_mission' && missionId ? { missionId } : {}),
  };
  state.lastSettledAt = now;
  state.ledger = [
    createLedgerEntry(
      'system',
      `已安排：${ACTIONS[type].label}`,
      `${pick(ACTION_PLAN_NOTES[type])}${selectedLocation ? `${selectedLocation.label}：${selectedLocation.summary}` : ACTIONS[type].description}预计在 ${getActionDurationMinutes(type, state.cave, selectedLocationId, state.social?.sect?.sectId ?? null, missionId)} 分钟后完成。你可以关闭网页，回来时查看结果。`,
      [ACTIONS[type].label, selectedLocation?.risk ?? ACTIONS[type].risk],
      now,
    ),
    ...state.ledger,
  ].slice(0, 100);
  return state;
};

export const startSectMission = (
  input: GameState,
  missionId: SectMissionId,
  now = Date.now(),
): SocialMutationResult => {
  const state = structuredClone(input);
  state.social = state.social ?? createSocialState();
  const mission = getSectMission(missionId);
  if (!mission || state.social.sect.sectId !== mission.sectId) {
    return { state, newEntries: [], error: '这项差事不属于你当前的宗门。' };
  }
  if (state.character.currentAction) {
    return { state, newEntries: [], error: '你正在进行另一项行动，暂时无法接下宗门任务。' };
  }
  if (state.pendingExplorationEvent || state.social.pendingPersonEvent) {
    return { state, newEntries: [], error: '请先处理眼前的事件，再接下新的宗门任务。' };
  }
  return {
    state: startAction(state, 'sect_mission', now, 'qingstone-mountain', missionId),
    newEntries: [],
  };
};

export type TechniqueMutationResult = {
  state: GameState;
  newEntries: LedgerEntry[];
  error?: string;
};

export const chooseCultivationSchool = (
  input: GameState,
  schoolId: CultivationSchoolId,
  now = Date.now(),
): TechniqueMutationResult => {
  const state = structuredClone(input);
  state.cultivationPath = state.cultivationPath ?? createCultivationPath();
  if (state.cultivationPath.schoolId) {
    return { state, newEntries: [], error: '这一世已经选定流派，不能再改修。' };
  }

  const school = CULTIVATION_SCHOOLS[schoolId];
  const technique = getTechniqueForSchool(schoolId);
  if (!school || !technique) {
    return { state, newEntries: [], error: '暂时找不到这条修行路。' };
  }

  state.cultivationPath.schoolId = schoolId;
  state.cultivationPath.activeTechniqueId = technique.id;
  state.cultivationPath.techniques[technique.id] = createTechniqueProgress(technique);
  const entry = createLedgerEntry(
    'action',
    `踏入${school.label}一脉`,
    `你把散落的功法残页重新整理，选定了${technique.name}作为这一世的入门功法。${technique.summary}`,
    [school.label, technique.name, '入门分支已掌握'],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const researchTechniqueBranch = (
  input: GameState,
  branchId: string,
  now = Date.now(),
): TechniqueMutationResult => {
  const state = structuredClone(input);
  state.cultivationPath = state.cultivationPath ?? createCultivationPath();
  const technique = getActiveTechnique(state.cultivationPath);
  const progress = getTechniqueProgress(state.cultivationPath);
  if (!technique || !progress) {
    return { state, newEntries: [], error: '请先选择一条流派并开始研读入门功法。' };
  }

  const branch = technique.branches.find((candidate) => candidate.id === branchId);
  if (!branch) {
    return { state, newEntries: [], error: '这条研究分支尚未记录在残卷中。' };
  }

  const alreadyUnlocked = progress.unlockedBranchIds.includes(branch.id);
  if (!alreadyUnlocked) {
    if (progress.proficiency < branch.requiredProficiency) {
      return { state, newEntries: [], error: `熟练度达到 ${branch.requiredProficiency} 后才能研究这条分支。` };
    }
    if (state.inventory.techniqueFragments < branch.costTechniqueFragments) {
      return { state, newEntries: [], error: `还需要 ${branch.costTechniqueFragments} 页功法残页才能展开这条分支。` };
    }
    state.inventory.techniqueFragments -= branch.costTechniqueFragments;
    progress.unlockedBranchIds.push(branch.id);
  }
  progress.activeBranchId = branch.id;
  const entry = createLedgerEntry(
    'action',
    `${alreadyUnlocked ? '转修' : '研究'}：${branch.label}`,
    `你沿着${technique.name}的残缺脉络继续推演，${branch.summary}${alreadyUnlocked ? '这条路已经走过一次，如今重新拾起也不算陌生。' : '新的运转方式终于在脑中成形。'}`,
    [technique.name, branch.label, alreadyUnlocked ? '切换分支' : `功法残页 -${branch.costTechniqueFragments}`],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export type SocialMutationResult = {
  state: GameState;
  newEntries: LedgerEntry[];
  error?: string;
};

export type ExplorationMutationResult = {
  state: GameState;
  newEntries: LedgerEntry[];
  error?: string;
};

export const resolveExplorationEvent = (
  input: GameState,
  choiceId: string,
  now = Date.now(),
): ExplorationMutationResult => {
  const state = structuredClone(input);
  const pendingEvent = state.pendingExplorationEvent;
  if (!pendingEvent) {
    return { state, newEntries: [], error: '现在没有需要回应的探索事件。' };
  }

  const event = getExplorationEvent(pendingEvent.eventId);
  const choice = event?.choices.find((candidate) => candidate.id === choiceId);
  if (!event || !choice) {
    return { state, newEntries: [], error: '这条探索事件的选项已经失效。' };
  }

  const effects = choice.effects;
  const inventoryChecks: Array<keyof GameState['inventory']> = [
    'spiritStones',
    'herbs',
    'techniqueFragments',
  ];
  if (inventoryChecks.some((key) => state.inventory[key] + (effects[key] ?? 0) < 0)) {
    return { state, newEntries: [], error: '手边材料不够，无法选择这项处理方式。' };
  }

  state.inventory.spiritStones += effects.spiritStones ?? 0;
  state.inventory.herbs += effects.herbs ?? 0;
  state.inventory.techniqueFragments += effects.techniqueFragments ?? 0;
  state.character.realm.cultivation += effects.cultivation ?? 0;
  state.character.attributes.physique = Math.max(
    1,
    state.character.attributes.physique + (effects.physique ?? 0),
  );
  state.character.attributes.spiritSense = Math.max(
    1,
    state.character.attributes.spiritSense + (effects.spiritSense ?? 0),
  );
  state.character.attributes.mentalState = Math.max(
    0,
    Math.min(100, state.character.attributes.mentalState + (effects.mentalState ?? 0)),
  );
  state.character.attributes.fortune += effects.fortune ?? 0;
  state.character.attributes.karma += effects.karma ?? 0;
  state.completedExplorationEventIds = state.completedExplorationEventIds ?? [];
  if (!state.completedExplorationEventIds.includes(event.id)) {
    state.completedExplorationEventIds = [...state.completedExplorationEventIds, event.id];
  }
  state.pendingExplorationEvent = null;

  const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  const changes = [
    effects.spiritStones ? `灵石 ${signed(effects.spiritStones)}` : '',
    effects.herbs ? `灵草 ${signed(effects.herbs)}` : '',
    effects.techniqueFragments ? `功法残页 ${signed(effects.techniqueFragments)}` : '',
    effects.cultivation ? `修为 ${signed(effects.cultivation)}` : '',
    effects.physique ? `根骨 ${signed(effects.physique)}` : '',
    effects.spiritSense ? `神识 ${signed(effects.spiritSense)}` : '',
    effects.mentalState ? `心境 ${signed(effects.mentalState)}` : '',
    effects.fortune ? `气运 ${signed(effects.fortune)}` : '',
    effects.karma ? `因果 ${signed(effects.karma)}` : '',
  ].filter(Boolean);
  const entry = createLedgerEntry(
    'exploration',
    `${event.title}：${choice.label}`,
    `${choice.summary}这一次选择已经写入长生簿，山路也因此留下了一道新的岔口。`,
    changes,
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const resolvePersonEvent = (
  input: GameState,
  choiceId: string,
  now = Date.now(),
): SocialMutationResult => {
  const state = structuredClone(input);
  state.social = state.social ?? createSocialState();
  const pendingEvent = state.social.pendingPersonEvent;
  if (!pendingEvent) {
    return { state, newEntries: [], error: '现在没有需要回应的人物事件。' };
  }

  const event = getPersonEvent(pendingEvent.eventId);
  const choice = event.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    return { state, newEntries: [], error: '这条人物事件的选项已经失效。' };
  }

  if (
    (choice.effects.spiritStones ?? 0) < 0 &&
    state.inventory.spiritStones + (choice.effects.spiritStones ?? 0) < 0
  ) {
    return { state, newEntries: [], error: '手边灵石不够，无法选择这项处理方式。' };
  }

  const relationship = state.social.relationships[event.relationshipId];
  relationship.affinity = Math.max(-100, Math.min(100, relationship.affinity + choice.effects.affinity));
  relationship.interactionCount += 1;
  relationship.status = getRelationshipStatus(relationship.affinity);
  relationship.discovered = true;

  const effects = choice.effects;
  state.inventory.spiritStones += effects.spiritStones ?? 0;
  state.inventory.herbs += effects.herbs ?? 0;
  state.inventory.techniqueFragments += effects.techniqueFragments ?? 0;
  state.character.realm.cultivation += effects.cultivation ?? 0;
  state.character.attributes.mentalState = Math.max(
    0,
    Math.min(100, state.character.attributes.mentalState + (effects.mentalState ?? 0)),
  );
  state.character.attributes.karma += effects.karma ?? 0;
  state.character.attributes.fortune += effects.fortune ?? 0;
  if (effects.sectInvitation) state.social.sect.invited = true;
  if (effects.sectReputation && state.social.sect.sectId) {
    state.social.sect.reputation = Math.max(0, state.social.sect.reputation + effects.sectReputation);
  }

  state.social.completedPersonEventIds = [
    ...state.social.completedPersonEventIds,
    event.id,
  ];
  state.social.pendingPersonEvent = null;

  const changes = [
    `${RELATIONSHIPS[event.relationshipId].name}好感 ${effects.affinity > 0 ? '+' : ''}${effects.affinity}`,
    effects.spiritStones ? `灵石 ${effects.spiritStones > 0 ? '+' : ''}${effects.spiritStones}` : '',
    effects.herbs ? `灵草 ${effects.herbs > 0 ? '+' : ''}${effects.herbs}` : '',
    effects.techniqueFragments ? `功法残页 ${effects.techniqueFragments > 0 ? '+' : ''}${effects.techniqueFragments}` : '',
    effects.cultivation ? `修为 +${effects.cultivation}` : '',
    effects.mentalState ? `心境 ${effects.mentalState > 0 ? '+' : ''}${effects.mentalState}` : '',
    effects.karma ? `因果 ${effects.karma > 0 ? '+' : ''}${effects.karma}` : '',
    effects.fortune ? `气运 ${effects.fortune > 0 ? '+' : ''}${effects.fortune}` : '',
    effects.sectInvitation ? '获得宗门引荐' : '',
    effects.sectReputation ? `宗门声望 ${effects.sectReputation > 0 ? '+' : ''}${effects.sectReputation}` : '',
  ].filter(Boolean);
  const entry = createLedgerEntry(
    'relationship',
    `${RELATIONSHIPS[event.relationshipId].name}：${choice.label}`,
    `${choice.summary}你与${RELATIONSHIPS[event.relationshipId].name}的关系变为“${relationship.status}”。`,
    changes,
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const joinSect = (
  input: GameState,
  sectId: SectId,
  now = Date.now(),
): SocialMutationResult => {
  const state = structuredClone(input);
  state.social = state.social ?? createSocialState();
  const sect = SECTS[sectId];
  if (!sect) return { state, newEntries: [], error: '这座宗门尚未出现在你的行路簿上。' };
  if (state.social.sect.sectId) {
    return { state, newEntries: [], error: `你已经是${SECTS[state.social.sect.sectId].name}弟子，不能再拜入别宗。` };
  }
  if (!state.social.sect.invited) {
    return { state, newEntries: [], error: '还没有人替你写下引荐。先完成玄松道人的人物事件。' };
  }

  state.social.sect.sectId = sectId;
  state.social.sect.joinedAt = now;
  state.social.sect.contribution = 0;
  const entry = createLedgerEntry(
    'relationship',
    `拜入${sect.name}`,
    `${sect.motto}你在玄松道人的引荐下入了${sect.name}。宗门不会替你修行，但会让你少走一些不必要的弯路。`,
    ['宗门', sect.name, '初入门墙'],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const exchangeSectReputation = (
  input: GameState,
  exchangeId: SectExchangeId,
  now = Date.now(),
): SocialMutationResult => {
  const state = structuredClone(input);
  state.social = state.social ?? createSocialState();
  if (!state.social.sect.sectId) {
    return { state, newEntries: [], error: '尚未加入宗门，不能使用宗门名册。' };
  }
  const exchange = getSectExchange(exchangeId);
  if (!exchange) return { state, newEntries: [], error: '这项兑换尚未登记在宗门名册上。' };
  if (state.social.sect.reputation < exchange.costReputation) {
    return { state, newEntries: [], error: `还需要 ${exchange.costReputation - state.social.sect.reputation} 点宗门声望。` };
  }

  state.social.sect.reputation -= exchange.costReputation;
  state.inventory.spiritStones += exchange.rewards.spiritStones ?? 0;
  state.inventory.herbs += exchange.rewards.herbs ?? 0;
  state.inventory.techniqueFragments += exchange.rewards.techniqueFragments ?? 0;
  const rewards = [
    exchange.rewards.spiritStones ? `灵石 +${exchange.rewards.spiritStones}` : '',
    exchange.rewards.herbs ? `灵草 +${exchange.rewards.herbs}` : '',
    exchange.rewards.techniqueFragments ? `功法残页 +${exchange.rewards.techniqueFragments}` : '',
  ].filter(Boolean);
  const entry = createLedgerEntry(
    'relationship',
    `宗门兑换：${exchange.label}`,
    `${exchange.summary}名册上的朱砂印记淡了一点，但你手里的东西实在了许多。`,
    [`声望 -${exchange.costReputation}`, ...rewards],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export type CaveMutationResult = {
  state: GameState;
  newEntries: LedgerEntry[];
  error?: string;
};

const settleCaveForMutation = (state: GameState, now: number) => {
  const settled = settleCave(state.cave ?? createCave(now), now);
  state.cave = settled.cave;
  return settled;
};

export const collectCave = (input: GameState, now = Date.now()): CaveMutationResult => {
  const state = structuredClone(input);
  settleCaveForMutation(state, now);

  if (!state.cave.unlocked) {
    return { state, newEntries: [], error: '洞府尚未解锁。完成第一次探索后才能进入。' };
  }

  const collected = { ...state.cave.stored };
  if (collected.cultivation <= 0 && collected.herbs <= 0) {
    return { state, newEntries: [], error: '洞府暂时没有可以收取的产出。' };
  }

  const cultivationBefore = state.character.realm.cultivation;
  state.character.realm.cultivation += collected.cultivation;
  state.inventory.herbs += collected.herbs;
  state.cave.stored = { cultivation: 0, herbs: 0 };

  const entries = [
    createLedgerEntry(
      'action',
      pick(['收好这一笔家底', '洞府今日有所得', '把灵气和灵草带回身边']),
      pick(CAVE_COLLECTION_RESULTS),
      [
        collected.cultivation > 0 ? `修为 +${collected.cultivation}` : '',
        collected.herbs > 0 ? `灵草 +${collected.herbs}` : '',
      ].filter(Boolean),
      now,
    ),
  ];
  if (
    cultivationBefore < state.character.realm.cultivationRequired &&
    state.character.realm.cultivation >= state.character.realm.cultivationRequired
  ) {
    entries.push(
      createLedgerEntry(
        'breakthrough',
        '突破的念头',
        '洞府积攒的灵气汇入丹田，修为已经触及当前瓶颈。你可以继续夯实根基，也可以尝试冲关。',
        ['突破', '待处理'],
        now,
      ),
    );
  }
  state.ledger = [...entries, ...state.ledger].slice(0, 100);
  return { state, newEntries: entries };
};

export const upgradeCaveBuilding = (
  input: GameState,
  buildingId: CaveBuildingId,
  now = Date.now(),
): CaveMutationResult => {
  const state = structuredClone(input);
  settleCaveForMutation(state, now);

  if (!state.cave.unlocked) {
    return { state, newEntries: [], error: '洞府尚未解锁。完成第一次探索后才能建造。' };
  }

  const building = state.cave.buildings[buildingId];
  const nextLevel = building.level + 1;
  const cost = getUpgradeCost(buildingId, nextLevel);
  if (!cost) {
    return { state, newEntries: [], error: '这座建筑已经达到最高等级。' };
  }
  if (state.inventory.spiritStones < cost.spiritStones || state.inventory.herbs < cost.herbs) {
    return { state, newEntries: [], error: '材料不足，暂时无法完成这次建造。' };
  }

  state.inventory.spiritStones -= cost.spiritStones;
  state.inventory.herbs -= cost.herbs;
  building.level = nextLevel;
  const buildingInfo = CAVE_BUILDINGS[buildingId];
  const entry = createLedgerEntry(
    'action',
    pick([
      `${buildingInfo.label}${nextLevel === 1 ? '落成' : '再上一层'}`,
      `洞府添置：${buildingInfo.label}`,
      `${buildingInfo.label}的阵纹亮了起来`,
    ]),
    `你用灵石和灵草重新整理洞府，将${buildingInfo.label}提升到了${nextLevel}级。${pick([
      '新的阵纹刚刻下，石室里的灵气便顺着纹路流动起来。',
      '这回不用担心材料白费，洞府的气息确实比之前稳了一截。',
      '工程不大，却让这处石窟终于有了几分修仙居所的模样。',
    ])}`,
    [`${buildingInfo.label} Lv.${nextLevel}`, `灵石 -${cost.spiritStones}`, `灵草 -${cost.herbs}`],
    now,
  );
  state.ledger = [entry, ...state.ledger].slice(0, 100);
  return { state, newEntries: [entry] };
};

export const tryBreakthrough = (input: GameState, now = Date.now()): SettlementResult => {
  const state = structuredClone(input);
  const { character } = state;
  if (character.realm.cultivation < character.realm.cultivationRequired) {
    return { state, newEntries: [] };
  }

  const chance = Math.min(
    0.92,
    0.45 + character.attributes.mentalState / 200 + character.attributes.comprehension / 300,
  );
  const success = Math.random() < chance;
  const entries: LedgerEntry[] = [];

  if (success) {
    if (character.realm.stage < 12) {
      character.realm.stage += 1;
      character.realm.cultivation -= character.realm.cultivationRequired;
      character.realm.cultivationRequired += 25;
    } else if (character.realm.major === 'qi_refining') {
      character.realm.major = 'foundation_establishment';
      character.realm.stage = 1;
      character.realm.cultivation = 0;
      character.realm.cultivationRequired = 300;
    }
    character.attributes.mentalState = Math.min(100, character.attributes.mentalState + 10);
    entries.push(
      createLedgerEntry(
        'breakthrough',
        pick(['小境界，已过', '丹田一声清鸣', '关隘之后又见新天']),
        pick([
          '灵气冲过关隘，丹田中传来一声清鸣。你回头看去，来时那道门已经退成了很远的一线。',
          '瓶颈像一层薄冰，从脚下悄然碎开。没有天雷，也没有仙人祝贺，但你知道自己已经不是原来的自己。',
          '你没有等到什么惊天动地的异象，只有一口比往常更长的呼吸。吐纳归于平静时，境界已经换了名字。',
        ]),
        ['突破成功'],
        now,
      ),
    );
  } else {
    const mentalLoss = hasTalent(state, 'plain-bone') ? 8 : 15;
    character.attributes.mentalState = Math.max(0, character.attributes.mentalState - mentalLoss);
    entries.push(
      createLedgerEntry(
        'breakthrough',
        pick(['关门未开', '冲关暂止', '瓶颈前收势']),
        pick([
          '你在最后一刻没能稳住心神，积累的灵气散入四肢百骸。关隘没有恶意，只是还不肯让路。',
          '那道门只差半寸便要打开，偏偏心念先乱了一拍。灵气退回经脉，留下的不是伤，而是一堂昂贵的课。',
          '冲势撞上瓶颈后散成细流。你保住了根基，却也明白下一次叩门前，最好先把心里的杂音收拾干净。',
        ]),
        [`心境 -${mentalLoss}`],
        now,
      ),
    );
  }

  state.ledger = [...entries, ...state.ledger].slice(0, 100);
  return { state, newEntries: entries };
};
