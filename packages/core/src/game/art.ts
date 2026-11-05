import type { Pt, Puzzle, PuzzleTile } from './puzzle';

/** Line drawing of one tile in its solved orientation, centred on the tile (edge length 1). */
export interface TileArt {
  /** SVG path data, all stroked with the same pen. */
  paths: string[];
  /** End rings, stroked; on tiles too small for a ring to stay open, a filled dot of radius `r`. */
  rings: (Pt & { r: number; dot?: boolean })[];
  /** No drawing kept its lines apart, so the plain loop was used (a sign the tile has too many ends). */
  crowded?: boolean;
}

export const ART = {
  stroke: 0.13,
  ringRadius: 0.15,
  /** A twin edge carries two lines, at 1/3 and 2/3 of its length. */
  twinOffset: 1 / 6,
};

const f = (n: number) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(4));
const add = (a: Pt, b: Pt, s = 1): Pt => ({ x: a.x + b.x * s, y: a.y + b.y * s });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => ({ x: a.x / len(a), y: a.y / len(a) });
const left = (a: Pt): Pt => ({ x: -a.y, y: a.x });

/** Where a line meets the tile's edge, and which way is straight in from there. */
interface Port extends Pt {
  edge: number;
  inward: Pt;
  angle: number;
}

/** A curve from p to q that leaves each edge straight inwards, as a circular arc where it can be. */
function join(p: Port, q: Port): Pt[] {
  // a semicircle when both face the same way (a twin edge), a straight line when they face each other
  const facing = Math.acos(Math.max(-1, Math.min(1, p.inward.x * q.inward.x + p.inward.y * q.inward.y)));
  const arc = Math.PI - facing;
  const chord = len({ x: p.x - q.x, y: p.y - q.y });
  const h = arc < 1e-6 ? chord / 3 : (chord * (4 / 3) * Math.tan(arc / 4)) / (2 * Math.sin(arc / 2));
  return [p, add(p, p.inward, h), add(q, q.inward, h), q];
}

const curve = ([a, b, c, d]: Pt[]) => `M${f(a.x)} ${f(a.y)}C${f(b.x)} ${f(b.y)} ${f(c.x)} ${f(c.y)} ${f(d.x)} ${f(d.y)}`;

/** Points along a cubic, for clearance checks. */
function samples([a, b, c, d]: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    out.push({ x: k[0] * a.x + k[1] * b.x + k[2] * c.x + k[3] * d.x, y: k[0] * a.y + k[1] * b.y + k[2] * c.y + k[3] * d.y });
  }
  return out;
}

/**
 * The tile's lines. `variant` picks one of the drawings a tile with twin edges allows, so one board
 * mixes them; the same tile id always gets the same drawing.
 */
/**
 * Line width for a whole board: the standard width, thinner when the board has small tiles (a split
 * board). One width per board, so lines still meet cleanly between tiles of different sizes.
 */
export function strokeFor(p: Puzzle): number {
  const inner = Math.min(...p.tiles.map((t) => len(t.mids[0])));
  return ART.stroke * Math.min(1, Math.max(0.55, (inner / 0.29) ** 2));
}

export function tileArt(
  tile: Pick<PuzzleTile, 'mids' | 'conns'> & Partial<Pick<PuzzleTile, 'id' | 'verts' | 'x' | 'y'>>,
  stroke = ART.stroke,
): TileArt {
  const art: TileArt = { paths: [], rings: [] };
  const n = tile.conns.length;
  // lines leave an edge square to it, so they run on straight into the next tile (on a star the
  // edge does not face the centre); without an outline, towards the centre
  const inwardOf = (edge: number): Pt => {
    const m = tile.mids[edge];
    const toCentre = unit({ x: -m.x, y: -m.y });
    if (!tile.verts || tile.x === undefined || tile.y === undefined) return toCentre;
    const a = tile.verts[edge];
    const b = tile.verts[(edge + 1) % n];
    const normal = unit(left({ x: b.x - a.x, y: b.y - a.y }));
    return normal.x * toCentre.x + normal.y * toCentre.y >= 0 ? normal : { x: -normal.x, y: -normal.y };
  };
  const ports: Port[] = [];
  tile.conns.forEach((v, edge) => {
    if (!v) return;
    const m = tile.mids[edge];
    const inward = inwardOf(edge);
    const along = left(inward);
    for (const o of v === 2 ? [ART.twinOffset, -ART.twinOffset] : [0]) {
      const p = add(m, along, o);
      ports.push({ ...p, edge, inward, angle: Math.atan2(p.y, p.x) });
    }
  });
  if (!ports.length) return art;
  ports.sort((a, b) => a.angle - b.angle);
  const k = ports.length;
  // small tiles get a smaller ring, so it never fills the tile; when its hole would close up
  // (under about half a line's width), it is a dot
  const r = Math.min(ART.ringRadius, len(tile.mids[0]) * 0.4);
  const ring = (): TileArt['rings'][number] => (r < stroke * 0.95 ? { x: 0, y: 0, r: stroke * 0.95, dot: true } : { x: 0, y: 0, r });
  // a stub leaves square to its edge and meets the ring head-on (a straight line on regular tiles)
  const stub = (p: Port): Pt[] => {
    const end = add({ x: 0, y: 0 }, unit(p), r);
    const h = (len(p) - r) / 2;
    return [p, add(p, p.inward, h), add(end, unit(p), h), end];
  };
  // curve i joins port i to the next one round the tile
  const curves = ports.map((p, i) => join(p, ports[(i + 1) % k]));

  // one line: a straight stub from the edge, ending in a ring at the centre
  if (k === 1) {
    art.paths.push(curve(stub(ports[0])));
    art.rings.push(ring());
    return art;
  }

  // On a plain tile, small or large, every port is joined to the next one round the tile: three ends
  // make a curved triangle, four a star, six a flower. Twin edges and the whole tiles of a split board
  // carry two ends on a side, and would turn that into a knot, so there each port takes one curve.
  const twins = tile.conns.some((v) => v === 2);
  // a split tile's whole sides carry two ends each: its edges come in pairs facing the same way
  const normals = tile.conns.map((_, e) => inwardOf(e));
  const paired = normals.some((u, i) => normals.some((w, j) => j > i && u.x * w.x + u.y * w.y > 0.999));
  const lean = twins || paired;
  // on a split tile, two ends on the same side join in a shallow arc (a semicircle would reach a
  // quarter of the way in and crowd the centre)
  if (paired && !twins)
    ports.forEach((p, i) => {
      const q = ports[(i + 1) % k];
      if (p.inward.x * q.inward.x + p.inward.y * q.inward.y < 0.999) return;
      const h = len({ x: p.x - q.x, y: p.y - q.y }) * 0.4;
      curves[i] = [p, add(p, p.inward, h), add(q, q.inward, h), q];
    });
  if (!lean || k === 2) {
    for (const c of k === 2 ? curves.slice(0, 1) : curves) art.paths.push(curve(c));
    return art;
  }

  // Each port takes one curve, to a neighbour round the tile. An even count pairs up in two ways.
  // An odd count leaves one port over: it shares its twin's curve, runs to a ring at the centre, or
  // ends in a short line with a dot. Of the drawings this allows, a tile only uses ones whose separate
  // lines keep at least a line's width of space between them.
  const semi = (i: number) => ports[i].edge === ports[(i + 1) % k].edge;
  const every = (from: number, count: number) => Array.from({ length: count }, (_, j) => (from + 2 * j) % k);
  type Piece = { path: Pt[]; ring?: TileArt['rings'][number] };
  const variants: { pieces: Piece[]; joints: Pt[]; length?: number; dot?: boolean }[] = [];
  const pieces = (use: number[]) => use.map((j) => ({ path: curves[j] }));
  const portsAt = ports.map((p) => ({ x: p.x, y: p.y }));
  const chord = (c: Pt[]) => len({ x: c[0].x - c[3].x, y: c[0].y - c[3].y });
  const total = (use: number[]) => use.reduce((sum, j) => sum + chord(curves[j]), 0);
  if (k % 2 === 0)
    for (const from of [0, 1]) variants.push({ pieces: pieces(every(from, k / 2)), joints: portsAt, length: total(every(from, k / 2)) });
  else
    for (let i = 0; i < k; i++) {
      // a twin pair takes the extra curve: one of its ports keeps the semicircle and one more curve.
      // Of the two ways, keep the one whose other curve is longer, so it wraps round the semicircle.
      if (twins && semi(i)) {
        const after = every(i + 1, (k - 1) / 2); // port i+1 also takes curve i+1
        const before = every(i + 2, (k - 1) / 2); // port i also takes curve i-1
        const longer = chord(curves[(i + 1) % k]) >= chord(curves[(i - 1 + k) % k]) ? after : before;
        variants.push({ pieces: pieces([...longer, i]), joints: portsAt });
      }
      const p = ports[i];
      const rest = every(i + 1, (k - 1) / 2);
      // a single line left over runs to a ring at the centre...
      if (tile.conns[p.edge] === 1) {
        const toCentre = stub(p);
        const c = ring();
        const meet = toCentre[3];
        variants.push({ pieces: [...pieces(rest), { path: toCentre }, { path: [meet, meet, meet, meet], ring: c }], joints: [...portsAt, meet], length: total(rest) });
      }
      // ...or any line left over (a twin's too) stops short, in a dot
      for (const reach of [0.55, 0.4]) {
        const end = add(p, p.inward, len(p) * reach);
        const dot = { x: end.x, y: end.y, r: stroke * 0.95, dot: true };
        variants.push({ pieces: [...pieces(rest), { path: [p, p, end, end] }, { path: [end, end, end, end], ring: dot }], joints: [...portsAt, end], length: total(rest), dot: true });
      }
    }

  // The narrowest gap between two separate lines of a drawing, as the space left between their edges.
  // Two pieces may come close only round a point where both of them end (a twin's shared port, a stub
  // meeting its ring); anywhere else they need a line's width of clear space.
  const same = (a: Pt, b: Pt) => len({ x: a.x - b.x, y: a.y - b.y }) < 1e-6;
  const gap = (v: (typeof variants)[number]) => {
    const pts = v.pieces.map((q) => {
      if (!q.ring) return samples(q.path).map((s) => ({ ...s, pad: stroke / 2 }));
      const g = q.ring;
      if (g.dot) return [{ x: g.x, y: g.y, pad: g.r }];
      return Array.from({ length: 24 }, (_, j) => ({ x: g.x + g.r * Math.cos(j / 3.82), y: g.y + g.r * Math.sin(j / 3.82), pad: stroke / 2 }));
    });
    const ends = v.pieces.map((q) => v.joints.filter((j) => same(q.path[0], j) || same(q.path[3], j)));
    const near = (s: Pt, j: Pt) => len({ x: s.x - j.x, y: s.y - j.y }) < stroke * 2.5;
    let least = Infinity;
    for (let a = 0; a < pts.length; a++)
      for (let b = a + 1; b < pts.length; b++) {
        const shared = ends[a].filter((j) => ends[b].some((o) => same(o, j)));
        for (const s of pts[a])
          for (const t of pts[b]) {
            if (shared.some((j) => near(s, j) && near(t, j))) continue;
            least = Math.min(least, len({ x: s.x - t.x, y: s.y - t.y }) - s.pad - t.pad);
          }
      }
    return least;
  };
  const roomy = variants.filter((v) => gap(v) >= stroke);
  // whole tiles of a split board join their closest ends, and send an odd one to a ring at the centre
  // (a dot only where no ring fits); twin tiles vary from tile to tile
  const pick = twins
    ? roomy[(tile.id ?? 0) % roomy.length]
    : roomy.sort((a, b) => Number(!!a.dot) - Number(!!b.dot) || (a.length ?? 0) - (b.length ?? 0))[0];
  if (!pick) {
    // nothing leaves room: fall back to the plain loop, whose lines only ever meet at their ends
    for (const c of curves) art.paths.push(curve(c));
    art.crowded = true;
    return art;
  }
  for (const q of pick.pieces) {
    if (q.ring) art.rings.push(q.ring);
    else art.paths.push(curve(q.path));
  }
  return art;
}

/** Points of a tile outline as an SVG `points` string, relative to a centre. */
export function outlinePoints(tile: Pick<PuzzleTile, 'verts' | 'x' | 'y'>, inset = 0): string {
  return tile.verts
    .map((v) => {
      const d = { x: v.x - tile.x, y: v.y - tile.y };
      const k = 1 - inset / len(d);
      return `${f(d.x * k)},${f(d.y * k)}`;
    })
    .join(' ');
}

/**
 * Which spot ink each tile is printed in. Boards with several shapes give each shape its
 * own ink; a board of one shape is coloured like a map, so no two neighbours share an ink.
 */
export function inkIndex(p: Puzzle, inks: number): number[] {
  const sizes = [...new Set(p.tiles.map((t) => t.n))].sort((a, b) => a - b);
  if (sizes.length > 1) return p.tiles.map((t) => sizes.indexOf(t.n) % inks);
  const out = new Array<number>(p.tiles.length).fill(-1);
  for (const t of p.tiles) {
    const taken = new Set(t.neighbors.map((nb) => (nb ? out[nb.tile] : -1)));
    let k = (t.id * 7) % inks;
    for (let i = 0; i < inks && taken.has(k); i++) k = (k + 1) % inks;
    out[t.id] = k;
  }
  return out;
}
