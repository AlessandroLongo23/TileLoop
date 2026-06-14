import { describe, it, expect, beforeEach } from 'vitest';
import { TilingGenerator } from './TilingGenerator';
import { configurePlatform } from '../platform/context';
import { mulberry32 } from '../platform/rng';

const RULE = '4-4-0,4/r90/m(v2)';

function centroidSet(gen: TilingGenerator): string[] {
  return gen.tiling.nodes
    .map((n) => `${n.centroid.x.toFixed(4)},${n.centroid.y.toFixed(4)}`)
    .sort();
}

describe('TilingGenerator.generateFromRule', () => {
  beforeEach(() => {
    configurePlatform({ rng: mulberry32(1) });
  });

  it('generates a square tiling with finite nodes', () => {
    const gen = new TilingGenerator();
    const tiling = gen.generateFromRule(RULE, 1);

    expect(tiling.nodes.length).toBeGreaterThan(0);
    for (const node of tiling.nodes) {
      expect(node.n).toBe(4);
      expect(Number.isFinite(node.centroid.x)).toBe(true);
      expect(Number.isFinite(node.centroid.y)).toBe(true);
    }
  });

  it('is deterministic for the same rule', () => {
    const a = new TilingGenerator();
    a.generateFromRule(RULE, 1);
    const b = new TilingGenerator();
    b.generateFromRule(RULE, 1);
    expect(centroidSet(a)).toEqual(centroidSet(b));
  });

  it('throws on a shape seed with an unsupported side count', () => {
    const gen = new TilingGenerator();
    expect(() => gen.generateFromRule('11/r90', 1)).toThrow('Invalid shape seed');
  });
});
