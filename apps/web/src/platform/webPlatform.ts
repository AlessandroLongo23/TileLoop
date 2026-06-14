import {
  configurePlatform,
  mulberry32,
  systemRng,
  type Storage,
  type LoadTileSvg,
} from '@tileloop/core';

const localStorageAdapter: Storage = {
  async getItem(key) {
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    localStorage.removeItem(key);
  },
};

const fetchTileSvg: LoadTileSvg = async (tileset, sides, connections) => {
  const res = await fetch(`/tilesets/${tileset}/${sides}/${connections}.svg`);
  if (!res.ok) return '';
  return res.text();
};

declare global {
  interface Window {
    __tileloop?: { seed?: number; solve?: () => void };
  }
}

/** Install the web platform implementations into the core. */
export function installWebPlatform(): void {
  // Test hook: a seed makes level generation deterministic for Playwright.
  const seed = typeof window !== 'undefined' ? window.__tileloop?.seed : undefined;
  configurePlatform({
    rng: typeof seed === 'number' ? mulberry32(seed) : systemRng,
    clock: { now: () => Date.now(), iso: () => new Date().toISOString() },
    storage: localStorageAdapter,
    loadTileSvg: fetchTileSvg,
  });
}
