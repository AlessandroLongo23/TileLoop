import { describe, it, expect } from 'vitest';
import { Vector } from './Vector';

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('Vector', () => {
  it('fromPolar offsets from the center', () => {
    const v = Vector.fromPolar(new Vector(1, 1), 2, 0);
    close(v.x, 3);
    close(v.y, 1);
  });

  it('midpoint', () => {
    const m = Vector.midpoint(new Vector(0, 0), new Vector(4, 2));
    expect(m.x).toBe(2);
    expect(m.y).toBe(1);
  });

  it('add/sub/scale are chainable copies', () => {
    const a = new Vector(1, 2);
    const r = Vector.add(a, new Vector(3, 4));
    expect(r.x).toBe(4);
    expect(r.y).toBe(6);
    // static add does not mutate
    expect(a.x).toBe(1);
  });

  it('rotate by 90 degrees', () => {
    const v = new Vector(1, 0).rotate(Math.PI / 2);
    close(v.x, 0);
    close(v.y, 1);
  });

  it('mirror across the x axis (angle 0)', () => {
    const v = new Vector(1, 2).mirror(0);
    close(v.x, 1);
    close(v.y, -2);
  });

  it('distance', () => {
    close(Vector.distance(new Vector(0, 0), new Vector(3, 4)), 5);
  });

  it('mag / normalize', () => {
    const v = new Vector(3, 4);
    close(v.mag(), 5);
    const n = v.copy().normalize();
    close(n.mag(), 1);
  });
});
