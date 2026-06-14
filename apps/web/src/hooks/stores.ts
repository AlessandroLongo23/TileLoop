import { useStore } from 'zustand';
import {
  configStore,
  gameSettingsStore,
  gameAppearanceStore,
  gameStatsStore,
  sessionStore,
  campaignProgressStore,
  type ConfigState,
  type GameSettings,
  type Appearance,
  type GameStats,
  type GameSession,
} from '@tileloop/core';
import type { CampaignProgress } from '@tileloop/core';

export const useConfig = (): ConfigState => useStore(configStore, (s) => s);
export const useGameSettings = (): GameSettings => useStore(gameSettingsStore, (s) => s.value);
export const useAppearance = (): Appearance => useStore(gameAppearanceStore, (s) => s.value);
export const useGameStats = (): GameStats => useStore(gameStatsStore, (s) => s.value);
export const useSession = (): GameSession => useStore(sessionStore, (s) => s.value);
export const useCampaignProgress = (): CampaignProgress =>
  useStore(campaignProgressStore, (s) => s.value);

/** Patch the persisted game settings. */
export function setGameSettings(patch: Partial<GameSettings>): void {
  gameSettingsStore.getState().update((s) => ({ ...s, ...patch }));
}

export type ShapeKey = 'triangle' | 'square' | 'hexagon';

/** Set the tileset for a given shape in the persisted appearance store. */
export function setShapeTileset(shape: ShapeKey, tileset: string): void {
  gameAppearanceStore.getState().update((a) => ({
    ...a,
    shapeStyles: {
      ...a.shapeStyles,
      [shape]: { ...a.shapeStyles[shape], tileset },
    },
  }));
}
