import { TOLERANCE } from './constants';

interface Point {
  x: number;
  y: number;
}

/** Linearly remap `value` from [start1, stop1] to [start2, stop2]. */
export function map(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
): number {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

/** True when two numbers, or two points, are within TOLERANCE of each other. */
export function isWithinTolerance(a: number, b: number): boolean;
export function isWithinTolerance(a: Point, b: Point): boolean;
export function isWithinTolerance(a: number | Point, b: number | Point): boolean {
  if (typeof a === 'number') {
    return Math.abs(a - (b as number)) < TOLERANCE;
  }
  const p = b as Point;
  return Math.abs(a.x - p.x) < TOLERANCE && Math.abs(a.y - p.y) < TOLERANCE;
}
