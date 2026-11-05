import type { Platform } from './types';
import { systemRng } from './rng';

const systemClock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

const noopStorage = {
  async getItem() {
    return null;
  },
  async setItem() {
    /* no-op until configured by the host app */
  },
  async removeItem() {
    /* no-op until configured by the host app */
  },
};

/**
 * The live platform. Defaults are safe for pure-logic / Node test contexts
 * (system rng + clock, no-op storage). Host apps call
 * `configurePlatform` at startup to inject real implementations.
 */
export const platform: Platform = {
  rng: systemRng,
  clock: systemClock,
  storage: noopStorage,
};

/** Override one or more platform dependencies. */
export function configurePlatform(partial: Partial<Platform>): void {
  Object.assign(platform, partial);
}
