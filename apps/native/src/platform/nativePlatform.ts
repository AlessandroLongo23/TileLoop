import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configurePlatform,
  systemRng,
  rehydrateStores,
  persistedStores,
  type Storage,
  type LoadTileSvg,
} from '@tileloop/core';
import { tilesets } from '../../assets/tilesets.gen';

const asyncStorageAdapter: Storage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const loadTileSvg: LoadTileSvg = async (tileset, sides, connections) =>
  tilesets[`${tileset}/${sides}/${connections}`] ?? '';

/** Install native platform implementations and rehydrate persisted stores. */
export async function installNativePlatform(): Promise<void> {
  configurePlatform({
    rng: systemRng,
    clock: { now: () => Date.now(), iso: () => new Date().toISOString() },
    storage: asyncStorageAdapter,
    loadTileSvg,
  });
  await rehydrateStores(persistedStores);
}
