import { atlasTilings } from '../data/atlasTilings';
import type { Pt } from '../game/puzzle';

/** One tile of a patch: its outline, edge midpoints and how many distinct turns it has. */
export interface TileNode {
  n: number;
  /** Orientations in one full turn: n for a regular polygon, fewer for stars and isotoxal tiles. */
  turns: number;
  centroid: Pt;
  vertices: Pt[];
  halfways: Pt[];
}

/** Build a tile from an outline, ordered so edge midpoints run the same way round as regular tiles. */
export function tileNode(outline: Pt[]): TileNode {
  let v = outline;
  const area = v.reduce((s, p, i) => s + p.x * v[(i + 1) % v.length].y - v[(i + 1) % v.length].x * p.y, 0);
  if (area < 0) v = [...v].reverse();
  const n = v.length;
  const c = { x: v.reduce((s, p) => s + p.x, 0) / n, y: v.reduce((s, p) => s + p.y, 0) / n };
  // the largest rotation group that maps the outline onto itself
  let turns = 1;
  for (let m = n; m > 1; m--) {
    if (n % m) continue;
    const a = (2 * Math.PI) / m;
    const fits = v.every((p) => {
      const x = c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a);
      const y = c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a);
      return v.some((q) => Math.hypot(q.x - x, q.y - y) < 1e-4);
    });
    if (fits) {
      turns = m;
      break;
    }
  }
  const halfways = v.map((p, i) => ({ x: (p.x + v[(i + 1) % n].x) / 2, y: (p.y + v[(i + 1) % n].y) / 2 }));
  return { n, turns, centroid: c, vertices: v, halfways };
}

/** Copies of an Atlas tiling's cell around the origin, enough for at least `want` tiles. */
export function atlasNodes(id: string, want: number): TileNode[] {
  const t = atlasTilings.find((x) => x.id === id);
  if (!t) return [];
  const [[ax, ay], [bx, by]] = t.basis;
  const cell = t.polys.map((p) => p.map(([x, y]) => ({ x, y })));
  const all = cell.flat();
  const mid = { x: all.reduce((s, p) => s + p.x, 0) / all.length, y: all.reduce((s, p) => s + p.y, 0) / all.length };
  let r = 1;
  while ((2 * r + 1) ** 2 * cell.length < want) r++;
  const out: TileNode[] = [];
  for (let i = -r; i <= r; i++)
    for (let j = -r; j <= r; j++) {
      const dx = i * ax + j * bx - mid.x;
      const dy = i * ay + j * by - mid.y;
      for (const p of cell) out.push(tileNode(p.map((q) => ({ x: q.x + dx, y: q.y + dy }))));
    }
  return out;
}
