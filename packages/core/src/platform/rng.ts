import type { Rng } from './types';

/**
 * Deterministic PRNG (mulberry32). Same seed → same sequence, which makes
 * level generation reproducible in tests and lets Playwright force a known
 * board.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Non-deterministic RNG backed by Math.random (production default). */
export const systemRng: Rng = {
  next: () => Math.random(),
};
