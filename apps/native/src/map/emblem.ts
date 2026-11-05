import { buildPuzzle, tileArt, outlinePoints, type Pt, type Puzzle, type PuzzleTile } from '@tileloop/core';

export interface EmblemOpts {
  /** Connection value: 2 draws twin lines. */
  w?: number;
  /** Line ends alternate solid dots and rings, the way linked tiles are marked. */
  links?: boolean;
  /** The centre tile carries the gear mark. */
  gear?: boolean;
  seed?: number;
  /** Centre on the tile nearest the middle that passes this test. */
  pick?: (t: PuzzleTile, p: Puzzle) => boolean;
}

/** A chapter's emblem in board units: its centre tile joined to every neighbour, each neighbour ending in a ring. */
export interface Emblem {
  c: Pt;
  /** Distance from `c` to the farthest corner drawn. */
  reach: number;
  tiles: { x: number; y: number; paths: string[]; rings: { x: number; y: number; r: number; solid: boolean }[]; gear?: string }[];
}

export function emblem(rule: string, opts: EmblemOpts = {}): Emblem {
  // a small board is enough for one tile and its neighbours, and quick to build (dual tilings are slow)
  const p = buildPuzzle({ rule, tiles: 48, density: 0.5 }, opts.seed ?? 3);
  const pool = opts.pick ? p.tiles.filter((t) => opts.pick!(t, p)) : p.tiles;
  const c0 = (pool.length ? pool : p.tiles).reduce((a, t) => (Math.hypot(t.x, t.y) < Math.hypot(a.x, a.y) ? t : a));
  const set = new Set([c0.id, ...c0.neighbors.flatMap((nb) => (nb ? [nb.tile] : []))]);
  let reach = 0;
  let end = 0;
  const tiles = [...set].map((id) => {
    const t = p.tiles[id];
    for (const v of t.verts) reach = Math.max(reach, Math.hypot(v.x - c0.x, v.y - c0.y));
    const conns = t.neighbors.map((nb) => (nb && set.has(nb.tile) && (t.id === c0.id || nb.tile === c0.id) ? (opts.w ?? 1) : 0));
    const art = tileArt({ ...t, conns });
    return {
      x: t.x,
      y: t.y,
      paths: art.paths,
      rings: art.rings.map((r) => ({ x: r.x, y: r.y, r: r.r, solid: !!r.dot || (!!opts.links && end++ % 2 === 0) })),
      gear: opts.gear && t.id === c0.id ? outlinePoints(t, 0.12) : undefined,
    };
  });
  return { c: { x: c0.x, y: c0.y }, reach, tiles };
}
