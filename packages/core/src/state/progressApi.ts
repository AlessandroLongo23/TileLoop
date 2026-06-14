import { CHAPTERS_COUNT, LEVELS_PER_CHAPTER, type LevelProgress } from '../data/campaign';
import { platform } from '../platform/context';
import {
  campaignProgressStore,
  currentGameStateStore,
  zenModeStore,
  timeAttackStore,
  precisionStore,
  gameStatsStore,
  sessionStore,
  type CurrentGameState,
  type GameSession,
} from './gameStores';

/** Plain deep clone (stores hold JSON-serialisable data only). */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface LevelCompletionStats {
  time?: number;
  moves?: number;
  stars?: number;
}

export interface GameModeLevelData {
  gameMode?: string;
  level: number;
  chapter?: number;
  time?: number;
  moves?: number;
  completed?: boolean;
  playTime?: number;
  stars?: number;
  isPerfect?: boolean;
}

export function isLevelUnlocked(chapter: number, level: number): boolean {
  const progress = campaignProgressStore.getState().value;
  if (!progress || !progress[chapter] || !progress[chapter][level]) return false;
  return progress[chapter][level].unlocked;
}

export function isChapterCompleted(chapter: number): boolean {
  const progress = campaignProgressStore.getState().value;
  if (!progress || !progress[chapter]) return false;
  return Object.values(progress[chapter]).every((level) => level.completed);
}

export function isChapterUnlocked(chapter: number): boolean {
  if (chapter === 1) return true;
  return isChapterCompleted(chapter - 1);
}

export function completeLevel(
  chapter: number,
  level: number,
  stats: LevelCompletionStats = {},
): void {
  campaignProgressStore.getState().update((progress) => {
    const next = clone(progress);
    if (next[chapter] && next[chapter][level]) {
      const levelData = next[chapter][level];
      levelData.completed = true;
      levelData.attempts += 1;
      levelData.dateCompleted = platform.clock.iso();

      if (stats.time && (!levelData.bestTime || stats.time < levelData.bestTime)) {
        levelData.bestTime = stats.time;
      }
      if (stats.moves && (!levelData.bestMoves || stats.moves < levelData.bestMoves)) {
        levelData.bestMoves = stats.moves;
      }
      if (stats.stars && stats.stars > levelData.stars) {
        levelData.stars = stats.stars;
      }

      if (level < LEVELS_PER_CHAPTER && next[chapter][level + 1]) {
        next[chapter][level + 1].unlocked = true;
      } else if (chapter < CHAPTERS_COUNT && next[chapter + 1] && next[chapter + 1][1]) {
        next[chapter + 1][1].unlocked = true;
      }
    }
    return next;
  });

  updateGlobalStats({ ...stats, completed: true });
}

export function saveCurrentGameState(gameData: Omit<CurrentGameState, 'saveTime'>): void {
  currentGameStateStore.getState().set({ ...gameData, saveTime: platform.clock.iso() });
}

export function clearCurrentGameState(): void {
  currentGameStateStore.getState().set(null);
}

export function updateGameModeProgress(mode: string, levelData: GameModeLevelData): void {
  switch (mode) {
    case 'zen':
      zenModeStore.getState().update((progress) => {
        const next = clone(progress);
        if (levelData.completed && levelData.level >= next.highestLevel) {
          next.highestLevel = levelData.level;
          next.totalLevelsCompleted += 1;
        }
        if (levelData.playTime) next.totalPlayTime += levelData.playTime;
        return next;
      });
      break;

    case 'timeattack':
      timeAttackStore.getState().update((progress) => {
        const next = clone(progress);
        if (levelData.completed && levelData.level >= next.highestLevel) {
          next.highestLevel = levelData.level;
          next.totalLevelsCompleted += 1;
          if (
            levelData.time &&
            (!next.bestTimes[levelData.level] || levelData.time < next.bestTimes[levelData.level])
          ) {
            next.bestTimes[levelData.level] = levelData.time;
          }
          const totalTime = Object.values(next.bestTimes).reduce((sum, time) => sum + time, 0);
          next.averageTime = totalTime / next.totalLevelsCompleted;
        }
        return next;
      });
      break;

    case 'precision':
      precisionStore.getState().update((progress) => {
        const next = clone(progress);
        if (levelData.completed && levelData.level >= next.highestLevel) {
          next.highestLevel = levelData.level;
          next.totalLevelsCompleted += 1;
          if (
            levelData.moves &&
            (!next.bestMoves[levelData.level] || levelData.moves < next.bestMoves[levelData.level])
          ) {
            next.bestMoves[levelData.level] = levelData.moves;
          }
          if (levelData.isPerfect) next.perfectGames += 1;
          const totalMoves = Object.values(next.bestMoves).reduce((sum, moves) => sum + moves, 0);
          next.averageMoves = totalMoves / next.totalLevelsCompleted;
        }
        return next;
      });
      break;
  }
}

function updateGlobalStats(gameData: {
  completed?: boolean;
  moves?: number;
  playTime?: number;
  gameMode?: string;
}): void {
  gameStatsStore.getState().update((stats) => {
    const next = clone(stats);
    const now = platform.clock.iso();

    if (!next.firstPlayDate) next.firstPlayDate = now;
    next.lastPlayDate = now;

    if (gameData.completed) next.totalLevelsCompleted += 1;
    if (gameData.moves) {
      next.totalMoves += gameData.moves;
      next.averageMovesPerLevel = next.totalMoves / next.totalLevelsCompleted;
    }
    if (gameData.playTime) next.totalPlayTime += gameData.playTime;
    if (gameData.gameMode) next.preferredGameMode = gameData.gameMode;

    return next;
  });
}

export function getLevelProgress(chapter: number, level: number): LevelProgress | null {
  const progress = campaignProgressStore.getState().value;
  return progress?.[chapter]?.[level] ?? null;
}

export function getChapterProgress(chapter: number): Record<number, LevelProgress> | null {
  const progress = campaignProgressStore.getState().value;
  return progress?.[chapter] ?? null;
}

export function getCurrentCampaignProgress(): {
  currentChapter: number;
  currentLevel: number;
  totalCompleted: number;
  totalLevels: number;
  isCompleted: boolean;
} {
  const progress = campaignProgressStore.getState().value;
  let currentChapter = 1;
  let currentLevel = 1;
  let totalCompleted = 0;
  let foundCurrentLevel = false;

  for (let chapter = 1; chapter <= CHAPTERS_COUNT && !foundCurrentLevel; chapter++) {
    for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
      const levelData = progress?.[chapter]?.[level];
      if (levelData?.completed) {
        totalCompleted++;
      } else if (levelData?.unlocked && !levelData?.completed) {
        currentChapter = chapter;
        currentLevel = level;
        foundCurrentLevel = true;
        break;
      }
    }
  }

  if (!foundCurrentLevel && totalCompleted > 0) {
    currentChapter = CHAPTERS_COUNT;
    currentLevel = LEVELS_PER_CHAPTER;
  }

  return {
    currentChapter,
    currentLevel,
    totalCompleted,
    totalLevels: CHAPTERS_COUNT * LEVELS_PER_CHAPTER,
    isCompleted: !foundCurrentLevel && totalCompleted === CHAPTERS_COUNT * LEVELS_PER_CHAPTER,
  };
}

export function getCurrentModeProgress(mode: string): {
  currentLevel: number;
  totalCompleted: number;
  [key: string]: number;
} {
  switch (mode) {
    case 'zen': {
      const zen = zenModeStore.getState().value;
      return {
        currentLevel: zen.highestLevel + 1,
        totalCompleted: zen.totalLevelsCompleted,
        totalPlayTime: zen.totalPlayTime,
      };
    }
    case 'timeattack': {
      const time = timeAttackStore.getState().value;
      return {
        currentLevel: time.highestLevel + 1,
        totalCompleted: time.totalLevelsCompleted,
        averageTime: time.averageTime,
      };
    }
    case 'precision': {
      const precision = precisionStore.getState().value;
      return {
        currentLevel: precision.highestLevel + 1,
        totalCompleted: precision.totalLevelsCompleted,
        averageMoves: precision.averageMoves,
        perfectGames: precision.perfectGames,
      };
    }
    default:
      return { currentLevel: 1, totalCompleted: 0 };
  }
}

export function startGameSession(
  gameMode: string,
  chapter: number | null = null,
  level: number | null = null,
): void {
  const sessionData: GameSession = { gameMode, chapter: 1, level: 1, isActive: true };

  if (gameMode === 'campaign') {
    if (chapter && level) {
      sessionData.chapter = chapter;
      sessionData.level = level;
    } else {
      const campaignCurrent = getCurrentCampaignProgress();
      sessionData.chapter = campaignCurrent.currentChapter;
      sessionData.level = campaignCurrent.currentLevel;
    }
  } else {
    const modeProgress = getCurrentModeProgress(gameMode);
    sessionData.chapter = 1;
    sessionData.level = level || modeProgress.currentLevel;
  }

  sessionStore.getState().set(sessionData);
}

export function endGameSession(): void {
  sessionStore.getState().update((session) => ({ ...session, isActive: false }));
}

export function advanceToNextLevel(): void {
  sessionStore.getState().update((session) => {
    if (session.gameMode === 'campaign') {
      let nextChapter = session.chapter;
      let nextLevel = session.level + 1;

      if (nextLevel > LEVELS_PER_CHAPTER) {
        nextChapter++;
        nextLevel = 1;
      }

      if (nextChapter > CHAPTERS_COUNT) {
        return { ...session, isActive: false };
      }

      return { ...session, chapter: nextChapter, level: nextLevel };
    }
    return { ...session, level: session.level + 1 };
  });
}

export function getCurrentSession(): GameSession {
  return sessionStore.getState().value;
}
