import type { Pt } from '@tileloop/core';

/**
 * A section's frame on the map, in points, centred on its middle and upright (the tiling's own
 * orientation). Beads run clockwise along `loops`: one loop, or two for a pair.
 */
export interface Frame {
  loops: Pt[][];
  /** Drawn as two parallel outlines, the beads on the midline. */
  twin?: boolean;
  /** Extra line work in the frame's pen: split lines, gear teeth. */
  deco?: Pt[][];
  /** What joins a pair's two loops, from `a` on the first to `b` on the second. */
  bar?: { a: Pt; b: Pt; kind: 'link' | 'reverse' | 'mirror' };
}

/** A frame, or one built for the direction `u` from the medallion out to it (a pair lines up with its spoke). */
export type FrameOf = Frame | ((u: Pt) => Frame);

/** Every frame has the same length, so beads keep the same spacing everywhere. */
export const PERIMETER = 300;

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const perimeter = (v: Pt[]) => v.reduce((s, p, i) => s + dist(p, v[(i + 1) % v.length]), 0);
export const centroid = (v: Pt[]) => ({ x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length });
const moved = (v: Pt[], d: Pt, k = 1) => v.map((p) => ({ x: (p.x + d.x) * k, y: (p.y + d.y) * k }));
/** Signed area, positive when the outline runs clockwise on screen (y down). */
const area = (v: Pt[]) => v.reduce((s, p, i) => s + p.x * v[(i + 1) % v.length].y - v[(i + 1) % v.length].x * p.y, 0) / 2;
const clockwise = (v: Pt[]) => (area(v) < 0 ? [...v].reverse() : v);

/** Soften corners with a short curve, then sample the outline every 2pt or so. */
function rounded(v: Pt[], cut = 5): Pt[] {
  const out: Pt[] = [];
  const n = v.length;
  const corner = (i: number) => {
    const [a, b, c] = [v[(i - 1 + n) % n], v[i], v[(i + 1) % n]];
    const k = Math.min(cut, dist(a, b) / 3, dist(b, c) / 3);
    return {
      p: { x: b.x + ((a.x - b.x) / dist(a, b)) * k, y: b.y + ((a.y - b.y) / dist(a, b)) * k },
      q: { x: b.x + ((c.x - b.x) / dist(b, c)) * k, y: b.y + ((c.y - b.y) / dist(b, c)) * k },
    };
  };
  for (let i = 0; i < n; i++) {
    const { p, q } = corner(i);
    const b = v[i];
    for (let t = 0; t <= 1; t += 0.125) {
      const u = 1 - t;
      out.push({ x: u * u * p.x + 2 * u * t * b.x + t * t * q.x, y: u * u * p.y + 2 * u * t * b.y + t * t * q.y });
    }
    // the straight run to the next corner
    const end = corner((i + 1) % n).p;
    const steps = Math.max(2, Math.round(dist(q, end) / 2));
    for (let s = 1; s < steps; s++) out.push({ x: q.x + ((end.x - q.x) * s) / steps, y: q.y + ((end.y - q.y) * s) / steps });
  }
  return out;
}

/** An outline of length `len` (before rounding), centred on its middle. */
function fit(v: Pt[], len: number, cut: number): { loop: Pt[]; k: number; c: Pt } {
  const k = len / perimeter(v);
  const loop = rounded(moved(clockwise(v), { x: 0, y: 0 }, k), cut);
  const c = centroid(loop);
  return { loop: moved(loop, { x: -c.x, y: -c.y }), k, c };
}

/** Regular polygon with an edge facing up. */
export function ngon(n: number): Pt[] {
  return Array.from({ length: n }, (_, k) => {
    const a = -Math.PI / 2 + Math.PI / n + (2 * Math.PI * k) / n;
    return { x: Math.cos(a), y: Math.sin(a) };
  });
}

/** The same polygon pointing the other way (a triangle tiling alternates them). */
export const flipped = (v: Pt[]) => v.map((p) => ({ x: -p.x, y: -p.y }));

/** Star with `k` points, a notch facing up. */
export function star(k: number, inner: number): Pt[] {
  return Array.from({ length: 2 * k }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / k;
    const r = i % 2 === 0 ? inner : 1;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

export const rhomb = (): Pt[] => [
  { x: 0, y: -1 },
  { x: 0.62, y: 0 },
  { x: 0, y: 1 },
  { x: -0.62, y: 0 },
];

/** A plain frame on an outline. `deco` lines are given in the outline's own units. */
export function shape(v: Pt[], opts: { twin?: boolean; cut?: number; deco?: Pt[][] } = {}): Frame {
  const { loop, k, c } = fit(v, PERIMETER, opts.cut ?? 5);
  const deco = opts.deco?.map((line) => line.map((p) => ({ x: p.x * k - c.x, y: p.y * k - c.y })));
  return { loops: [loop], twin: opts.twin, deco };
}

/** Where a ray from `c` along `d` leaves a closed outline. */
export function rayHit(loop: Pt[], c: Pt, d: Pt): Pt {
  let best = Infinity;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - c.x) * ey - (a.y - c.y) * ex) / den;
    const u = ((a.x - c.x) * d.y - (a.y - c.y) * d.x) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return { x: c.x + d.x * best, y: c.y + d.y * best };
}

const GAP = 18;

/**
 * Two small upright frames of half length, the second further out along the spoke. A link joins
 * them with a bar (dashed when it turns the other way); a mirror sets a dashed axis between a cell
 * and its mirror image.
 */
export function pair(a: Pt[], b: Pt[] | null, kind: 'link' | 'reverse' | 'mirror'): (u: Pt) => Frame {
  return (u) => {
    const A = fit(a, PERIMETER / 2, 4).loop;
    const reach = (v: Pt[], s: number) => Math.max(...v.map((p) => s * (p.x * u.x + p.y * u.y)));
    let B: Pt[];
    if (kind === 'mirror') {
      // reflect A across the axis, square to the spoke, halfway across the gap
      const m = reach(A, 1) + GAP / 2;
      B = clockwise(A.map((p) => ({ x: p.x - 2 * (p.x * u.x + p.y * u.y - m) * u.x, y: p.y - 2 * (p.x * u.x + p.y * u.y - m) * u.y })));
    } else {
      const B0 = fit(b ?? a, PERIMETER / 2, 4).loop;
      const off = reach(A, 1) + GAP + reach(B0, -1);
      B = moved(B0, { x: u.x * off, y: u.y * off });
    }
    const cb = centroid(B);
    return { loops: [A, B], bar: { a: rayHit(A, { x: 0, y: 0 }, u), b: rayHit(B, cb, { x: -u.x, y: -u.y }), kind } };
  };
}

/** A cog: beads ride the rim, the teeth stand outside it. */
export function cog(teeth: number): Frame {
  const r = PERIMETER / (2 * Math.PI);
  const at = (a: number, rr: number) => ({ x: rr * Math.cos(a), y: rr * Math.sin(a) });
  const loop = Array.from({ length: 180 }, (_, i) => at((2 * Math.PI * i) / 180 - Math.PI / 2, r));
  const half = 6 / r;
  const deco = Array.from({ length: teeth }, (_, k) => {
    const a = -Math.PI / 2 + Math.PI / teeth + (2 * Math.PI * k) / teeth;
    return [at(a - half, r), at(a - half * 0.75, r + 9), at(a + half * 0.75, r + 9), at(a + half, r)];
  });
  return { loops: [loop], deco };
}

/** A square or triangle split once, with one of its parts split again. */
export function split(n: 3 | 4): Frame {
  const v = ngon(n);
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const deco: Pt[][] = [];
  if (n === 4) {
    const [a, b, c, d] = v;
    const [ab, bc, cd, da, o] = [mid(a, b), mid(b, c), mid(c, d), mid(d, a), mid(a, c)];
    deco.push([ab, cd], [bc, da], [mid(ab, b), mid(o, bc)], [mid(b, bc), mid(ab, o)]);
  } else {
    const [a, b, c] = v;
    const [ab, bc, ca] = [mid(a, b), mid(b, c), mid(c, a)];
    deco.push([ab, bc, ca, ab], [mid(b, ab), mid(b, bc), mid(ab, bc), mid(b, ab)]);
  }
  return shape(v, { cut: 3, deco });
}

/**
 * An arc-length walk over a frame's loops, each loop starting at its point nearest `starts[i]`:
 * `at(s)` is the point `s` along, `upTo(s)` the stretch from the start to there (a path per loop).
 */
export function walk(loops: Pt[][], starts: Pt[]) {
  const ordered = loops.map((loop, i) => {
    let best = 0;
    loop.forEach((p, j) => {
      if (dist(p, starts[i]) < dist(loop[best], starts[i])) best = j;
    });
    const r = [...loop.slice(best), ...loop.slice(0, best)];
    return [...r, r[0]];
  });
  const cum = ordered.map((l) => {
    const c = [0];
    for (let i = 1; i < l.length; i++) c.push(c[i - 1] + dist(l[i - 1], l[i]));
    return c;
  });
  const lens = cum.map((c) => c[c.length - 1]);
  const total = lens.reduce((a, b) => a + b, 0);
  const at = (s: number): Pt => {
    let li = 0;
    while (li < lens.length - 1 && s > lens[li]) s -= lens[li++];
    const c = cum[li];
    const i = Math.max(1, c.findIndex((v) => v >= s));
    const k = (s - c[i - 1]) / (c[i] - c[i - 1] || 1);
    const [a, b] = [ordered[li][i - 1], ordered[li][i]];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const upTo = (s: number) => {
    const parts: Pt[][] = [];
    for (let li = 0, before = 0; li < ordered.length && s > before; before += lens[li++]) {
      const local = s - before;
      const pts = ordered[li].filter((_, i) => cum[li][i] <= local);
      if (local < lens[li]) pts.push(at(s));
      parts.push(pts);
    }
    return parts;
  };
  return { at, upTo, total };
}

/** True for a regular polygon: all sides equal and all corners on one circle. */
export function regular(v: Pt[]): boolean {
  const c = centroid(v);
  const sides = v.map((p, i) => dist(p, v[(i + 1) % v.length]));
  const radii = v.map((p) => dist(p, c));
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
  return spread(sides) < 1e-3 * sides[0] && spread(radii) < 1e-3 * radii[0];
}
