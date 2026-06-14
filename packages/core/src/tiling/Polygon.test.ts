import { describe, it, expect } from 'vitest';
import { RegularPolygon } from './Polygon';
import { Vector } from '../geometry/Vector';

const square = () => new RegularPolygon({ centroid: new Vector(0, 0), n: 4, angle: 0 });

describe('Polygon', () => {
  it('a square has 4 vertices and 4 halfways', () => {
    const s = square();
    expect(s.vertices).toHaveLength(4);
    expect(s.halfways).toHaveLength(4);
  });

  it('contains its own centroid', () => {
    const s = square();
    expect(s.containsPoint(new Vector(0, 0))).toBe(true);
    expect(s.containsPoint(new Vector(100, 100))).toBe(false);
  });

  it('rotate appends an svg rotate transform and re-derives vertices', () => {
    const s = square();
    const before = s.vertices.map((v) => ({ x: v.x, y: v.y }));
    s.rotate(1);
    expect(s.svgTransform).toContain('rotate(');
    expect(s.turns).toBe(1);
    const after = s.vertices.map((v) => ({ x: v.x, y: v.y }));
    expect(after).not.toEqual(before);
  });

  it('visual-only mirror (false) flips the flag without altering connections', () => {
    const s = square();
    s.halfways.forEach((h, i) => (h.connections = [1, 2, 0, 0][i]));
    s.mirror(false);
    expect(s.mirrored).toBe(true);
    expect(s.svgTransform).toContain('scaleX(-1)');
    expect(s.halfways.map((h) => h.connections)).toEqual([1, 2, 0, 0]);
  });

  it('data mirror (true) reflects the connection values', () => {
    const s = square();
    s.halfways.forEach((h, i) => (h.connections = [1, 2, 0, 0][i]));
    s.mirror(true);
    expect(s.halfways.map((h) => h.connections)).toEqual([2, 1, 0, 0]);
  });
});
