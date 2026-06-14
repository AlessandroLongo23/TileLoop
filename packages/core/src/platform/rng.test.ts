import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('produces a deterministic sequence for a given seed', () => {
    const rng = mulberry32(42);
    const seq = [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()];
    // Snapshot of the known sequence for seed 42.
    expect(seq).toEqual([
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
      0.6697340414393693, 0.17481389874592423,
    ]);
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('two instances with the same seed match', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });
});
