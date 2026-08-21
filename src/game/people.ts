import type {
  PersonEventId,
  RelationshipId,
  SectId,
  SectPositionId,
  SectMissionId,
  SectExchangeId,
  SocialState,
} from './types';

export type RelationshipDefinition = {
  id: RelationshipId;
  name: string;
  title: string;
  icon: string;
  portrait: string;
  introduction: string;
  flavor: string;
};

export const RELATIONSHIPS: Record<RelationshipId, RelationshipDefinition> = {
  'lin-qiu': {
    id: 'lin-qiu',
    name: '林秋',
    title: '行脚商人',
    icon: '商',
    portrait: '/assets/characters/lin-qiu.png',
    introduction: '她的货箱里总有一半东西不知从哪里来，另一半则不肯说自己要去哪里。',
    flavor: '愿意把秘密标上价，也愿意为一个可靠的人少算几枚灵石。',
  },
  'xuan-song': {
    id: 'xuan-song',
    name: '玄松道人',
    title: '游方散修',
    icon: '松',
    portrait: '/assets/characters/xuan-song.png',
    introduction: '他在山门之外讲道，手里的拂尘沾着尘土，讲出来的却总是最难的一句。',
    flavor: '不急着收徒，只观察你是否能把听见的道理用在下一次呼吸里。',
  },
  'nameless-soul': {
    id: 'nameless-soul',
    name: '无名残魂',
    title: '井中回声',
    icon: '魂',
    portrait: '/assets/characters/nameless-soul.png',
    introduction: '它没有名字，也没有完整的记忆，只在你转身时比你早半拍说出心里的话。',
    flavor: '它对你越熟悉，井底那些被遗忘的旧事就越愿意浮上来。',
  },
};

export type SectDefinition = {
  id: SectId;
  name: string;
  icon: string;
  motto: string;
  summary: string;
  requirement: string;
  effects: SectEffects;
};

export type SectEffects = {
  cultivationMultiplier: number;
  explorationStoneBonus: number;
  studyFragmentBonus: number;
  studyProficiencyBonus: number;
  studyDurationReduction: number;
};

export type SectPositionDefinition = {
  id: SectPositionId;
  label: string;
  summary: string;
  requiredReputation: number;
  requiredContribution: number;
  contributionCost: number;
  missionContributionBonus: number;
  effects: Partial<SectEffects>;
};

export const SECT_POSITIONS: Record<SectPositionId, SectPositionDefinition> = {
  'outer-disciple': {
    id: 'outer-disciple',
    label: '外门弟子',
    summary: '先把门中差事做稳，宗门才会把更深一层的名册交给你。',
    requiredReputation: 0,
    requiredContribution: 0,
    contributionCost: 0,
    missionContributionBonus: 0,
    effects: {},
  },
  'inner-disciple': {
    id: 'inner-disciple',
    label: '内门弟子',
    summary: '可以接触更完整的门内传承，日常修炼和研读也会得到正式弟子的照应。',
    requiredReputation: 60,
    requiredContribution: 12,
    contributionCost: 6,
    missionContributionBonus: 1,
    effects: { cultivationMultiplier: 0.03, studyProficiencyBonus: 1 },
  },
  'sect-steward': {
    id: 'sect-steward',
    label: '门中执事',
    summary: '你开始替宗门分担名册和外务，门中资源会更愿意沿着你的名字流动。',
    requiredReputation: 120,
    requiredContribution: 30,
    contributionCost: 15,
    missionContributionBonus: 2,
    effects: { explorationStoneBonus: 2 },
  },
};

export const getSectPosition = (positionId: SectPositionId | null) =>
  positionId ? SECT_POSITIONS[positionId] : null;

export const getNextSectPosition = (positionId: SectPositionId | null) => {
  if (positionId === 'outer-disciple' || !positionId) return SECT_POSITIONS['inner-disciple'];
  if (positionId === 'inner-disciple') return SECT_POSITIONS['sect-steward'];
  return null;
};

export const SECTS: Record<SectId, SectDefinition> = {
  'qingxiao-sword-sect': {
    id: 'qingxiao-sword-sect',
    name: '青霄剑宗',
    icon: '剑',
    motto: '剑出云外，心不向尘。',
    summary: '宗门弟子常年在山路和险境中历练，讲究先活着回来，再谈剑意。',
    requirement: '获得玄松道人的引荐后加入',
    effects: {
      cultivationMultiplier: 0.04,
      explorationStoneBonus: 2,
      studyFragmentBonus: 0,
      studyProficiencyBonus: 0,
      studyDurationReduction: 0,
    },
  },
  'baicao-valley': {
    id: 'baicao-valley',
    name: '百草谷',
    icon: '药',
    motto: '草木有灵，火候无声。',
    summary: '谷中弟子不急着争先，先把每一株草、每一缕药香和每一次失败记清楚。',
    requirement: '获得玄松道人的引荐后加入',
    effects: {
      cultivationMultiplier: 0,
      explorationStoneBonus: 0,
      studyFragmentBonus: 1,
      studyProficiencyBonus: 2,
      studyDurationReduction: 0,
    },
  },
  'tianji-pavilion': {
    id: 'tianji-pavilion',
    name: '天机阁',
    icon: '阵',
    motto: '观星落子，借势而行。',
    summary: '这里不问你从哪座山来，只问你能否从一堆乱线里找出真正的阵眼。',
    requirement: '获得玄松道人的引荐后加入',
    effects: {
      cultivationMultiplier: 0.02,
      explorationStoneBonus: 0,
      studyFragmentBonus: 0,
      studyProficiencyBonus: 1,
      studyDurationReduction: 5,
    },
  },
};

export type PersonEventEffects = {
  affinity: number;
  spiritStones?: number;
  herbs?: number;
  techniqueFragments?: number;
  cultivation?: number;
  physique?: number;
  spiritSense?: number;
  mentalState?: number;
  karma?: number;
  fortune?: number;
  sectInvitation?: boolean;
  sectReputation?: number;
  sectContribution?: number;
};

export type PersonEventChoice = {
  id: string;
  label: string;
  summary: string;
  effects: PersonEventEffects;
};

export type PersonEventDefinition = {
  id: PersonEventId;
  relationshipId: RelationshipId;
  title: string;
  eyebrow: string;
  summary: string;
  choices: PersonEventChoice[];
};

export const PERSON_EVENTS: Record<PersonEventId, PersonEventDefinition> = {
  'lin-qiu-caravan': {
    id: 'lin-qiu-caravan',
    relationshipId: 'lin-qiu',
    title: '货箱里的一封旧信',
    eyebrow: 'LIN QIU · 林秋',
    summary: '第一次探索归来时，你在山脚遇见了林秋。她的货箱少了一枚封好的玉简，却一点也不着急，反而问你有没有在山里听见铃声。',
    choices: [
      {
        id: 'help-search',
        label: '帮她找回玉简',
        summary: '你不急着问报酬，先陪她把脚印追到暮色里。',
        effects: { affinity: 18, spiritStones: 6, karma: 1 },
      },
      {
        id: 'ask-for-route',
        label: '拿黑风谷的路来交换',
        summary: '你告诉她自己听见的铃声，换来一张画得并不太像地图的旧纸。',
        effects: { affinity: 10, spiritStones: 3, techniqueFragments: 1 },
      },
      {
        id: 'decline-business',
        label: '婉拒这桩生意',
        summary: '陌生人的货箱和旧信都太像麻烦，你决定先把自己的脚印看牢。',
        effects: { affinity: -4, fortune: 1 },
      },
    ],
  },
  'xuan-song-lesson': {
    id: 'xuan-song-lesson',
    relationshipId: 'xuan-song',
    title: '松下三问',
    eyebrow: 'XUAN SONG · 玄松道人',
    summary: '你在研读残卷时遇见玄松道人。他没有看你的功法，只问了三个问题：为何修炼、为何探索、为何还没有把这页残卷烧掉。',
    choices: [
      {
        id: 'listen-lesson',
        label: '留下听完一课',
        summary: '道人讲得很慢，慢到你终于发现自己平时漏掉的不是口诀，而是呼吸之间的停顿。',
        effects: { affinity: 18, cultivation: 5, mentalState: 3 },
      },
      {
        id: 'ask-about-sect',
        label: '请教宗门去处',
        summary: '你把残卷收好，认真问他：如果一定要找个地方修行，哪里值得留下。',
        effects: { affinity: 14, sectInvitation: true, techniqueFragments: 1 },
      },
      {
        id: 'leave-quietly',
        label: '谢过后离开',
        summary: '你记下他最后那句没讲完的话，决定先用自己的方式把路走下去。',
        effects: { affinity: 3, mentalState: 1 },
      },
    ],
  },
  'nameless-well-soul': {
    id: 'nameless-well-soul',
    relationshipId: 'nameless-soul',
    title: '井底借灯',
    eyebrow: 'THE NAMELESS ECHO · 无名残魂',
    summary: '无名古井的回声第一次叫出了你的名字。它说井底太暗，想借你识海里的一点灯火，看一眼自己忘掉的那段过去。',
    choices: [
      {
        id: 'lend-consciousness',
        label: '分一缕心神给它',
        summary: '你把神识探进井底，先看见一双不属于你的手，随后看见了漫天落雪。',
        effects: { affinity: 20, techniqueFragments: 2, mentalState: -6, karma: 2 },
      },
      {
        id: 'ask-old-story',
        label: '只问它井中的旧事',
        summary: '你没有把心神交出去，只让它讲述自己还记得的那一小部分。',
        effects: { affinity: 11, spiritStones: 8, karma: 1 },
      },
      {
        id: 'seal-the-well',
        label: '封回井底',
        summary: '你用石块和符纸封住回声，至少今晚不让它跟着你的影子离开。',
        effects: { affinity: -8, mentalState: 4, karma: -1 },
      },
    ],
  },
  'lin-qiu-ledger': {
    id: 'lin-qiu-ledger',
    relationshipId: 'lin-qiu',
    title: '账本上没有的名字',
    eyebrow: 'LIN QIU · 林秋',
    summary: '几次探索之后，林秋在你的洞府门口摊开一册旧账。账页上记着许多已经死去的商队，唯独有一行没有名字，墨迹还新得像昨夜才写下。',
    choices: [
      {
        id: 'trace-the-name',
        label: '陪她查这行字',
        summary: '你们沿着旧账上的几个地名一路查下去，最后发现那不是欠账，而是一封迟到了很多年的求救信。',
        effects: { affinity: 16, spiritStones: 12, karma: 1 },
      },
      {
        id: 'buy-the-ledger',
        label: '买下整册旧账',
        summary: '你付了一笔不算便宜的灵石，把账本收进袖中。林秋说，真正贵的从来不是纸。',
        effects: { affinity: 10, spiritStones: -8, techniqueFragments: 2 },
      },
      {
        id: 'leave-it-alone',
        label: '劝她别再追查',
        summary: '有些名字没有被写进账本，或许正是因为它们不该再被任何人叫醒。',
        effects: { affinity: -6, mentalState: 2 },
      },
    ],
  },
  'xuan-song-mountain-gate': {
    id: 'xuan-song-mountain-gate',
    relationshipId: 'xuan-song',
    title: '山门外的第二封信',
    eyebrow: 'XUAN SONG · 玄松道人',
    summary: '你完成第一次宗门任务后，玄松道人在山门外等你。他看了一眼门中令牌，说真正的考验不是做完差事，而是做完之后还愿不愿意回头看看别人。',
    choices: [
      {
        id: 'ask-for-guidance',
        label: '请他指点下一步',
        summary: '你没有急着邀功，只把任务里最不明白的地方一一问清。',
        effects: { affinity: 14, cultivation: 8, mentalState: 3, sectReputation: 5 },
      },
      {
        id: 'share-reward',
        label: '分他一份任务所得',
        summary: '你把一部分资源放到他手里。道人没有推辞，只说这比漂亮话更像修行。',
        effects: { affinity: 20, spiritStones: -5, sectReputation: 8 },
      },
      {
        id: 'keep-walking',
        label: '谢过后继续赶路',
        summary: '你知道他还会在山门外，于是没有把今天的答案当成唯一答案。',
        effects: { affinity: 4, fortune: 1 },
      },
    ],
  },
  'qingxiao-sword-trial': {
    id: 'qingxiao-sword-trial',
    relationshipId: 'xuan-song',
    title: '剑炉不问来者',
    eyebrow: 'QINGXIAO SWORD SECT · 青霄剑宗',
    summary: '你完成又一次宗门差事后，被带到后山剑炉。这里的剑胚不看修为，只看你是否愿意在无人喝彩时替它挡下第一道火。',
    choices: [
      {
        id: 'guard-the-sword-blank',
        label: '替剑胚挡火',
        summary: '火舌舔过你的袖口，未成形的剑胚却在炉中发出一声清响。执事没有夸你，只把你的名字刻进了试剑册。',
        effects: { affinity: 8, physique: 1, cultivation: 12, sectReputation: 14, sectContribution: 3 },
      },
      {
        id: 'ask-the-sword-question',
        label: '先问剑为何出炉',
        summary: '你没有立刻伸手，而是问剑炉：若剑只为胜负出鞘，是否还值得被人带下山。炉火因此安静了片刻。',
        effects: { affinity: 16, mentalState: 4, sectReputation: 9, sectContribution: 2, karma: 1 },
      },
      {
        id: 'leave-the-sword-blank',
        label: '让它继续无锋',
        summary: '你认为有些剑不必急着开锋。执事虽然不解，却承认你至少没有把自己的答案强塞给一块铁。',
        effects: { affinity: 4, fortune: 1, sectReputation: 5, sectContribution: 5 },
      },
    ],
  },
  'baicao-valley-oath': {
    id: 'baicao-valley-oath',
    relationshipId: 'xuan-song',
    title: '百草夜行',
    eyebrow: 'BAICAO VALLEY · 百草谷',
    summary: '百草谷的夜雨把药圃浇得一片沉默。谷中长老让你在天亮前找出一株会移动的药草，并提醒你：找到它不等于可以把它带走。',
    choices: [
      {
        id: 'protect-the-root',
        label: '护住药草根系',
        summary: '你放弃最省事的采摘办法，沿着雨水重新理顺土脉。药草没有被收入药篓，却在第二天开出了一朵只给你看的花。',
        effects: { affinity: 10, herbs: 3, mentalState: 3, sectReputation: 12, sectContribution: 3 },
      },
      {
        id: 'record-the-medicine',
        label: '只记下药性',
        summary: '你没有带走药草，只把它的气味、叶脉和躲雨的方向完整记下。谷中弟子第一次把你当作可以一起看药的人。',
        effects: { affinity: 18, techniqueFragments: 2, sectReputation: 8, sectContribution: 2 },
      },
      {
        id: 'trade-the-secret',
        label: '拿药性换一枚丹印',
        summary: '你把药草的秘密交给长老，换来一枚尚未启封的丹印。有人说你太会算计，也有人说这正是药修该有的清醒。',
        effects: { affinity: 6, spiritStones: 15, sectReputation: 6, sectContribution: 4, fortune: 1 },
      },
    ],
  },
  'tianji-pavilion-star-chart': {
    id: 'tianji-pavilion-star-chart',
    relationshipId: 'xuan-song',
    title: '星图缺一角',
    eyebrow: 'TIANJI PAVILION · 天机阁',
    summary: '天机阁把你带进一间没有窗的观星室。整幅星图只缺一角，阁中人却说，那一角不是遗失，而是有人故意不让后来者看见。',
    choices: [
      {
        id: 'fill-the-missing-star',
        label: '补上那颗星',
        summary: '你用自己的灵力落下一点微光，星图立刻推演出一条从未记录的山路。阁中人没有阻止，只把这次推演记在你的名下。',
        effects: { affinity: 12, cultivation: 10, karma: 2, sectReputation: 13, sectContribution: 3 },
      },
      {
        id: 'leave-the-blank',
        label: '保留空白',
        summary: '你认为未知本身也是一种坐标，于是没有替星图做完最后一步。观星室里的阵灯因此多亮了一刻。',
        effects: { affinity: 18, mentalState: 5, sectReputation: 9, sectContribution: 2, fortune: 2 },
      },
      {
        id: 'ask-who-erased-it',
        label: '追问抹去星角的人',
        summary: '你不肯满足于补图，反而追问是谁把那颗星抹掉。阁中人第一次收起笑意，承认这件事和一场旧叛离有关。',
        effects: { affinity: 22, techniqueFragments: 2, sectReputation: 5, sectContribution: 5, karma: -1 },
      },
    ],
  },
  'nameless-well-echo': {
    id: 'nameless-well-echo',
    relationshipId: 'nameless-soul',
    title: '回声学会了撒谎',
    eyebrow: 'THE NAMELESS ECHO · 无名残魂',
    summary: '你第二次下到无名古井时，井底先喊了一个陌生人的名字，又立刻改口叫你。无名残魂终于承认：它正在慢慢想起自己曾经骗过谁。',
    choices: [
      {
        id: 'hear-the-lie',
        label: '让它把谎说完',
        summary: '你不急着揭穿它，直到那段谎言自己露出裂缝，井底才掉下一枚沾着旧血的玉扣。',
        effects: { affinity: 16, techniqueFragments: 3, karma: 2 },
      },
      {
        id: 'ask-your-name',
        label: '问它记不记得你的名字',
        summary: '回声沉默了很久，最后说：我记得你每次离开，却还没学会记住你为什么回来。',
        effects: { affinity: 22, mentalState: -3, fortune: 2 },
      },
      {
        id: 'cut-the-echo',
        label: '斩断这段回声',
        summary: '你用灵力斩断井壁上的旧痕，回声第一次没有追出来，只留下半句没说完的话。',
        effects: { affinity: -12, mentalState: 5, karma: -1 },
      },
    ],
  },
  'nameless-well-oath': {
    id: 'nameless-well-oath',
    relationshipId: 'nameless-soul',
    title: '井底的旧誓',
    eyebrow: 'THE NAMELESS ECHO · 无名残魂',
    summary: '筑基试炼归来时，井底的回声第一次越过山风找到你。无名残魂想起了一句旧誓：有人曾答应带它离开，却在最后一刻把它留在了井里。',
    choices: [
      {
        id: 'carry-soul-lantern',
        label: '替它提一盏魂灯',
        summary: '你把试炼场带回的灵光点进井口。那一点火没有照亮井底，却让回声第一次有了可以跟随的方向。',
        effects: { affinity: 18, techniqueFragments: 2, mentalState: -4, karma: 1 },
      },
      {
        id: 'ask-for-price',
        label: '先问它要付什么代价',
        summary: '你没有立刻答应，只把条件摆在井沿。残魂沉默片刻，吐出一枚旧灵石，像是在承认你们还没有熟到可以只谈情分。',
        effects: { affinity: 12, spiritStones: -6, fortune: 2 },
      },
      {
        id: 'refuse-old-oath',
        label: '拒绝替它续誓',
        summary: '旧誓不是你的誓。你让回声留在井底，自己转身离开，只听见它第一次没有追问你的名字。',
        effects: { affinity: -10, mentalState: 4, karma: -2 },
      },
    ],
  },
  'nameless-well-gate': {
    id: 'nameless-well-gate',
    relationshipId: 'nameless-soul',
    title: '井口之外的门',
    eyebrow: 'THE NAMELESS ECHO · 无名残魂',
    summary: '残魂说，井底其实没有门，门一直在你们之间。它需要借你的名字推开门缝，而你也终于看见：门后不是出口，是一段被人故意抹去的旧人生。',
    choices: [
      {
        id: 'open-soul-gate',
        label: '替它推开门缝',
        summary: '你把神识压进那道门缝，门后的雪声倒灌而来。残魂想起了第一个真正属于自己的画面，也把一缕灵气还给了你。',
        effects: { affinity: 20, cultivation: 20, karma: 2, mentalState: -5 },
      },
      {
        id: 'leave-the-seal',
        label: '只留下封门的印记',
        summary: '你不替它打开未知，只在门沿留下可回头的印记。残魂虽然失望，却第一次接受了你的边界。',
        effects: { affinity: 8, spiritStones: 20, mentalState: 3 },
      },
      {
        id: 'erase-the-door',
        label: '抹掉这扇门',
        summary: '你认定有些旧人生不该被重新唤醒，于是用因果之力擦掉门缝。井底安静下来，但那份安静也像一场诀别。',
        effects: { affinity: -20, fortune: 2, karma: -3, mentalState: 6 },
      },
    ],
  },
  'nameless-well-ending': {
    id: 'nameless-well-ending',
    relationshipId: 'nameless-soul',
    title: '给回声一个去处',
    eyebrow: 'THE NAMELESS ECHO · 无名残魂',
    summary: '门后的旧人生终于拼出轮廓：残魂曾经也是一个寻找长生的人，只是把自己的名字、同伴和退路都押在了最后一次冲关上。现在，它把选择交还给你。',
    choices: [
      {
        id: 'give-the-soul-a-name',
        label: '替它写下一个名字',
        summary: '你没有把自己的名字借给它，而是在长生簿空白处写下一个新的称呼。残魂第一次不再只是回声，井底也落下一场迟来的雪。',
        effects: { affinity: 25, cultivation: 60, techniqueFragments: 4, karma: 3 },
      },
      {
        id: 'keep-the-soul-nameless',
        label: '让它继续做无名之魂',
        summary: '你承认名字并不一定是救赎。残魂留在井底守着自己的旧事，却把多年积攒的灵石推到井沿，作为你们之间不必解释的谢意。',
        effects: { affinity: 10, spiritStones: 40, mentalState: 5, karma: 1 },
      },
      {
        id: 'sever-the-last-thread',
        label: '斩断最后一线牵连',
        summary: '你替它结束这段迟迟不肯散去的牵连。井底的回声归于寂静，而你的影子终于不再比你慢半拍。',
        effects: { affinity: -30, mentalState: 10, fortune: 3, karma: -3 },
      },
    ],
  },
};

const EMPTY_SECT_EFFECTS: SectEffects = {
  cultivationMultiplier: 0,
  explorationStoneBonus: 0,
  studyFragmentBonus: 0,
  studyProficiencyBonus: 0,
  studyDurationReduction: 0,
};

export const createSocialState = (): SocialState => ({
  relationships: {
    'lin-qiu': { affinity: 0, interactionCount: 0, status: '陌生', discovered: false },
    'xuan-song': { affinity: 0, interactionCount: 0, status: '陌生', discovered: false },
    'nameless-soul': { affinity: 0, interactionCount: 0, status: '陌生', discovered: false },
  },
  sect: {
    sectId: null,
    invited: false,
    joinedAt: null,
    positionId: null,
    contribution: 0,
    reputation: 0,
    defectionCount: 0,
    cooldownUntil: null,
  },
  pendingPersonEvent: null,
  completedPersonEventIds: [],
});

export const getRelationshipStatus = (affinity: number) => {
  if (affinity <= -10) return '敌对' as const;
  if (affinity >= 40) return '信任' as const;
  if (affinity >= 10) return '熟悉' as const;
  return '陌生' as const;
};

export const getSectEffects = (
  sectId: SectId | null,
  positionId: SectPositionId | null = null,
): SectEffects => {
  const base = sectId ? SECTS[sectId].effects : EMPTY_SECT_EFFECTS;
  const position = getSectPosition(positionId);
  return {
    cultivationMultiplier: base.cultivationMultiplier + (position?.effects.cultivationMultiplier ?? 0),
    explorationStoneBonus: base.explorationStoneBonus + (position?.effects.explorationStoneBonus ?? 0),
    studyFragmentBonus: base.studyFragmentBonus + (position?.effects.studyFragmentBonus ?? 0),
    studyProficiencyBonus: base.studyProficiencyBonus + (position?.effects.studyProficiencyBonus ?? 0),
    studyDurationReduction: base.studyDurationReduction + (position?.effects.studyDurationReduction ?? 0),
  };
};

export const getPersonEvent = (eventId: PersonEventId) => PERSON_EVENTS[eventId];

export type SectMissionDefinition = {
  id: SectMissionId;
  sectId: SectId;
  title: string;
  summary: string;
  risk: string;
  durationMinutes: number;
  rewards: {
    reputation: number;
    contribution: number;
    spiritStones?: number;
    herbs?: number;
    techniqueFragments?: number;
    cultivation?: number;
  };
};

export const SECT_MISSIONS: Record<SectMissionId, SectMissionDefinition> = {
  'qingxiao-patrol': {
    id: 'qingxiao-patrol',
    sectId: 'qingxiao-sword-sect',
    title: '巡山听风',
    summary: '沿着宗门外山路走一圈，确认最近没有妖兽把界碑当成磨爪石。',
    risk: '风险：低，可能遇见野兽',
    durationMinutes: 25,
    rewards: { reputation: 12, contribution: 3, spiritStones: 8, cultivation: 6 },
  },
  'qingxiao-escort': {
    id: 'qingxiao-escort',
    sectId: 'qingxiao-sword-sect',
    title: '护送剑胚',
    summary: '把一柄还没开锋的剑胚送到山腰剑炉，路不远，但有人总爱在半路试剑。',
    risk: '风险：中，可能损失心境',
    durationMinutes: 40,
    rewards: { reputation: 20, contribution: 5, spiritStones: 15, cultivation: 12 },
  },
  'baicao-gathering': {
    id: 'baicao-gathering',
    sectId: 'baicao-valley',
    title: '辨认夜露草',
    summary: '在天亮前分辨出药田里混进来的夜露草，慢一步它们就会和普通野草长得一模一样。',
    risk: '风险：低，消耗耐心而不是灵力',
    durationMinutes: 30,
    rewards: { reputation: 12, contribution: 3, herbs: 5, techniqueFragments: 1 },
  },
  'baicao-cure': {
    id: 'baicao-cure',
    sectId: 'baicao-valley',
    title: '替山民熬药',
    summary: '山民送来一锅没人敢碰的苦药。你需要先判断药性，再决定要不要把它端上桌。',
    risk: '风险：中，判断失误会损失心境',
    durationMinutes: 45,
    rewards: { reputation: 20, contribution: 5, herbs: 8, cultivation: 8 },
  },
  'tianji-star-chart': {
    id: 'tianji-star-chart',
    sectId: 'tianji-pavilion',
    title: '补全星图',
    summary: '天机阁缺了一角星图，没人知道缺的是哪一颗星，只知道每个人都说自己看见过。',
    risk: '风险：低，考验悟性',
    durationMinutes: 35,
    rewards: { reputation: 12, contribution: 3, techniqueFragments: 2, cultivation: 5 },
  },
  'tianji-seal': {
    id: 'tianji-seal',
    sectId: 'tianji-pavilion',
    title: '封存倒转阵眼',
    summary: '一枚阵眼在夜里自行倒转，阁中长老让你去把它按回原处，并假装没有听见里面的叹气声。',
    risk: '风险：中，可能牵动心境',
    durationMinutes: 50,
    rewards: { reputation: 20, contribution: 5, techniqueFragments: 3, cultivation: 10 },
  },
};

export const getSectMission = (missionId: SectMissionId) => SECT_MISSIONS[missionId];

export const getSectMissions = (sectId: SectId | null) =>
  sectId ? Object.values(SECT_MISSIONS).filter((mission) => mission.sectId === sectId) : [];

export const getSectRank = (reputation: number) => {
  if (reputation >= 120) return '门中执事';
  if (reputation >= 60) return '内门弟子';
  if (reputation >= 20) return '记名弟子';
  return '外门弟子';
};

export type SectExchangeDefinition = {
  id: SectExchangeId;
  label: string;
  summary: string;
  costReputation: number;
  rewards: {
    spiritStones?: number;
    herbs?: number;
    techniqueFragments?: number;
  };
};

export const SECT_EXCHANGES: Record<SectExchangeId, SectExchangeDefinition> = {
  'exchange-spirit-stones': {
    id: 'exchange-spirit-stones',
    label: '换取行路灵石',
    summary: '用门中声望换一小袋不问来处的灵石，适合还没攒够路费的时候。',
    costReputation: 15,
    rewards: { spiritStones: 20 },
  },
  'exchange-herbs': {
    id: 'exchange-herbs',
    label: '领取药田配额',
    summary: '凭名册上的功劳领取一批基础灵草，百草谷弟子会额外多看你一眼。',
    costReputation: 12,
    rewards: { herbs: 5 },
  },
  'exchange-technique-fragments': {
    id: 'exchange-technique-fragments',
    label: '查阅残卷副本',
    summary: '用声望换取几页可带走的副本，纸上没有完整功法，却足够让某条思路继续。',
    costReputation: 25,
    rewards: { techniqueFragments: 3 },
  },
};

export const getSectExchange = (exchangeId: SectExchangeId) => SECT_EXCHANGES[exchangeId];
