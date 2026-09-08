import { describe, expect, it } from 'vitest';
import { createNewGame } from './save';
import { getJourneyGuidance } from './guidance';
import { startAction } from './settlement';

describe('journey guidance', () => {
  it('points a new player to the first exploration and then to a school', () => {
    const game = createNewGame('沈砚', []);
    expect(getJourneyGuidance(game).tab).toBe('exploration');
    game.cave.unlocked = true;
    expect(getJourneyGuidance(game).tab).toBe('technique');
  });
  it('prioritizes a cultivation gate over onboarding', () => {
    const game = createNewGame('沈砚', []);
    game.character.realm.cultivation = game.character.realm.cultivationRequired;
    expect(getJourneyGuidance(game).tab).toBe('cultivation');
  });
  it('shows collectable cave production while an action runs', () => {
    const game = startAction(createNewGame('沈砚', []), 'meditate', Date.now());
    game.cave.unlocked = true;
    game.cave.stored.herbs = 2;
    expect(getJourneyGuidance(game).tab).toBe('cave');
    game.cave.stored.herbs = 0;
    expect(getJourneyGuidance(game).title).toBe('修行有时，不必催促');
  });
});
