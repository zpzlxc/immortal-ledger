import type { GameState } from './types';

export type GuideTab = 'cultivation' | 'technique' | 'exploration' | 'people' | 'cave';
export const getJourneyGuidance = (state: GameState): { title: string; detail: string; tab: GuideTab; label: string } => {
  if (state.social.pendingPersonEvent) return { title: '故人有话，等你落笔', detail: '先回应眼前的人物事件，再安排下一程修行。', tab: 'people', label: '回应故人' };
  if (state.pendingExplorationEvent) return { title: '山中岔路，尚待抉择', detail: '探索带回了一段机缘，选择会写进这一世的长生簿。', tab: 'exploration', label: '查看机缘' };
  if (state.character.injury) return { title: '先养好这一身风霜', detail: '伤势会影响修行收益。查看调养方式，再决定是否继续冒险。', tab: 'cultivation', label: '查看伤势' };
  if (state.cave.stored.cultivation > 0 || state.cave.stored.herbs > 0) return { title: '洞府已积下些许收成', detail: `待收修为 ${state.cave.stored.cultivation} · 灵草 ${state.cave.stored.herbs}，可前往查看收取条件。`, tab: 'cave', label: '返回洞府' };
  if (state.character.currentAction) return { title: '修行有时，不必催促', detail: '当前行动正在进行。离开页面后仍可结算，回来时再读新的一页。', tab: 'cultivation', label: '查看修行' };
  if (state.character.realm.major === 'foundation_establishment' && state.character.realm.stage >= 4) return { title: '筑基圆满，再问金丹', detail: '查看试炼进度与终局资源，准备为这一世写下结局。', tab: 'cultivation', label: '查看终局准备' };
  if (state.character.realm.cultivation >= state.character.realm.cultivationRequired) return { title: '关隘已至，先看准备', detail: '查看突破的资源、伤势与冷却条件，再决定何时冲关。', tab: 'cultivation', label: '查看关隘' };
  if (!state.cave.unlocked) return { title: '从青石山，启程', detail: '完成第一次探索，寻找自己的洞府，让修行有一处归处。', tab: 'exploration', label: '前往探索' };
  if (!state.cultivationPath.schoolId) return { title: '为这一世，选一条道', detail: '了解各家功法的专长，选定适合自己的修行方向。', tab: 'technique', label: '翻阅功法' };
  return { title: '今日修行，由你落笔', detail: '安排单次功课或连续修炼计划，按自己的节奏积累修为与机缘。', tab: 'cultivation', label: '安排修行' };
};
