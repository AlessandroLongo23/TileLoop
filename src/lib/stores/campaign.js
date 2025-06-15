// Legacy support - redirect to new game progress system
export { 
    CHAPTERS_COUNT, 
    LEVELS_PER_CHAPTER, 
    campaignProgress,
    isLevelUnlocked,
    isChapterCompleted,
    isChapterUnlocked,
    completeLevel,
    getLevelProgress,
    getChapterProgress,
    // Add new session management functions
    currentGameSession,
    startGameSession,
    endGameSession,
    advanceToNextLevel,
    getCurrentSession
} from './gameProgress.js';

// This file now only provides legacy support
// All functionality has been moved to gameProgress.js 