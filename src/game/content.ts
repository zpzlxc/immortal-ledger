import type { ActionType, Talent } from './types';

export const TALENTS: Talent[] = [
  {
    id: 'plain-bone',
    name: '凡骨',
    summary: '资质平平，却不容易被挫折击倒。',
    effect: '突破失败时，心境损失降低。',
  },
  {
    id: 'awakened-vein',
    name: '灵脉初醒',
    summary: '体内灵脉比常人更早感知天地灵气。',
    effect: '平稳吐纳获得的修为增加。',
  },
  {
    id: 'perfect-memory',
    name: '过目不忘',
    summary: '看过一次的功法口诀，便很难再忘记。',
    effect: '研究功法时额外获得功法残页。',
  },
  {
    id: 'herbal-heart',
    name: '山野药心',
    summary: '自幼与草木为伴，能辨认细微药性。',
    effect: '探索时更容易获得草药。',
  },
  {
    id: 'sword-intent',
    name: '天生剑意',
    summary: '尚未握剑，心中已经有了一线锋芒。',
    effect: '危险探索获得的收益增加。',
  },
  {
    id: 'solitary-star',
    name: '命犯孤星',
    summary: '气运起伏不定，却总能撞见不寻常之事。',
    effect: '更容易触发稀有事件。',
  },
];

export const ACTIONS: Record<
  ActionType,
  {
    label: string;
    icon: string;
    durationMinutes: number;
    description: string;
    risk: string;
  }
> = {
  meditate: {
    label: '平稳吐纳',
    icon: '☯',
    durationMinutes: 5,
    description: '循着周天缓慢搬运灵气，稳妥地积累修为。',
    risk: '风险：极低',
  },
  temper: {
    label: '淬体炼骨',
    icon: '骨',
    durationMinutes: 15,
    description: '借灵草和灵气反复淬炼根骨，让身体先成为能承载大道的器物。',
    risk: '风险：有灵草时效果更好，无灵草也可勉强磨脉',
  },
  insight: {
    label: '静观参悟',
    icon: '悟',
    durationMinutes: 12,
    description: '暂时放下对修为的追赶，梳理心念、功法与神识之间的细微联系。',
    risk: '风险：修为收益较少，偏向心境、悟性与神识',
  },
  overdrive: {
    label: '极限运功',
    icon: '✦',
    durationMinutes: 10,
    description: '强行压榨灵脉，短时间内换取更多修为。',
    risk: '风险：心境下降，可能受伤',
  },
  explore: {
    label: '青石山探索',
    icon: '山',
    durationMinutes: 15,
    description: '前往山中寻找灵草，也许会遇见不属于凡间的痕迹。',
    risk: '风险：低，有概率受伤',
  },
  study: {
    label: '研读残卷',
    icon: '卷',
    durationMinutes: 20,
    description: '整理手边的残卷，尝试从断裂的口诀中还原功法。',
    risk: '风险：低，消耗一份草药作为安神香',
  },
  sect_mission: {
    label: '宗门任务',
    icon: '令',
    durationMinutes: 30,
    description: '替宗门处理一件不大不小的差事，换取门中声望。',
    risk: '风险：视任务而定',
  },
  breakthrough: {
    label: '准备突破',
    icon: '门',
    durationMinutes: 30,
    description: '耗费时间整理灵气与心境，准备正式叩击当前关隘。',
    risk: '风险：失败后进入冷却',
  },
  foundation_trial: {
    label: '筑基试炼',
    icon: '峰',
    durationMinutes: 45,
    description: '前往筑基修士才能踏入的试炼场，寻找更高阶的功法残页与灵石。',
    risk: '风险：耗时较长，收获更丰厚',
  },
};

export const REAL_MINUTE_TO_GAME_DAYS = 0.5;
export const MAX_OFFLINE_MINUTES = 8 * 60;
export const BREAKTHROUGH_COST_SPIRIT_STONES = 10;
export const BREAKTHROUGH_FAILURE_COOLDOWN_MINUTES = 60;
export const SECT_DEFECTION_COOLDOWN_MINUTES = 120;
export const SAVE_KEY = 'immortal-ledger-save-v1';

export const formatRealm = (major: string, stage: number) => {
  if (major === 'foundation_establishment') {
    return `筑基${stage === 1 ? '初期' : stage === 2 ? '中期' : stage === 3 ? '后期' : '圆满'}`;
  }
  return `炼气${stage}层`;
};

export const formatAge = (ageDays: number) => {
  const years = Math.floor(ageDays / 365);
  const days = Math.floor(ageDays % 365);
  return `${years}岁 ${days}天`;
};

export const formatRemaining = (endsAt: number, now: number) => {
  const remaining = Math.max(0, endsAt - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatTimestamp = (timestamp: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
