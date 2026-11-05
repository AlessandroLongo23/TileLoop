import { buildPuzzle, chapterRules, type Chapter, type Pt, type Puzzle, type PuzzleTile } from '@tileloop/core';
import { emblem, type Emblem, type EmblemOpts } from './emblem';
import { ngon, flipped, star, rhomb, shape, pair, cog, split, rayHit, walk, regular, centroid, type Frame, type FrameOf } from './frames';

/** Screen angles of the five sections: clockwise from the left, the finale at the bottom. */
const RING_AT = [162, 234, 306, 18, 90];
/** Medallion radius and spoke length, in points (before fitting). */
const MEDALLION = 44;
const SPOKE = 34;
/** Room kept between neighbouring frames, and off the line coming in from above. */
const CLEAR = 36;
const CLEAR_ENTRY = 20;
/** Room above the medallion for the line that comes in (and its ring, on the first chapter). */
const ABOVE = 58;
/** Empty band above and below each chapter: where the colours of one chapter turn into the next. */
export const BAND = 44;

const SQUARES = '4-4-0,4/r90/m(v2)';
const HEXAGONS = '6/r60/r(h1)';

interface Plan {
  rule: string;
  emblem?: EmblemOpts;
  frames: FrameOf[];
}

const five = (f: Frame) => Array.from({ length: 5 }, () => f);
const area = (t: PuzzleTile) => Math.abs(t.verts.reduce((s, v, i) => s + v.x * t.verts[(i + 1) % t.n].y - t.verts[(i + 1) % t.n].x * v.y, 0)) / 2;
const inner = (t: PuzzleTile) => t.neighbors.every((nb) => nb);
const odd = (t: PuzzleTile) => inner(t) && !regular(t.verts);
// Fractal's emblem: a whole tile whose every neighbour is a split one
const bigAmongSmall = (t: PuzzleTile, p: Puzzle) => inner(t) && t.neighbors.every((nb) => area(p.tiles[nb!.tile]) < area(t) * 0.5);

/**
 * Real odd cells from each section's own tilings: the inner cell nearest the centre that is not a
 * regular polygon, preferring a shape (then an orientation) no earlier section has used. Boards are
 * small and later tilings are built only when needed: a dual tiling takes a while to grow.
 */
function oddCells(ch: Chapter): (Pt[] | null)[] {
  const used: Pt[][] = [];
  const sig = (v: Pt[], turn: boolean) => {
    const n = v.length;
    const side = v.map((p, i) => Math.hypot(v[(i + 1) % n].x - p.x, v[(i + 1) % n].y - p.y).toFixed(2));
    return turn ? [...side].sort().join() : v.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort().join();
  };
  const fresh = (cells: Pt[][], turn: boolean) => cells.find((c) => !used.some((u) => sig(u, turn) === sig(c, turn)));
  return ch.sections.map((sec) => {
    const seen: Pt[][] = [];
    let pick: Pt[] | undefined;
    for (const rule of sec.rules) {
      const p = buildPuzzle({ rule: rule.replace('{n}', '1'), tiles: 40, density: 0.5 }, 3);
      const cells = p.tiles
        .filter(odd)
        .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
        .map((t) => t.verts.map((v) => ({ x: v.x - t.x, y: v.y - t.y })));
      seen.push(...cells);
      if ((pick = fresh(cells, true))) break;
    }
    pick ??= fresh(seen, false) ?? seen[0];
    if (pick) used.push(pick);
    return pick ?? null;
  });
}

/** Each chapter's frames and emblem, by title. */
const PLANS: Record<string, (ch: Chapter) => Plan> = {
  Squares: () => ({ rule: SQUARES, frames: five(shape(ngon(4))) }),
  Honeycomb: () => ({ rule: HEXAGONS, frames: five(shape(ngon(6))) }),
  Triangles: () => ({ rule: '3/r60/r(h2)', frames: [0, 1, 2, 3, 4].map((k) => shape(k % 2 ? flipped(ngon(3)) : ngon(3), { cut: 7 })) }),
  Weave: () => ({ rule: '6-3-6/m30/r(v4)', frames: [6, 4, 8, 3, 12].map((n) => shape(ngon(n), { cut: n === 3 ? 7 : 5 })) }),
  Pairs: () => ({
    rule: SQUARES,
    emblem: { links: true },
    frames: [[4, 4], [6, 6], [4, 4], [4, 6], [6, 4]].map(([a, b], k) => pair(ngon(a), ngon(b), k === 2 ? 'reverse' : 'link')),
  }),
  Twins: () => ({ rule: SQUARES, emblem: { w: 2 }, frames: [4, 6, 3, 8, 6].map((n) => shape(ngon(n), { twin: true, cut: n === 3 ? 7 : 5 })) }),
  Turns: () => ({
    rule: 'atlas:ctrnact-mixed-family-k1-16',
    frames: [shape(rhomb(), { cut: 4 }), shape(ngon(8)), shape(star(4, 0.5), { cut: 3 }), shape(star(6, 0.6), { cut: 3 }), shape(star(8, 0.7), { cut: 3 })],
  }),
  Mirrors: (ch) => {
    const cells = oddCells(ch);
    const cell = (k: number) => cells[k] ?? cells.find((c) => c) ?? ngon(5);
    // mirror links: a cell and its mirror image across a dashed axis
    return { rule: ch.sections[0].rules[0], emblem: { pick: odd }, frames: [0, 1, 2, 3, 4].map((k) => (k === 3 ? pair(cell(1), null, 'mirror') : shape(cell(k), { cut: 3 }))) };
  },
  Fractal: () => ({ rule: 'split:squares:0.5:2', emblem: { seed: 2, pick: bigAmongSmall }, frames: [split(4), split(4), split(3), split(4), split(4)] }),
  Gears: () => ({ rule: HEXAGONS, emblem: { gear: true }, frames: [6, 8, 6, 10, 12].map(cog) }),
};
const planOf = (ch: Chapter): Plan => PLANS[ch.title]?.(ch) ?? { rule: chapterRules(ch)[0], frames: five(shape(ngon(4))) };

/** One section's frame, laid out and ready to draw (paths in points, round the medallion at 0,0). */
export interface Ring {
  /** Outline paths, two per loop when twin. */
  outlines: string[];
  /** The closed loops, filled once the section is finished. */
  fill: string;
  deco: string[];
  spoke: [Pt, Pt];
  bar?: { a: Pt; b: Pt; kind: 'link' | 'reverse' | 'mirror' };
  /** The ten beads, in level order. */
  beads: Pt[];
  /** The solid stretch from the spoke through bead j, for each j. */
  arcs: string[];
  centre: Pt;
}

export interface Rosette {
  rings: Ring[];
  /** Medallion radius after fitting. */
  r: number;
  /** The block the chapter takes on the map, round its medallion at (0, 0). */
  top: number;
  bottom: number;
  /** Bottom of the finale frame, where the line leaves for the next chapter. */
  exit: number;
  emblem: () => Emblem;
}

const f = (n: number) => n.toFixed(1);
const pathOf = (pts: Pt[], close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('') + (close ? 'Z' : '');
const rad = (d: number) => (d * Math.PI) / 180;

const plans = new Map<number, Plan>();
const emblems = new Map<number, Emblem>();
const layouts = new Map<string, Rosette>();

/** A chapter's rosette, fitted to a screen `width` wide. Pure in the chapter, so it is kept. */
export function rosette(ch: Chapter, width: number): Rosette {
  const key = `${ch.id}|${width}`;
  const kept = layouts.get(key);
  if (kept) return kept;
  if (!plans.has(ch.id)) plans.set(ch.id, planOf(ch));
  const plan = plans.get(ch.id)!;
  const dirs = RING_AT.map((d) => ({ x: Math.cos(rad(d)), y: Math.sin(rad(d)) }));
  const frames = plan.frames.map((fr, k) => (typeof fr === 'function' ? fr(dirs[k]) : fr));

  // each frame sits out along its direction, just far enough for its spoke
  const reach = (fr: Frame, u: Pt) => Math.max(...fr.loops.flat().map((p) => -(p.x * u.x + p.y * u.y)));
  const D = frames.map((fr, k) => MEDALLION + SPOKE + reach(fr, dirs[k]));
  const sample = (k: number) => frames[k].loops.flat().filter((_, i) => i % 3 === 0).map((p) => ({ x: p.x + D[k] * dirs[k].x, y: p.y + D[k] * dirs[k].y }));
  // then further, until neighbours keep clear of each other and of the line coming in from above
  for (let iter = 0; iter < 300; iter++) {
    let moved = false;
    for (let k = 0; k < 5; k++) {
      const j = (k + 1) % 5;
      const [a, b] = [sample(k), sample(j)];
      let near = Infinity;
      for (const p of a) for (const q of b) near = Math.min(near, Math.hypot(p.x - q.x, p.y - q.y));
      if (near < CLEAR) {
        D[k] += 1.5;
        D[j] += 1.5;
        moved = true;
      }
    }
    for (const k of [1, 2]) {
      const off = Math.min(...sample(k).filter((p) => p.y < 0).map((p) => Math.abs(p.x)));
      if (off < CLEAR_ENTRY) {
        D[k] += 1.5;
        moved = true;
      }
    }
    if (!moved) break;
  }

  // fit the rosette to the screen, the medallion in the middle and beads (7pt) clear of the 16pt margins
  const all = frames.flatMap((fr, k) => [...fr.loops.flat(), ...(fr.deco ?? []).flat()].map((p) => ({ x: p.x + D[k] * dirs[k].x, y: p.y + D[k] * dirs[k].y })));
  const half = Math.max(MEDALLION, ...all.map((p) => Math.abs(p.x)));
  const s = Math.min(1, (width - 46) / (2 * half));
  const r = MEDALLION * s;

  const rings = frames.map((fr, k): Ring => {
    const u = dirs[k];
    const c = { x: D[k] * u.x, y: D[k] * u.y };
    const W = (p: Pt) => ({ x: (c.x + p.x) * s, y: (c.y + p.y) * s });
    // a twin frame draws two outlines, 2.4pt either side of the beads
    const inr = Math.min(...fr.loops[0].map((p) => Math.hypot(p.x, p.y)));
    const offsets = fr.twin ? [-2.4, 2.4] : [0];
    const twin = (pts: Pt[], o: number) => pts.map((p) => W({ x: p.x * (1 + o / inr), y: p.y * (1 + o / inr) }));
    const entrance = rayHit(fr.loops[0], { x: 0, y: 0 }, { x: -u.x, y: -u.y });
    const e = W(entrance);
    const el = Math.hypot(e.x, e.y);
    const path = walk(fr.loops, fr.bar ? [fr.bar.a, fr.bar.b] : [entrance]);
    return {
      outlines: fr.loops.flatMap((loop) => offsets.map((o) => pathOf(twin(loop, o), true))),
      fill: fr.loops.map((loop) => pathOf(loop.map(W), true)).join(''),
      deco: (fr.deco ?? []).map((line) => pathOf(line.map(W))),
      spoke: [{ x: (e.x / el) * r, y: (e.y / el) * r }, e],
      bar: fr.bar && { a: W(fr.bar.a), b: W(fr.bar.b), kind: fr.bar.kind },
      beads: Array.from({ length: 10 }, (_, j) => W(path.at(((j + 0.5) / 10) * path.total))),
      arcs: Array.from({ length: 10 }, (_, j) =>
        path
          .upTo(((j + 0.5) / 10) * path.total)
          .flatMap((part) => offsets.map((o) => pathOf(twin(part, o))))
          .join(''),
      ),
      centre: W({ x: 0, y: 0 }),
    };
  });

  // the line leaves straight down through the bottom of the finale (its outer loop, for a pair)
  const last = frames[4].loops[frames[4].loops.length - 1];
  const exit = (D[4] + rayHit(last, centroid(last), { x: 0, y: 1 }).y + (frames[4].twin ? 2.4 : 0)) * s;
  const out: Rosette = {
    rings,
    r,
    top: Math.min(-r - ABOVE, ...all.map((p) => p.y * s - BAND)),
    bottom: Math.max(exit, ...all.map((p) => p.y * s)) + BAND,
    exit,
    emblem: () => {
      if (!emblems.has(ch.id)) emblems.set(ch.id, emblem(plan.rule.replace('{n}', '1'), plan.emblem));
      return emblems.get(ch.id)!;
    },
  };
  layouts.set(key, out);
  return out;
}
