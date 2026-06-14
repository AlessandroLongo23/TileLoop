import { describe, it, expect, beforeEach } from 'vitest';
import { configurePlatform } from '../platform/context';
import { createDefaultCampaignProgress, LEVELS_PER_CHAPTER } from '../data/campaign';
import { campaignProgressStore, sessionStore } from './gameStores';
import {
  completeLevel,
  isLevelUnlocked,
  getLevelProgress,
  advanceToNextLevel,
  startGameSession,
  getCurrentSession,
} from './progressApi';

beforeEach(() => {
  configurePlatform({ clock: { now: () => 0, iso: () => '2026-01-01T00:00:00.000Z' } });
  campaignProgressStore.getState().set(createDefaultCampaignProgress());
  sessionStore.getState().set({ gameMode: 'campaign', chapter: 1, level: 1, isActive: false });
});

describe('progressApi', () => {
  it('completeLevel marks the level done and unlocks the next', () => {
    expect(isLevelUnlocked(1, 2)).toBe(false);
    completeLevel(1, 1, { stars: 3, moves: 10, time: 42 });

    const oneOne = getLevelProgress(1, 1)!;
    expect(oneOne.completed).toBe(true);
    expect(oneOne.stars).toBe(3);
    expect(oneOne.dateCompleted).toBe('2026-01-01T00:00:00.000Z');
    expect(isLevelUnlocked(1, 2)).toBe(true);
  });

  it('completing the last level of a chapter unlocks the next chapter', () => {
    completeLevel(1, LEVELS_PER_CHAPTER, { stars: 1 });
    expect(isLevelUnlocked(2, 1)).toBe(true);
  });

  it('advanceToNextLevel rolls over to the next chapter after the last level', () => {
    startGameSession('campaign', 1, LEVELS_PER_CHAPTER);
    advanceToNextLevel();
    const session = getCurrentSession();
    expect(session.chapter).toBe(2);
    expect(session.level).toBe(1);
  });
});
