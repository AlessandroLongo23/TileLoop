import { describe, it, expect } from 'vitest';
import {
  rotate,
  compare,
  cycleToMinimumLexicographicalOrder,
  simmetrize,
  getSimmetries,
  palindrome,
  isEqualOrChiral,
  fromBase,
  sum,
  count,
  capitalize,
  pickRandom,
  next,
  prev,
} from './seq';
import { mulberry32 } from '../platform/rng';

describe('seq', () => {
  it('next/prev wrap around', () => {
    const a = ['a', 'b', 'c'];
    expect(next(a, 2)).toBe('a');
    expect(prev(a, 0)).toBe('c');
  });

  it('rotate shifts left', () => {
    expect(rotate([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1]);
  });

  it('compare orders lexicographically, shorter first', () => {
    expect(compare([0, 1], [0, 2])).toBeLessThan(0);
    expect(compare([0], [0, 0])).toBeLessThan(0);
    expect(compare([1, 1], [1, 1])).toBe(0);
  });

  it('cycleToMinimumLexicographicalOrder finds the canonical rotation', () => {
    expect(cycleToMinimumLexicographicalOrder([2, 0, 1])).toEqual([[0, 1, 2], false, 1]);
  });

  it('cycleToMinimumLexicographicalOrder detects mirrored canonical form', () => {
    // [0,1,1,0,0] vs its rotations/reflections
    const [min, mirrored] = cycleToMinimumLexicographicalOrder([0, 2, 1]);
    expect(min[0]).toBe(0);
    expect(typeof mirrored).toBe('boolean');
  });

  it('simmetrize about a center reflects in place', () => {
    expect(simmetrize([0, 1, 2, 3], 1)).toEqual([1, 0, 3, 2]);
  });

  it('getSimmetries reports axial + rotational symmetry', () => {
    expect(getSimmetries([1, 1, 1])).toEqual([
      { type: 'axial', subtype: 'vertex' },
      { type: 'axial', subtype: 'edge' },
      { type: 'rotational', angle: 120 },
    ]);
  });

  it('palindrome', () => {
    expect(palindrome([1, 2, 1])).toBe(true);
    expect(palindrome([1, 2, 3])).toBe(false);
  });

  it('isEqualOrChiral matches reflected rotations', () => {
    expect(isEqualOrChiral([0, 1, 2], [2, 1, 0])).toBe(true);
    expect(isEqualOrChiral([0, 1, 2], [0, 0, 0])).toBe(false);
  });

  it('fromBase / sum', () => {
    expect(fromBase([1, 0, 1], 2)).toBe(5);
    expect(sum([1, 2, 3])).toBe(6);
  });

  it('string helpers', () => {
    expect(count('a/b/c', '/')).toBe(2);
    expect(capitalize('zen')).toBe('Zen');
  });

  it('pickRandom is deterministic under a seeded rng', () => {
    const pick1 = pickRandom([10, 20, 30], mulberry32(7));
    const pick2 = pickRandom([10, 20, 30], mulberry32(7));
    expect(pick1).toBe(pick2);
    expect([10, 20, 30]).toContain(pick1);
  });

  it('pickRandom honours weights', () => {
    // weight all mass on the last element
    const pick = pickRandom(['a', 'b', 'c'], mulberry32(1), [0, 0, 1]);
    expect(pick).toBe('c');
  });
});
