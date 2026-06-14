/**
 * Pure array/string helpers. Ported 1:1 from the legacy `extensions.js`, which
 * polluted Array/String prototypes. Behaviour is preserved exactly (including
 * the deliberately fractional offsets used by the symmetry checks); only the
 * `palidrome` typo is corrected to `palindrome`, and `pickRandom` now takes an
 * injected Rng instead of calling Math.random.
 */
import type { Rng } from '../platform/types';

/** Symmetry descriptor produced by {@link getSimmetries}. */
export type Simmetry =
  | { type: 'axial'; subtype: 'vertex' | 'edge' }
  | { type: 'rotational'; angle: number };

/** Element `j` positions after `i`, wrapping around. */
export function next<T>(arr: T[], i: number, j = 1): T {
  return arr[(i + j) % arr.length];
}

/** Element `j` positions before `i`, wrapping around. */
export function prev<T>(arr: T[], i: number, j = 1): T {
  return arr[(i - j + arr.length * 100) % arr.length];
}

/** Lexicographic comparison; shorter arrays sort first. */
export function compare(a: number[], b: number[]): number {
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Rotate left by `i` positions (non-mutating). */
export function rotate<T>(arr: T[], i = 1): T[] {
  const temp = [...arr];
  return temp.slice(i).concat(temp.slice(0, i));
}

/**
 * Returns the rotation/reflection of `arr` that is lexicographically smallest,
 * along with whether it was mirrored and how many turns it was rotated.
 */
export function cycleToMinimumLexicographicalOrder(
  arr: number[],
): [number[], boolean, number] {
  let temp = [...arr];
  let min = [...arr];
  let mirrored = false;
  let turns = 0;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < temp.length; i++) {
      const rotated = rotate(temp, i);
      if (compare(rotated, min) < 0) {
        min = rotated;
        turns = i;
        mirrored = j === 1;
      }
    }
    temp = [...arr].reverse();
  }
  return [min, mirrored, turns];
}

export function isAxialSymmetric(arr: number[]): boolean {
  let isSymmetric = false;
  const subarrayLength = arr.length / 2 + 1;
  for (let i = 0; i < arr.length; i++) {
    if (isEqual(subarray(arr, i, subarrayLength), subarray(arr, i, -subarrayLength)))
      isSymmetric = true;
  }
  return isSymmetric;
}

/** Slice of length |offset| walking forward (offset>0) or backward (offset<0). */
export function subarray<T>(arr: T[], start: number, offset: number): T[] {
  const out: T[] = [];
  if (offset > 0) {
    for (let i = 0; i < offset; i++) out.push(next(arr, start, i));
  } else {
    for (let i = 0; i < -offset; i++) out.push(prev(arr, start, i));
  }
  return out;
}

function getDivisors(n: number): number[] {
  const divisors: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) divisors.push(i);
  }
  return divisors;
}

export function getSimmetries(arr: number[]): Simmetry[] {
  const simmetries: Simmetry[] = [];
  const temp = [...arr];

  for (let i = 0; i < temp.length; i++) {
    const rotated = rotate(temp, i);
    if (palindrome(rotated)) {
      if (!simmetries.some((s) => s.type === 'axial' && s.subtype === 'vertex')) {
        simmetries.push({ type: 'axial', subtype: 'vertex' });
      }
    }
  }

  if (isAxialSymmetric(arr)) {
    simmetries.push({ type: 'axial', subtype: 'edge' });
  }

  const divisors = getDivisors(arr.length).filter((d) => d !== 1);
  for (const divisor of divisors) {
    let isSimmetric = true;
    const step = arr.length / divisor;
    for (let i = 0; i < step; i++) {
      for (let j = 0; j < arr.length; j += step) {
        if (arr[i] !== arr[j]) {
          isSimmetric = false;
          break;
        }
      }
    }
    if (isSimmetric) {
      simmetries.push({ type: 'rotational', angle: 360 / divisor });
    }
  }

  return simmetries;
}

export function palindrome(arr: number[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== arr[arr.length - i - 1]) return false;
  }
  return true;
}

export function fromBase(arr: number[], base: number): number {
  let result = 0;
  for (let i = 0; i < arr.length; i++) {
    result += arr[i] * Math.pow(base, arr.length - i - 1);
  }
  return result;
}

export function cyclicallyInclude<T>(arr: T[], sub: T[]): boolean {
  if (sub.length > arr.length) return false;
  if (sub.some((a) => !arr.includes(a))) return false;
  for (let i = 0; i < arr.length; i++) {
    let match = true;
    for (let j = 0; j < sub.length; j++) {
      if (arr[(i + j) % arr.length] !== sub[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/** Reflect an array about `center` (or about its midpoint when center is null). */
export function simmetrize<T>(arr: T[], center: number | null = null): T[] {
  if (center === null) {
    const out: T[] = [];
    for (let i = 0; i < arr.length / 2 + 1; i++) {
      out.push(arr[arr.length - i - 1]);
    }
    return out;
  }
  const out: T[] = [];
  for (let i = center; i < arr.length + center; i++) {
    out.push(arr[(center - (i - center) + arr.length * 100) % arr.length]);
  }
  return out;
}

/** Weighted random pick using an injected Rng (defaults to uniform weights). */
export function pickRandom<T>(
  arr: T[],
  rng: Rng,
  weights: number[] = Array.from({ length: arr.length }, () => 1 / arr.length),
): T {
  const sum = weights.reduce((a, b) => a + b, 0);
  const random = rng.next() * sum;
  let cumulative = 0;
  for (let i = 0; i < arr.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) return arr[i];
  }
  return arr[arr.length - 1];
}

export function findSubsequenceStartingIndex<T>(arr: T[], subsequence: T[]): number[] {
  if (subsequence.length > arr.length) return [];
  const startingIndexes: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    let match = true;
    for (let j = 0; j < subsequence.length; j++) {
      if (arr[(i + j) % arr.length] !== subsequence[j]) {
        match = false;
        break;
      }
    }
    if (match) startingIndexes.push(i);
  }
  return startingIndexes;
}

export function isEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isEqualOrChiral<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const rotated = a.slice(i).concat(a.slice(0, i));
    if (isEqual(rotated, b)) return true;
  }
  const reversed = a.slice().reverse();
  for (let i = 0; i < a.length; i++) {
    const rotated = reversed.slice(i).concat(reversed.slice(0, i));
    if (isEqual(rotated, b)) return true;
  }
  return false;
}

export function sum(arr: number[]): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}

export function count(str: string, char: string): number {
  return str.split(char).length - 1;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
