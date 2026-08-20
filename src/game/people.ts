import type {
  PersonEventId,
  RelationshipId,
  SectId,
  SocialState,
} from './types';

export type RelationshipDefinition = {
  id: RelationshipId;
  name: string;
  title: string;
  icon: string;
  introduction: string;
  flavor: string;
};

export const RELATIONSHIPS: Record<RelationshipId, RelationshipDefinition> = {
  'lin-qiu': {
    id: 'lin-qiu',
    name: '林秋',
    title: '行脚商人',
    icon: '商',
    introduction: '她的货箱里总有一半东西不知从哪里来，另一半则不肯说自己要去哪里。',
    flavor: '愿意把秘密标上价，也愿意为一个可靠的人少算几枚灵石。',
  },
  'xuan-song': {
    id: 'xuan-song',
    name: '玄松道人',
    title: '游方散修',
    icon: '松',
    introduction: '他在山门之外讲道，手里的拂尘沾着尘土，讲出来的却总是最难的一句。',
    flavor: '不急着收徒，只观察你是否能把听见的道理用在下一次呼吸里。',
  },
  'nameless-soul': {
    id: 'nameless-soul',
    name: '无名残魂',
    title: '井中回声',
    icon: '魂',
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
  mentalState?: number;
  karma?: number;
  fortune?: number;
  sectInvitation?: boolean;
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
    contribution: 0,
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

export const getSectEffects = (sectId: SectId | null): SectEffects => {
  if (!sectId) return { ...EMPTY_SECT_EFFECTS };
  return { ...SECTS[sectId].effects };
};

export const getPersonEvent = (eventId: PersonEventId) => PERSON_EVENTS[eventId];
