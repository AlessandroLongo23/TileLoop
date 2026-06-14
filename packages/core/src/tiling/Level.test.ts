import { describe, it, expect, beforeEach } from 'vitest';
import { Level } from './Level';
import { configurePlatform } from '../platform/context';
import { mulberry32 } from '../platform/rng';

const RULE = '4-4-0,4/r90/m(v2)';

/** Rotate every tile back to its canonical (turns ≡ 0 mod n) orientation. */
function solveToCanonical(level: Level): void {
  for (const node of level.tiling.nodes) {
    const back = (((node.n - (node.turns % node.n)) % node.n) + node.n) % node.n;
    if (back !== 0) node.rotate(back);
  }
}

describe('Level', () => {
  beforeEach(() => {
    configurePlatform({ rng: mulberry32(12345) });
  });

  it('generates tiles, each with a tileType', () => {
    const level = new Level(RULE, 1, 800, 800);
    expect(level.tiling.nodes.length).toBeGreaterThan(0);
    for (const node of level.tiling.nodes) {
      expect(node.tileType).toMatch(/^\d+\/[0-9]+$/);
    }
  });

  it('is solved when every tile is returned to its canonical orientation', () => {
    const level = new Level(RULE, 1, 800, 800);
    solveToCanonical(level);
    expect(level.checkIfSolved()).toBe(true);
  });

  it('canonical solve holds even for mirrored tiles (guards connection-mirror bug)', () => {
    // Run several seeds so at least one produces mirrored tiles; each must still
    // solve once returned to canonical orientation.
    for (const seed of [1, 2, 3, 7, 42, 99]) {
      configurePlatform({ rng: mulberry32(seed) });
      const level = new Level(RULE, 1, 800, 800);
      solveToCanonical(level);
      expect(level.checkIfSolved()).toBe(true);
    }
  });

  it('is deterministic: same seed + rule yields the same tile types', () => {
    configurePlatform({ rng: mulberry32(777) });
    const a = new Level(RULE, 1, 800, 800);
    const aTypes = a.tiling.nodes.map((n) => n.tileType);

    configurePlatform({ rng: mulberry32(777) });
    const b = new Level(RULE, 1, 800, 800);
    const bTypes = b.tiling.nodes.map((n) => n.tileType);

    expect(aTypes).toEqual(bTypes);
  });
});
