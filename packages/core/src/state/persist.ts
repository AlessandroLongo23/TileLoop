import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { platform } from '../platform/context';

/** Bridges Zustand persist to the injected platform storage (localStorage / AsyncStorage). */
const platformStorage: StateStorage = {
  getItem: (name) => platform.storage.getItem(name),
  setItem: (name, value) => platform.storage.setItem(name, value),
  removeItem: (name) => platform.storage.removeItem(name),
};

/** A store wrapping a single value with svelte-store-style set/update helpers. */
export interface ValueStore<T> {
  value: T;
  set: (value: T) => void;
  update: (fn: (value: T) => T) => void;
}

/** A value store persisted under `name` via the platform storage. */
export function createPersistedStore<T>(name: string, initial: T): StoreApi<ValueStore<T>> {
  return createStore<ValueStore<T>>()(
    persist(
      (set, get) => ({
        value: initial,
        set: (value) => set({ value }),
        update: (fn) => set({ value: fn(get().value) }),
      }),
      {
        name,
        storage: createJSONStorage(() => platformStorage),
        partialize: (s) => ({ value: s.value }) as ValueStore<T>,
      },
    ),
  );
}

/** An in-memory (non-persisted) value store. */
export function createValueStore<T>(initial: T): StoreApi<ValueStore<T>> {
  return createStore<ValueStore<T>>()((set, get) => ({
    value: initial,
    set: (value) => set({ value }),
    update: (fn) => set({ value: fn(get().value) }),
  }));
}

interface PersistApi {
  hasHydrated(): boolean;
  onFinishHydration(cb: () => void): () => void;
  rehydrate(): Promise<void> | void;
}

/**
 * Re-read every persisted store from the (now-installed) platform storage.
 * Needed because stores auto-hydrate at creation time, which can run before the
 * host app injects its real storage adapter.
 */
export function rehydrateStores(stores: StoreApi<unknown>[]): Promise<void> {
  return Promise.all(
    stores.map((s) => {
      const api = (s as unknown as { persist?: PersistApi }).persist;
      return api ? Promise.resolve(api.rehydrate()) : Promise.resolve();
    }),
  ).then(() => undefined);
}

/** Resolves once every persisted store has finished hydrating from storage. */
export function waitForHydration(stores: StoreApi<unknown>[]): Promise<void> {
  return Promise.all(
    stores.map((s) => {
      const api = (s as unknown as { persist?: PersistApi }).persist;
      if (!api) return Promise.resolve();
      if (api.hasHydrated()) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const unsub = api.onFinishHydration(() => {
          unsub?.();
          resolve();
        });
      });
    }),
  ).then(() => undefined);
}
