import type { Pt } from './puzzle';

/** Area centre of an outline: every symmetry of the outline keeps it in place. */
export function areaCentre(v: Pt[]): Pt {
  let a = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < v.length; i++) {
    const p = v[i];
    const q = v[(i + 1) % v.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    x += (p.x + q.x) * cross;
    y += (p.y + q.y) * cross;
  }
  return { x: x / (3 * a), y: y / (3 * a) };
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const reflect = (p: Pt, c: Pt, angle: number): Pt => {
  const u = { x: Math.cos(angle), y: Math.sin(angle) };
  const d = { x: p.x - c.x, y: p.y - c.y };
  const s = d.x * u.x + d.y * u.y;
  return { x: c.x + 2 * s * u.x - d.x, y: c.y + 2 * s * u.y - d.y };
};

/**
 * The turns and mirror lines that map an outline onto itself: `order` positions in a full turn
 * (1 when it only fits one way round), and the mirror lines through its centre as angles in [0, π).
 */
export function outlineSymmetry(v: Pt[]): { order: number; axes: number[] } {
  const c = areaCentre(v);
  const size = Math.max(...v.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
  const same = (q: Pt[]) => q.every((a) => v.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-4 * size));
  let order = 1;
  for (let k = v.length; k >= 2; k--) {
    if (v.length % k) continue;
    const a = (2 * Math.PI) / k;
    const turned = v.map((p) => ({ x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a) }));
    if (same(turned)) {
      order = k;
      break;
    }
  }
  // a mirror line passes through a corner or the middle of a side
  const axes: number[] = [];
  for (const p of [...v, ...v.map((p, i) => mid(p, v[(i + 1) % v.length]))]) {
    if (Math.hypot(p.x - c.x, p.y - c.y) < 1e-9) continue;
    const angle = (Math.atan2(p.y - c.y, p.x - c.x) + Math.PI) % Math.PI;
    if (axes.some((a) => Math.abs(a - angle) < 1e-6 || Math.abs(a - angle) > Math.PI - 1e-6)) continue;
    if (same(v.map((q) => reflect(q, c, angle)))) axes.push(angle);
  }
  return { order, axes };
}

/** Where each side lands when the outline is mirrored across the line at `angle` through its centre. */
export function mirrorEdges(v: Pt[], angle: number): number[] {
  const c = areaCentre(v);
  const mids = v.map((p, i) => mid(p, v[(i + 1) % v.length]));
  const size = Math.max(...v.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
  return mids.map((m) => {
    const r = reflect(m, c, angle);
    const j = mids.findIndex((q) => Math.hypot(q.x - r.x, q.y - r.y) < 1e-4 * size);
    if (j < 0) throw new Error('mirror line is not a symmetry of this outline');
    return j;
  });
}
