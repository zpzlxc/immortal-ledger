import { getTechniqueCombination } from './techniques';
import type { GameState, LegacyBoonId, LifeEndingId } from './types';

export const LEGACY_BOONS: Record<LegacyBoonId, {
  label: string;
  summary: string;
  effect: string;
}> = {
  'old-friend-echo': {
    label: '故人回响',
    summary: '前世见过的人会更早认出你眼中的旧意。',
    effect: '林秋与玄松开局即被发现，并各有 8 点好感。',
  },
  'cave-ember': {
    label: '洞府余烬',
    summary: '旧洞府的一点阵火穿过轮回，在新世仍未完全熄灭。',
    effect: '开局解锁洞府，并保留一级聚灵阵。',
  },
  'long-watch-mark': {
    label: '长夜刻痕',
    summary: '长生簿替你记住更多无人看守的时辰。',
    effect: '行动与洞府离线上限增加 12 小时。',
  },
};

export const LIFE_ENDINGS: Record<LifeEndingId, { label: string; summary: string }> = {
  'unfinished-page': { label: '未竟之页', summary: '寿元走到了纸页尽头，仍有许多问题没有得到回答。' },
  'fell-on-the-path': { label: '道途折锋', summary: '这一世倒在险路上，却把伤痕留成了后来者看得见的路标。' },
  'dual-path-core': { label: '两仪同丹', summary: '两门功法在最后一问中彼此照见，共同凝成一枚从未被前人命名的金丹。' },
  'discord-forged-core': { label: '逆火铸丹', summary: '你没有消除功法冲突，而是让两股相斥气机在金丹中留下永恒裂纹。' },
  'sect-dharma-core': { label: '山门法丹', summary: '宗门传承、人间责任与自身道途在最后一刻合为一体。' },
  'nameless-heart-core': { label: '无名心丹', summary: '你替无人回应的旧事留下位置，也终于不再需要别人替自己命名。' },
  'solitary-golden-core': { label: '孤照金丹', summary: '没有借谁的名号，也没有依靠现成答案；你只用这一世本身完成了结丹。' },
};

export const getGoldenCoreEnding = (state: GameState): LifeEndingId => {
  const combination = getTechniqueCombination(state.cultivationPath);
  if (combination?.kind === 'conflict') return 'discord-forged-core';
  if (combination?.kind === 'resonance') return 'dual-path-core';
  if (state.social.sect.positionId === 'sect-steward') return 'sect-dharma-core';
  if (state.social.completedPersonEventIds.includes('nameless-well-ending')) return 'nameless-heart-core';
  return 'solitary-golden-core';
};
