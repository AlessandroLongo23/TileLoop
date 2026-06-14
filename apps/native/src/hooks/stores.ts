import { useStore } from 'zustand';
import {
  configStore,
  gameSettingsStore,
  gameAppearanceStore,
  sessionStore,
  campaignProgressStore,
  type ConfigState,
  type GameSettings,
  type Appearance,
  type GameSession,
  type CampaignProgress,
} from '@tileloop/core';

export const useConfig = (): ConfigState => useStore(configStore, (s) => s);
export const useGameSettings = (): GameSettings => useStore(gameSettingsStore, (s) => s.value);
export const useAppearance = (): Appearance => useStore(gameAppearanceStore, (s) => s.value);
export const useSession = (): GameSession => useStore(sessionStore, (s) => s.value);
export const useCampaignProgress = (): CampaignProgress =>
  useStore(campaignProgressStore, (s) => s.value);

export function setGameSettings(patch: Partial<GameSettings>): void {
  gameSettingsStore.getState().update((s) => ({ ...s, ...patch }));
}
