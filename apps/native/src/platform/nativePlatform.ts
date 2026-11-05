import AsyncStorage from '@react-native-async-storage/async-storage';
import { configurePlatform, rehydrateStores, persistedGameStores, type Storage } from '@tileloop/core';

const asyncStorageAdapter: Storage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

/** Install the storage adapter and read saved progress and settings. */
export async function installNativePlatform(): Promise<void> {
  configurePlatform({ storage: asyncStorageAdapter });
  await rehydrateStores(persistedGameStores);
}
