import type {
  ExplorationEventId,
  PersonEventId,
  StoryChoiceKind,
  StoryChoiceRecord,
  StoryState,
} from './types';

export const createStoryState = (): StoryState => ({
  choiceHistory: [],
  worldFlags: [],
  foundationTrialCount: 0,
});

export const normalizeStoryState = (input?: Partial<StoryState>): StoryState => ({
  choiceHistory: (Array.isArray(input?.choiceHistory) ? input.choiceHistory : [])
    .filter((record): record is StoryChoiceRecord => Boolean(
      record &&
      (record.kind === 'exploration' || record.kind === 'person') &&
      typeof record.eventId === 'string' &&
      typeof record.choiceId === 'string' &&
      Number.isFinite(Number(record.chosenAt)),
    ))
    .map((record) => ({ ...record, chosenAt: Number(record.chosenAt) }))
    .slice(-200),
  worldFlags: Array.from(new Set(
    (Array.isArray(input?.worldFlags) ? input.worldFlags : [])
      .filter((flag): flag is string => typeof flag === 'string' && flag.length > 0),
  )).slice(-100),
  foundationTrialCount: Math.max(0, Number(input?.foundationTrialCount) || 0),
});

export const recordStoryChoice = (
  story: StoryState,
  kind: StoryChoiceKind,
  eventId: ExplorationEventId | PersonEventId,
  choiceId: string,
  chosenAt: number,
) => {
  const choice: StoryChoiceRecord = { kind, eventId, choiceId, chosenAt };
  const flag = `${kind}:${eventId}:${choiceId}`;
  return {
    ...story,
    choiceHistory: [...story.choiceHistory, choice].slice(-200),
    worldFlags: story.worldFlags.includes(flag)
      ? story.worldFlags
      : [...story.worldFlags, flag].slice(-100),
  };
};

export const hasStoryChoice = (
  story: StoryState,
  kind: StoryChoiceKind,
  eventId: ExplorationEventId | PersonEventId,
  choiceId?: string,
) => story.choiceHistory.some((record) =>
  record.kind === kind &&
  record.eventId === eventId &&
  (!choiceId || record.choiceId === choiceId));
