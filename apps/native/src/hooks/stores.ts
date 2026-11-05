import { useStore } from 'zustand';
import { progressStore, settingsStore } from '@tileloop/core';

export const useProgress = () => useStore(progressStore, (s) => s.value);
export const useSettings = () => useStore(settingsStore, (s) => s.value);
