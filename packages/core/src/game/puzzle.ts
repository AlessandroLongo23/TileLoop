import { TilingGenerator } from '../tiling/TilingGenerator';
import { atlasNodes, type TileNode } from '../tiling/atlasPatch';
import { splitNodes } from '../tiling/split';
import { mulberry32 } from '../platform/rng';
import { outlineSymmetry, mirrorEdges } from './symmetry';
import type { Rng } from '../platform/types';

/** What a level asks for. Everything else comes from the seed. */
export interface PuzzleSpec {
  rule: string;
  /** Number of tiles on the board. */
  tiles: number;
  /** Chance that an edge between two tiles carries a connection. */
  density?: number;
  /** Share of connections that are double lines. */
  doubles?: number;
  /** Share of tiles whose tap also turns another tile. */
  links?: number;
  /** Board height / width the region grows towards (portrait > 1). */
  aspect?: number;
  /** Share of links whose follower turns the other way. */
  reverse?: number;
  /** Share of tiles that are gears: a tap turns the gear and every neighbour one step. */
  gears?: number;
  /** Share of tiles that start in place and cannot be turned: a hint, for early levels. */
  fixed?: number;
  /** Share of links whose follower cannot be tapped: only its driver moves it. */
  passive?: number;
  /** Share of tiles that mirror a partner across a line drawn on it; the partner cannot be tapped. */
  mirrors?: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface PuzzleTile {
  id: number;
  n: number;
  /** Orientations in one full turn: n for a regular polygon, fewer for stars and isotoxal tiles. */
  turns: number;
  /** Centre, in board units (edge length 1, board centred on 0,0). */
  x: number;
  y: number;
  /** Outline, absolute. A regular polygon looks the same in every orientation. */
  verts: Pt[];
  /** Edge midpoints relative to the centre, by physical edge slot. */
  mids: Pt[];
  /** Connection on each edge in the solved orientation: 0 none, 1 single, 2 double. */
  conns: number[];
  /** Smallest number of turns that maps the pattern onto itself (divides `turns`). */
  period: number;
  /** Turns applied so far. Never wraps, so animations always turn forward. */
  spin: number;
  /** Neighbour across each physical edge. */
  neighbors: ({ tile: number; edge: number } | null)[];
  /** Tile that turns along with this one. */
  link: number | null;
  /** Tile whose tap turns this one. */
  linkedFrom: number | null;
  /** Which way the linked tile turns: 1 with this one, -1 against it. */
  linkDir: 1 | -1;
  /** The link mirrors the follower across its mirror line instead of turning it. */
  linkMirror: boolean;
  /** A tap turns this tile and every neighbour one step. */
  gear: boolean;
  /** Nothing to do here: a pattern turning cannot change, a shape that fits one way only, or a hint. */
  locked: boolean;
  /** Cannot be tapped: only the tile linked to it moves it. */
  passive: boolean;
  /** The outline fits its place only one way round, but has a mirror line: a tap flips it over. */
  flips: boolean;
  /** Mirror line through the centre (radians), for tiles that flip or are mirrored; else null. */
  axis: number | null;
  /** The side each side lands on when the tile is mirrored across `axis`. */
  mirror: number[] | null;
  /** 1 while the tile shows its pattern mirrored across `axis`. */
  flip: number;
}

export interface Puzzle {
  spec: PuzzleSpec;
  seed: number;
  tiles: PuzzleTile[];
  /** Fewest taps that solve the board from its starting position (an upper bound with gears). */
  par: number;
  /** With gears: taps still owed on each tile to undo the scramble (they commute), else null. */
  undo: number[] | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const key = (p: Pt) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

function period(conns: number[], turns: number): number {
  const step = conns.length / turns;
  for (let p = 1; p < turns; p++) {
    if (turns % p === 0 && conns.every((v, i) => v === conns[(i + p * step) % conns.length])) return p;
  }
  return turns;
}

const tilingCache = new Map<string, TileNode[]>();

/** Grow the tiling until it holds enough tiles to cut a round region of `want` from it. */
// `stretch` asks for a bigger patch when the region is a long ellipse; levels all use 1
function tilingFor(rule: string, want: number, stretch = 1): TileNode[] {
  // `atlas:<id>` names a tiling from the Tiling Atlas
  if (rule.startsWith('atlas:')) return atlasNodes(rule.slice(6), want * 2.2 * stretch);
  if (rule.startsWith('split:')) return splitNodes(rule, want * 2.2 * stretch);
  const most = stretch > 1 ? 20 : 8;
  for (let layers = 1; layers <= most; layers++) {
    const id = `${rule}|${layers}`;
    let nodes = tilingCache.get(id);
    if (!nodes) {
      nodes = new TilingGenerator()
        .generateFromRule(rule, layers)
        // a dual tiling's cells are not regular: a rhombus has 2 turns, a kite 1
        // (a dual cell reports n = 3 whatever its corners, so count them)
        .nodes.map((p) => ({ n: p.vertices.length, turns: outlineSymmetry(p.vertices).order, centroid: p.centroid, vertices: p.vertices, halfways: p.halfways }));
      tilingCache.set(id, nodes);
    }
    // a dual tiling's patch comes out lopsided at first: grow it more, so a round board fits inside
    if (nodes.length >= want * (rule.endsWith('*') ? 6 : 2.2) * stretch || layers === most) return nodes;
  }
  return [];
}

/** The `want` tiles closest to the centre, grown one neighbour at a time so the board is one piece. */
function selectRegion(nodes: TileNode[], adj: number[][], want: number, aspect: number): number[] {
  const dist = (i: number) => Math.hypot(nodes[i].centroid.x, nodes[i].centroid.y / aspect);
  let start = 0;
  for (let i = 1; i < nodes.length; i++) if (dist(i) < dist(start)) start = i;
  const chosen = new Set([start]);
  const frontier = new Set(adj[start]);
  while (chosen.size < want && frontier.size) {
    let best = -1;
    for (const i of frontier) if (best < 0 || dist(i) < dist(best)) best = i;
    frontier.delete(best);
    chosen.add(best);
    for (const j of adj[best]) if (!chosen.has(j)) frontier.add(j);
  }
  return [...chosen];
}

function shuffle<T>(a: T[], rng: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a level. Same spec and seed give the same board on every device. */
export function buildPuzzle(spec: PuzzleSpec, seed: number): Puzzle {
  const rng = mulberry32(seed);
  const density = spec.density ?? 0.55;
  const doubles = spec.doubles ?? 0;
  const aspect = spec.aspect ?? 1.3;

  const all = tilingFor(spec.rule, spec.tiles, Math.max(1, Math.max(aspect, 1 / aspect) / 1.3));
  // adjacency of the whole tiling, through shared edge midpoints
  const byMid = new Map<string, { node: number; edge: number }[]>();
  all.forEach((node, i) =>
    node.halfways.forEach((h, e) => {
      const k = key(h);
      const list = byMid.get(k) ?? [];
      list.push({ node: i, edge: e });
      byMid.set(k, list);
    }),
  );
  const adj = all.map(() => [] as number[]);
  for (const list of byMid.values())
    if (list.length === 2) {
      adj[list[0].node].push(list[1].node);
      adj[list[1].node].push(list[0].node);
    }

  const region = selectRegion(all, adj, Math.min(spec.tiles, all.length), aspect);
  const index = new Map(region.map((node, i) => [node, i]));

  const tiles: PuzzleTile[] = region.map((ni, id) => {
    const node = all[ni];
    const c = node.centroid;
    // a shape that fits only one way round flips over its mirror line, if it has one
    const axis = node.turns === 1 ? (outlineSymmetry(node.vertices).axes[0] ?? null) : null;
    return {
      id,
      n: node.n,
      turns: node.turns,
      x: c.x,
      y: c.y,
      verts: node.vertices.map((v) => ({ x: v.x, y: v.y })),
      mids: node.halfways.map((h) => ({ x: h.x - c.x, y: h.y - c.y })),
      conns: new Array(node.n).fill(0),
      period: node.turns,
      spin: 0,
      neighbors: node.halfways.map((h) => {
        const other = byMid.get(key(h))?.find((m) => m.node !== ni);
        const t = other && index.get(other.node);
        return other && t !== undefined ? { tile: t, edge: other.edge } : null;
      }),
      link: null,
      linkedFrom: null,
      linkDir: 1,
      linkMirror: false,
      gear: false,
      locked: false,
      passive: false,
      flips: axis !== null,
      axis,
      mirror: axis === null ? null : mirrorEdges(node.vertices, axis),
      flip: 0,
    };
  });

  // connections: each inner edge decided once, from the lower tile id
  const setEdge = (t: PuzzleTile, e: number, v: number) => {
    t.conns[e] = v;
    const nb = t.neighbors[e]!;
    tiles[nb.tile].conns[nb.edge] = v;
  };
  for (const t of tiles)
    t.neighbors.forEach((nb, e) => {
      if (!nb || nb.tile < t.id) return;
      // big polygons have many edges: thin their connections out so they stay readable (and fair)
      const p = density * Math.min(1, 6 / Math.max(t.n, tiles[nb.tile].n));
      setEdge(t, e, rng.next() < p ? (rng.next() < doubles ? 2 : 1) : 0);
    });
  // no empty tiles: a tile with nothing on it is dead weight
  for (const t of shuffle([...tiles], rng)) {
    if (t.conns.some((v) => v)) continue;
    const inner = t.neighbors.map((nb, e) => (nb ? e : -1)).filter((e) => e >= 0);
    if (inner.length) setEdge(t, inner[Math.floor(rng.next() * inner.length)], 1);
  }
  // a triangle has room for four line ends at most: two twin edges and a single line would crowd it
  for (const t of tiles)
    if (t.n === 3)
      t.conns.forEach((v, e) => {
        if (v === 2 && t.conns.reduce((sum, x) => sum + x, 0) > 4) setEdge(t, e, 1);
      });
  for (const t of tiles) {
    t.period = period(t.conns, t.turns);
    // a flipping tile matters only when its pattern differs from its mirror image
    t.locked = t.period === 1 && !(t.flips && t.conns.some((v, e) => v !== t.conns[t.mirror![e]]));
  }

  // hints: tiles that start in place and stay there, spread out, each showing two line ends or more
  let hints = Math.round((spec.fixed ?? 0) * tiles.length);
  const hinted = new Set<number>();
  for (const t of shuffle(tiles.filter((x) => !x.locked && x.conns.filter(Boolean).length >= 2), rng)) {
    if (hints <= 0) break;
    if (t.neighbors.some((nb) => nb && hinted.has(nb.tile))) continue;
    hinted.add(t.id);
    t.locked = true;
    hints--;
  }

  // links: only between tiles of the same size, each tile sends and receives at most one,
  // and always from earlier to later in a random order, so the links never form a loop
  const order = shuffle(tiles.filter((t) => !t.locked), rng);
  const rank = new Map(order.map((t, i) => [t.id, i]));
  let budget = Math.round((spec.links ?? 0) * tiles.length);
  for (const src of order) {
    if (budget <= 0) break;
    const options = order.filter(
      (t) =>
        t.n === src.n &&
        t.turns === src.turns &&
        !t.flips &&
        t.linkedFrom === null &&
        t.link === null &&
        rank.get(t.id)! > rank.get(src.id)! &&
        Math.hypot(t.x - src.x, t.y - src.y) > 1.5,
    );
    // a held follower can never pass a link on: nothing can tap it
    if (!options.length || src.linkedFrom !== null || src.flips || src.passive) continue;
    const dst = options[Math.floor(rng.next() * options.length)];
    src.link = dst.id;
    dst.linkedFrom = src.id;
    if (rng.next() < (spec.reverse ?? 0)) src.linkDir = -1;
    if (rng.next() < (spec.passive ?? 0)) dst.passive = true;
    budget--;
  }

  // mirrors: a tap on the driver mirrors a nearby follower across the follower's mirror line that
  // points closest to the driver. The follower cannot be tapped, so the driver's taps must also leave
  // it the right way round: an odd or even count, on top of the driver's own turns.
  let mirrors = Math.round((spec.mirrors ?? 0) * tiles.length);
  for (const src of shuffle(tiles.filter((t) => !t.locked && !t.passive && t.link === null), rng)) {
    if (mirrors <= 0) break;
    // a tile made a held follower earlier in this loop can no longer drive anything
    if (src.passive || src.link !== null) continue;
    const options = tiles.flatMap((t) => {
      const d = Math.hypot(t.x - src.x, t.y - src.y);
      if (t === src || t.locked || t.passive || t.link !== null || t.linkedFrom !== null || t.id === src.linkedFrom || d < 1.2 || d > 3.2) return [];
      const toward = (Math.atan2(src.y - t.y, src.x - t.x) + Math.PI) % Math.PI;
      const gap = (a: number) => Math.min(Math.abs(a - toward), Math.PI - Math.abs(a - toward));
      const axis = [...outlineSymmetry(t.verts).axes].sort((a, b) => gap(a) - gap(b))[0];
      if (axis === undefined) return [];
      const mirror = mirrorEdges(t.verts, axis);
      return t.conns.some((v, e) => v !== t.conns[mirror[e]]) ? [{ t, axis, mirror }] : [];
    });
    if (!options.length) continue;
    const { t: dst, axis, mirror } = options[Math.floor(rng.next() * options.length)];
    src.link = dst.id;
    src.linkMirror = true;
    dst.linkedFrom = src.id;
    dst.passive = true;
    dst.axis = axis;
    dst.mirror = mirror;
    mirrors--;
  }

  const puzzle: Puzzle = { spec, seed, tiles, par: 0, undo: null, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  const free = (t: PuzzleTile) => !t.locked && !t.passive && t.link === null && t.linkedFrom === null;

  // gears: the scramble is a random set of taps from the solved board, so undoing them always solves it
  const gearCount = Math.round((spec.gears ?? 0) * tiles.length);
  if (gearCount > 0) {
    for (const t of shuffle(tiles.filter(free), rng).slice(0, gearCount)) t.gear = true;
    puzzle.undo = tiles.map((t) => {
      if (t.locked || t.passive) return 0;
      const order = moveOrder(puzzle, t.id);
      const count = Math.floor(rng.next() * order);
      for (let i = 0; i < count; i++) tap(puzzle, t.id);
      return mod(-count, order);
    });
    if (isSolved(puzzle)) {
      const t = tiles.find((x) => x.gear) ?? order[0];
      if (t) {
        // one more scramble tap, so one more tap owed
        const owed = puzzle.undo;
        puzzle.undo = null;
        tap(puzzle, t.id);
        puzzle.undo = owed;
        owed[t.id] = mod(owed[t.id] + 1, moveOrder(puzzle, t.id));
      }
    }
  } else {
    // the start is a few taps away from the solution, so the board always solves (a held follower
    // can only be where its driver's taps put it); every tile you can tap is moved at least once
    for (const t of tiles) {
      if (t.locked || t.passive) continue;
      const own = t.flips ? 2 : t.period;
      const count = 1 + Math.floor(rng.next() * (own - 1));
      for (let i = 0; i < count; i++) tap(puzzle, t.id);
    }
    if (isSolved(puzzle)) {
      // an alternative solution happened to line up: one more tap
      const t = tiles.find((x) => !x.locked && !x.passive);
      if (t) tap(puzzle, t.id);
    }
  }

  puzzle.par = solveSteps(puzzle).length;

  // centre the board
  const xs = tiles.flatMap((t) => t.verts.map((v) => v.x));
  const ys = tiles.flatMap((t) => t.verts.map((v) => v.y));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  for (const t of tiles) {
    t.x -= cx;
    t.y -= cy;
    t.verts = t.verts.map((v) => ({ x: v.x - cx, y: v.y - cy }));
  }
  puzzle.bounds = {
    minX: Math.min(...xs) - cx,
    maxX: Math.max(...xs) - cx,
    minY: Math.min(...ys) - cy,
    maxY: Math.max(...ys) - cy,
  };
  return puzzle;
}

/** Connection value on physical edge `e` of a tile in its current orientation. */
export function edgeValue(t: PuzzleTile, e: number): number {
  const j = mod(e - t.spin * (t.n / t.turns), t.n);
  return t.conns[t.flip ? t.mirror![j] : j];
}

export function isSolved(p: Puzzle): boolean {
  for (const t of p.tiles)
    for (let e = 0; e < t.n; e++) {
      const v = edgeValue(t, e);
      const nb = t.neighbors[e];
      if (!nb) {
        if (v) return false;
      } else if (v !== edgeValue(p.tiles[nb.tile], nb.edge)) return false;
    }
  return true;
}

/** One tap's effect on one tile: turned some steps, or mirrored across its line. */
type Move = [tile: number, turns: number, mirrored: boolean];

/** What one tap on tile `id` does. */
function effects(p: Puzzle, id: number): Move[] {
  const t = p.tiles[id];
  const out: Move[] = [[id, t.flips ? 0 : 1, t.flips]];
  if (t.link !== null) out.push(t.linkMirror ? [t.link, 0, true] : [t.link, t.linkDir, false]);
  if (t.gear) for (const nb of t.neighbors) if (nb && !p.tiles[nb.tile].locked) out.push([nb.tile, 1, false]);
  return out;
}

/** Mirroring a turned tile mirrors its turn too: the same picture, seen in the mirror. */
function move(t: PuzzleTile, turns: number, mirrored: boolean): void {
  if (mirrored) {
    t.spin = -t.spin;
    t.flip ^= 1;
  }
  t.spin += turns;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Taps on `id` after which the board is back where it was. */
function moveOrder(p: Puzzle, id: number): number {
  return effects(p, id).reduce((o, [t, , mirrored]) => {
    const k = mirrored ? 2 : p.tiles[t].period;
    return (o * k) / gcd(o, k);
  }, 1);
}

/** Tap a tile: it turns one step clockwise (or flips over), with its linked tile and, for a gear, its neighbours. Returns the ids that moved. */
export function tap(p: Puzzle, id: number): number[] {
  const t = p.tiles[id];
  if (t.locked || t.passive) return [];
  const fx = effects(p, id);
  for (const [i, turns, mirrored] of fx) move(p.tiles[i], turns, mirrored);
  if (p.undo) p.undo[id] = mod(p.undo[id] - 1, moveOrder(p, id));
  return fx.map(([i]) => i);
}

/**
 * Taps that solve a board without gears. Every tile is set after the tile that moves it; a tile that
 * holds a follower (one that cannot be tapped) needs a count that suits them both.
 */
function plainSteps(p: Puzzle): number[] {
  const extra = new Map<number, number>();
  const done = new Set<number>();
  const steps: number[] = [];
  const visit = (t: PuzzleTile) => {
    if (done.has(t.id)) return;
    if (t.linkedFrom !== null) visit(p.tiles[t.linkedFrom]);
    done.add(t.id);
    if (t.locked || t.passive) return;
    // [modulus, remainder] of the taps this tile needs for itself, and for a follower only it moves
    const own = t.flips ? [2, t.flip] : [t.period, mod(-(t.spin + (extra.get(t.id) ?? 0)), t.period)];
    const f = t.link !== null ? p.tiles[t.link] : null;
    const held = f?.passive ? (t.linkMirror ? [2, f.flip] : [f.period, mod(-f.spin * t.linkDir, f.period)]) : null;
    let need = own[1];
    if (held) for (let n = 0; n < own[0] * held[0]; n++) if (n % own[0] === own[1] && n % held[0] === held[1]) {
      need = n;
      break;
    }
    for (let i = 0; i < need; i++) steps.push(t.id);
    if (f && !f.passive) extra.set(f.id, (extra.get(f.id) ?? 0) + need * t.linkDir);
  };
  p.tiles.forEach(visit);
  return steps;
}

/** Taps that solve the board from where it stands: exact without gears, an upper bound with them. */
export function solveSteps(p: Puzzle): number[] {
  if (p.undo) return p.undo.flatMap((n, id) => new Array<number>(n).fill(id));
  return plainSteps(p);
}

/** Where a board starts, so Restart can bring it back without building it again. */
export interface Start {
  spins: number[];
  flips: number[];
  undo: number[] | null;
}

export function startOf(p: Puzzle): Start {
  return { spins: p.tiles.map((t) => t.spin), flips: p.tiles.map((t) => t.flip), undo: p.undo && [...p.undo] };
}

/** Put every tile back where it started, each by the shortest way round. */
export function restart(p: Puzzle, s: Start): void {
  for (const t of p.tiles) {
    const back = t.flip !== s.flips[t.id];
    t.flip = s.flips[t.id];
    t.spin = back ? s.spins[t.id] : s.spins[t.id] + t.turns * Math.round((t.spin - s.spins[t.id]) / t.turns);
  }
  p.undo = s.undo && [...s.undo];
}

/** 3 stars at par, 2 within half again, 1 for any solve. */
export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5)) return 2;
  return 1;
}
