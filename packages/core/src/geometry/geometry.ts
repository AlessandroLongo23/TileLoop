import { TOLERANCE } from './constants';
import { Vector } from './Vector';

interface Point {
  x: number;
  y: number;
}

/** Sort points clockwise by angle, breaking ties by distance from origin. */
export function sortPointsByAngleAndDistance<T extends Point>(points: T[]): T[] {
  return points.sort((a, b) => {
    const angleA = getClockwiseAngle(a);
    const angleB = getClockwiseAngle(b);
    if (Math.abs(angleA - angleB) < TOLERANCE) {
      const distA = Math.sqrt(a.x ** 2 + a.y ** 2);
      const distB = Math.sqrt(b.x ** 2 + b.y ** 2);
      return distA - distB;
    }
    return angleA - angleB;
  });
}

/** Clockwise angle of a point from the positive Y axis, in [0, 2π). */
export function getClockwiseAngle(point: Point): number {
  if (Math.abs(point.x) < TOLERANCE) return point.y > 0 ? 0 : Math.PI;
  let angle = Math.PI / 2 - Math.atan2(point.y, point.x);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

/** Apothem of a regular n-gon with unit edge length. */
export function apothem(n: number): number {
  return 0.5 / Math.tan(Math.PI / n);
}

/** Interior angle at vertex `b` of the path a→b→c. */
export function angleBetween(a: Point, b: Point, c: Point): number {
  const v1 = new Vector(a.x - b.x, a.y - b.y);
  const v2 = new Vector(c.x - b.x, c.y - b.y);
  return (v1.heading() - v2.heading() + Math.PI) % Math.PI;
}

/**
 * Intersection of two parametric lines: point `a` + t·`t1` and `b` + s·`t2`.
 * Returns null when the lines are (near) parallel.
 */
export function computeIntersection(
  a: Point,
  t1: Point,
  b: Point,
  t2: Point,
): Vector | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const det = t1.x * t2.y - t1.y * t2.x;
  if (Math.abs(det) < 1e-10) return null;
  const t = (dx * t2.y - dy * t2.x) / det;
  const cx = a.x + t * t1.x;
  const cy = a.y + t * t1.y;
  return new Vector(cx, cy);
}
