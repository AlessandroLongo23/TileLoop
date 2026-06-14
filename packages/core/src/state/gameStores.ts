import { createPersistedStore, createValueStore } from './persist';
import {
  createDefaultCampaignProgress,
  type CampaignProgress,
} from '../data/campaign';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  darkTheme: boolean;
  autoSave: boolean;
  showAnimations: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  language: string;
}

export interface GameStats {
  totalPlayTime: number;
  totalLevelsCompleted: number;
  totalMoves: number;
  averageMovesPerLevel: number;
  preferredGameMode: string;
  streakCount: number;
  longestStreak: number;
  firstPlayDate: string | null;
  lastPlayDate: string | null;
}

export interface ZenProgress {
  highestLevel: number;
  totalLevelsCompleted: number;
  totalPlayTime: number;
  preferences: { autoSave: boolean; showHints: boolean };
}

export interface TimeAttackProgress {
  highestLevel: number;
  bestTimes: Record<number, number>;
  totalLevelsCompleted: number;
  averageTime: number;
}

export interface PrecisionProgress {
  highestLevel: number;
  bestMoves: Record<number, number>;
  totalLevelsCompleted: number;
  averageMoves: number;
  perfectGames: number;
}

export interface GameSession {
  gameMode: string;
  chapter: number;
  level: number;
  isActive: boolean;
}

export interface CurrentGameState {
  gameMode: string;
  levelId: string;
  chapterNum?: number;
  levelNum?: number;
  timer: number;
  moves: number;
  startTime: string;
  levelState?: { isSolved?: boolean; gameStarted?: boolean };
  saveTime?: string;
}

export interface ShapeStyle {
  tileset: string;
  colorVariant: string;
}

export interface Appearance {
  theme: string;
  shapeStyles: { triangle: ShapeStyle; square: ShapeStyle; hexagon: ShapeStyle };
  tileSettings: {
    animateRotation: boolean;
    highlightCompleted: boolean;
    connectionWidth: 'thin' | 'medium' | 'thick';
  };
  uiPreferences: {
    showGrid: boolean;
    gridOpacity: number;
    showTileNumbers: boolean;
    showDifficulty: boolean;
    compactMode: boolean;
  };
}

export const campaignProgressStore = createPersistedStore<CampaignProgress>(
  'tileloop-campaign-progress',
  createDefaultCampaignProgress(),
);

export const currentGameStateStore = createPersistedStore<CurrentGameState | null>(
  'tileloop-current-game',
  null,
);

export const zenModeStore = createPersistedStore<ZenProgress>('tileloop-zen-progress', {
  highestLevel: 0,
  totalLevelsCompleted: 0,
  totalPlayTime: 0,
  preferences: { autoSave: true, showHints: true },
});

export const timeAttackStore = createPersistedStore<TimeAttackProgress>(
  'tileloop-timeattack-progress',
  { highestLevel: 0, bestTimes: {}, totalLevelsCompleted: 0, averageTime: 0 },
);

export const precisionStore = createPersistedStore<PrecisionProgress>(
  'tileloop-precision-progress',
  { highestLevel: 0, bestMoves: {}, totalLevelsCompleted: 0, averageMoves: 0, perfectGames: 0 },
);

export const gameSettingsStore = createPersistedStore<GameSettings>('tileloop-settings', {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  darkTheme: true,
  autoSave: true,
  showAnimations: true,
  difficulty: 'normal',
  language: 'en',
});

export const gameStatsStore = createPersistedStore<GameStats>('tileloop-statistics', {
  totalPlayTime: 0,
  totalLevelsCompleted: 0,
  totalMoves: 0,
  averageMovesPerLevel: 0,
  preferredGameMode: 'campaign',
  streakCount: 0,
  longestStreak: 0,
  firstPlayDate: null,
  lastPlayDate: null,
});

export const gameAppearanceStore = createPersistedStore<Appearance>('tileloop-appearance', {
  theme: 'auto',
  shapeStyles: {
    triangle: { tileset: 'loop', colorVariant: 'default' },
    square: { tileset: 'loop', colorVariant: 'default' },
    hexagon: { tileset: 'loop', colorVariant: 'default' },
  },
  tileSettings: {
    animateRotation: true,
    highlightCompleted: true,
    connectionWidth: 'medium',
  },
  uiPreferences: {
    showGrid: false,
    gridOpacity: 0.3,
    showTileNumbers: false,
    showDifficulty: true,
    compactMode: false,
  },
});

/** Session is intentionally not persisted (active-game only). */
export const sessionStore = createValueStore<GameSession>({
  gameMode: 'campaign',
  chapter: 1,
  level: 1,
  isActive: false,
});

/** All persisted stores, for hydration coordination. */
export const persistedStores = [
  campaignProgressStore,
  currentGameStateStore,
  zenModeStore,
  timeAttackStore,
  precisionStore,
  gameSettingsStore,
  gameStatsStore,
  gameAppearanceStore,
];
