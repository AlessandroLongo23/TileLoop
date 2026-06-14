import { describe, it, expect } from 'vitest';
import { computeIntersection, apothem, getClockwiseAngle } from './geometry';
import { isWithinTolerance, map } from './math';
import { getSpatialKey } from './optimizing';
import { Vector } from './Vector';

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('geometry', () => {
  it('computeIntersection of perpendicular lines', () => {
    // line through (0,0) along x, line through (2,-1) along y → (2,0)
    const p = computeIntersection(
      new Vector(0, 0),
      new Vector(1, 0),
      new Vector(2, -1),
      new Vector(0, 1),
    );
    expect(p).not.toBeNull();
    close(p!.x, 2);
    close(p!.y, 0);
  });

  it('computeIntersection returns null for parallel lines', () => {
    const p = computeIntersection(
      new Vector(0, 0),
      new Vector(1, 0),
      new Vector(0, 1),
      new Vector(1, 0),
    );
    expect(p).toBeNull();
  });

  it('apothem of a unit square', () => {
    close(apothem(4), 0.5);
  });

  it('getClockwiseAngle along +Y is 0', () => {
    close(getClockwiseAngle({ x: 0, y: 1 }), 0);
  });
});

describe('math', () => {
  it('map remaps a range', () => {
    expect(map(5, 0, 10, 0, 100)).toBe(50);
  });

  it('isWithinTolerance for numbers and points', () => {
    expect(isWithinTolerance(1, 1.005)).toBe(true);
    expect(isWithinTolerance(1, 1.5)).toBe(false);
    expect(isWithinTolerance({ x: 0, y: 0 }, { x: 0.005, y: -0.005 })).toBe(true);
  });
});

describe('optimizing', () => {
  it('getSpatialKey buckets nearby points together', () => {
    expect(getSpatialKey(0, 0)).toBe(getSpatialKey(0.005, 0.005));
  });
});
