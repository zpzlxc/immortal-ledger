import type { GameState } from './types';

export type FoundationTrialApproachId = 'steady' | 'bold';

export const FOUNDATION_TRIALS = [
  {
    title: '第一关 · 稳住道基',
    summary: '石阶上的灵压会放大经脉中的每一道裂隙。先决定如何稳住自己的周天。',
    steady: { label: '以灵草温养经脉', detail: '消耗 1 株灵草，稳妥获得额外修为。' },
    bold: { label: '催动主修功法', detail: '需选定主修功法；获得更多修为，但会损失心境。' },
  },
  {
    title: '第二关 · 借势或独行',
    summary: '前路被旧阵截断。门中令牌可以引路，散修也能凭自己的神识寻找阵眼。',
    steady: { label: '凭神识推演阵眼', detail: '独自破阵，获得功法残页。' },
    bold: { label: '借宗门令牌开路', detail: '需已加入宗门；获得贡献与声望。' },
  },
  {
    title: '第三关 · 回望来路',
    summary: '云门映出这一世的旧人旧事。你可以带着牵挂前行，也可以斩开幻象。',
    steady: { label: '回应旧日因果', detail: '根据已留下的选择获得心境与气运。' },
    bold: { label: '斩开幻象直上云门', detail: '获得更多灵石与修为，但会损失心境。' },
  },
] as const;

export const getFoundationTrialIndex = (state: GameState) =>
  Math.min(2, Math.max(0, Math.floor(state.story.foundationTrialCount)));

export const getFoundationTrialApproachError = (
  state: GameState,
  approach: FoundationTrialApproachId,
): string | null => {
  const index = getFoundationTrialIndex(state);
  if (index === 0 && approach === 'steady' && state.inventory.herbs < 1) return '温养经脉需要 1 株灵草。';
  if (index === 0 && approach === 'bold' && !state.cultivationPath.activeTechniqueId) return '催动主修功法需要先选定功法。';
  if (index === 1 && approach === 'bold' && !state.social.sect.sectId) return '借宗门令牌需要先加入宗门。';
  return null;
};
