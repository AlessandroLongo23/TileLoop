import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, PixelRatio, type GestureResponderEvent } from 'react-native';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Polygon, Path, Circle, G, Line } from 'react-native-svg';
import { tileArt, strokeFor, outlinePoints, inkIndex, type Puzzle, type PuzzleTile, type Palette } from '@tileloop/core';
import { alpha } from '../theme';

const PAD = 0.1;
const PAIR = ['#E4572E', '#2E86AB', '#7A4EAB', '#2A9D8F', '#C9184A', '#F2A541'];
// farthest corner from the centre, so stars and stretched tiles get a box that holds them
const radius = (t: PuzzleTile) => Math.max(...t.verts.map((v) => Math.hypot(v.x - t.x, v.y - t.y)));
// Motion settles without overshoot: a tile that swung past its mark would overlap its neighbours.
const EASE = Easing.out(Easing.cubic);
// a quarter turn spreads over ~15 frames at 60 Hz and eases to a stop
const TURN = { duration: 240, easing: Easing.bezier(0.2, 0.7, 0.3, 1) };
// a flip folds the tile over its mirror line, like a card turned face down and up again
const FLIP = { duration: 300, easing: Easing.inOut(Easing.cubic) };
const back = (ms = 180) => withTiming(1, { duration: ms, easing: EASE });
// on web, keep the spinning art on its own layer so the browser turns it instead of redrawing the SVG
const LAYER = Platform.OS === 'web' ? ({ willChange: 'transform' } as object) : {};

export function boardScale(p: Puzzle, width: number, height: number, max = 150): number {
  const bw = p.bounds.maxX - p.bounds.minX + PAD * 2;
  const bh = p.bounds.maxY - p.bounds.minY + PAD * 2;
  return Math.min(width / bw, height / bh, max);
}

/** How far a line from the tile's centre at `angle` radians runs before it leaves the tile. */
function reach(t: PuzzleTile, angle: number): number {
  const u = { x: Math.cos(angle), y: Math.sin(angle) };
  let best = Infinity;
  t.verts.forEach((a, i) => {
    const b = t.verts[(i + 1) % t.verts.length];
    const p = { x: a.x - t.x, y: a.y - t.y };
    const e = { x: b.x - a.x, y: b.y - a.y };
    const den = u.x * e.y - u.y * e.x;
    if (Math.abs(den) < 1e-9) return;
    const d = (p.x * e.y - p.y * e.x) / den;
    const k = (p.x * u.y - p.y * u.x) / den;
    if (d > 0 && k >= 0 && k <= 1) best = Math.min(best, d);
  });
  return Number.isFinite(best) ? best : 0;
}

/** Mirror across the line at `axis` radians through the tile's centre, as an SVG matrix. */
const mirrorAcross = (axis: number) => `matrix(${Math.cos(2 * axis)} ${Math.sin(2 * axis)} ${Math.sin(2 * axis)} ${-Math.cos(2 * axis)} 0 0)`;

/** A tile's lines, turned by `angle` degrees (and mirrored when `flip`) inside the drawing itself, about the tile's centre. */
function Lines({ tile, color, size, vb, stroke, angle = 0, flip = 0 }: { tile: PuzzleTile; color: string; size: number; vb: string; stroke: number; angle?: number; flip?: number }) {
  const art = useMemo(() => tileArt(tile, stroke), [tile, stroke]);
  const mirrored = flip && tile.axis !== null ? ` ${mirrorAcross(tile.axis)}` : '';
  return (
    <Svg width={size} height={size} viewBox={vb}>
      <G stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" transform={`rotate(${angle})${mirrored}`}>
        {art.paths.map((d, i) => (
          <Path key={i} d={d} />
        ))}
        {art.rings.map((r, i) => (
          <Circle key={i} cx={r.x} cy={r.y} r={r.r} fill={r.dot ? color : 'none'} stroke={r.dot ? 'none' : color} />
        ))}
      </G>
    </Svg>
  );
}

interface TileProps {
  /** Fills sit under every line on the board, so a tile's colour never covers its neighbour's strokes. */
  part: 'fills' | 'lines';
  /** Line width for the whole board. */
  stroke: number;
  tile: PuzzleTile;
  spin: number;
  flip: number;
  scale: number;
  ox: number;
  oy: number;
  palette: Palette;
  fill: string;
  /** Milliseconds since the board was solved (0 while playing), and where the colour ripple starts. */
  bloomClock: SharedValue<number>;
  bloomFrom: SharedValue<{ x: number; y: number; max: number }>;
  introDelay: number | null;
  /** A linked tile: the driver carries a solid dot, the follower a ring in the same colour. */
  link?: { color: string; driver: boolean; reverse: boolean; mirror: boolean };
  bump: number;
  /** Restart count, and how long this tile waits before turning back (a ripple from the centre). */
  rewind: number;
  rewindDelay: number;
  /** Bumped when this tile's driver turns it: the turn follows a beat later, with a ripple. */
  echo: number;
}

const TileView = memo(function TileView({ part, stroke, tile, spin, flip, scale, ox, oy, palette, fill, bloomClock, bloomFrom, introDelay, link, bump, echo, rewind, rewindDelay }: TileProps) {
  // The box sits on whole device pixels (the platform would round it anyway, moving the drawing),
  // the drawing is placed inside it at the tile's exact position, and turns round the tile's exact
  // centre: so the lines of neighbouring tiles meet to the pixel in every orientation.
  const R = useMemo(() => radius(tile), [tile]) + PAD;
  const pr = PixelRatio.get();
  const snap = (v: number) => Math.round(v * pr) / pr;
  const cx = ox + tile.x * scale;
  const cy = oy + tile.y * scale;
  const left = snap(cx - R * scale);
  const top = snap(cy - R * scale);
  const size = snap(R * 2 * scale) + 1 / pr;
  const vb = `${(left - cx) / scale} ${(top - cy) / scale} ${size / scale} ${size / scale}`;
  // The platform turns and scales a view about its box centre. Moving to the tile's exact centre
  // first and back afterwards makes that the tile's centre, with plain transforms that work everywhere.
  const dx = cx - (left + size / 2);
  const dy = cy - (top + size / 2);
  const cell = useMemo(() => outlinePoints(tile, 0), [tile]);

  const rot = useSharedValue((spin * 360) / tile.turns);
  const press = useSharedValue(1);
  const glow = useSharedValue(0);
  const enter = useSharedValue(introDelay === null ? 1 : 0);
  const nudge = useSharedValue(0);
  const ping = useSharedValue(0);
  const fold = useSharedValue(1);

  // A tile at rest draws its lines already turned, with no view rotation: a rotated view is resampled
  // and lands up to a device pixel off its neighbours. Only while it turns does a rotating copy stand
  // in; `still` catches up when the turn ends. Both are chosen in the same render, so nothing flashes.
  const [still, setStill] = useState(spin);
  const turning = spin !== still;
  // A flip works the same way: the old picture folds over the mirror line until it shows its mirror
  // image, which is the new picture, and the resting drawing takes over.
  const [stillFlip, setStillFlip] = useState(flip);
  const flipping = flip !== stillFlip;
  // a new target retimes from wherever the tile is, so fast taps flow into one turn
  const rewound = useRef(rewind);
  useEffect(() => {
    const to = (spin * 360) / tile.turns;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(setStill)(spin);
    };
    if (rewound.current !== rewind) {
      rewound.current = rewind;
      rot.value = withDelay(rewindDelay, withTiming(to, TURN, done));
      press.value = withDelay(rewindDelay, withSequence(withTiming(0.95, { duration: 70 }), back()));
      return;
    }
    rot.value = echo ? withDelay(90, withTiming(to, TURN, done)) : withTiming(to, TURN, done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, tile.turns, rot, rewind]);

  const flipRewound = useRef(rewind);
  useEffect(() => {
    const isRewind = flipRewound.current !== rewind;
    flipRewound.current = rewind;
    // flipped back before the fold ended: setting the value stops it, and the resting drawing is right
    if (flip === stillFlip) {
      fold.value = 1;
      return;
    }
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(setStillFlip)(flip);
    };
    fold.value = 1;
    fold.value = withDelay(isRewind ? rewindDelay : echo ? 90 : 0, withTiming(-1, FLIP, done));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip, rewind]);

  useEffect(() => {
    if (!echo) return;
    ping.value = 0;
    ping.value = withDelay(60, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [echo, ping]);

  useEffect(() => {
    if (!bump) return;
    if (tile.locked || tile.passive) {
      nudge.value = withSequence(withTiming(-4, { duration: 40 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 40 }));
      return;
    }
    press.value = withSequence(withTiming(0.96, { duration: 55 }), back());
    glow.value = withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 260 }));
  }, [bump, tile.locked, press, glow, nudge]);

  useEffect(() => {
    if (introDelay === null) return;
    enter.value = 0;
    // a board laid out ahead stays unseen (-1) until it is shown
    if (introDelay < 0) return;
    enter.value = withDelay(introDelay, back(380));
  }, [introDelay, enter]);

  const wrap = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.5),
    transform: [{ translateX: nudge.value + dx }, { translateY: dy }, { scale: press.value * (0.5 + 0.5 * enter.value) }, { translateX: -dx }, { translateY: -dy }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${rot.value}deg` }, { translateX: -dx }, { translateY: -dy }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  // the colour ripple runs on the animation thread from one clock, so solving re-renders no tile
  const tx = tile.x;
  const ty = tile.y;
  // How far the ripple has coloured this tile, eased from 0 to 1. The styles read the shared values
  // themselves: a style only follows the values it reads directly, not ones read inside a helper.
  const bloomed = (clock: number, o: { x: number; y: number; max: number }) => {
    'worklet';
    const wait = (Math.hypot(tx - o.x, ty - o.y) / o.max) * 480;
    const k = Math.min(1, Math.max(0, (clock - wait) / 380));
    return 1 - (1 - k) ** 3;
  };
  const bloomStyle = useAnimatedStyle(() => {
    const b = bloomed(bloomClock.value, bloomFrom.value);
    return { opacity: Math.min(1, b * 1.6), transform: [{ translateX: dx }, { translateY: dy }, { scale: 0.6 + 0.4 * b }, { translateX: -dx }, { translateY: -dy }] };
  });
  // a coloured tile shows only its pattern: the link marks leave as the colour comes in
  const markStyle = useAnimatedStyle(() => ({ opacity: 1 - bloomed(bloomClock.value, bloomFrom.value) }));
  const axisDeg = ((tile.axis ?? 0) * 180) / Math.PI;
  const foldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${axisDeg}deg` }, { scaleY: fold.value }, { rotate: `${-axisDeg}deg` }, { translateX: -dx }, { translateY: -dy }],
  }));
  const pingStyle = useAnimatedStyle(() => ({ opacity: ping.value > 0 && ping.value < 1 ? 1 - ping.value : 0, transform: [{ scale: 1 + ping.value * 1.6 }] }));
  const layer = { position: 'absolute' as const, width: size, height: size };
  const dot = Math.max(11, scale * 0.17);

  const box = { position: 'absolute' as const, left, top, width: size, height: size };

  if (part === 'fills')
    return (
      <Animated.View pointerEvents="none" style={[box, wrap]}>
        <Svg width={size} height={size} viewBox={vb} style={StyleSheet.absoluteFill}>
          {/* shaded: nothing to do by hand here (in place already, or moved only by its partner) */}
          <Polygon points={cell} fill={alpha(palette.line, tile.locked || tile.passive ? 0.11 : 0.035)} stroke={alpha(palette.line, 0.07)} strokeWidth={0.012} />
          {tile.gear && (
            <Polygon points={outlinePoints(tile, 0.07)} fill="none" stroke={alpha(palette.line, 0.4)} strokeWidth={0.05} strokeDasharray="0.06 0.06" />
          )}
          {link?.mirror && !link.driver && tile.axis !== null && (
            <Line
              x1={-Math.cos(tile.axis) * reach(tile, tile.axis + Math.PI) * 0.86}
              y1={-Math.sin(tile.axis) * reach(tile, tile.axis + Math.PI) * 0.86}
              x2={Math.cos(tile.axis) * reach(tile, tile.axis) * 0.86}
              y2={Math.sin(tile.axis) * reach(tile, tile.axis) * 0.86}
              stroke={alpha(link.color, 0.75)}
              strokeWidth={0.04}
              strokeDasharray="0.09 0.07"
              strokeLinecap="round"
            />
          )}
        </Svg>
        <Animated.View style={[layer, bloomStyle]}>
          <Svg width={size} height={size} viewBox={vb}>
            <Polygon points={cell} fill={fill} stroke={fill} strokeWidth={0.006} />
          </Svg>
        </Animated.View>
        <Animated.View style={[layer, glowStyle]}>
          <Svg width={size} height={size} viewBox={vb}>
            <Polygon points={cell} fill={alpha(palette.line, 0.1)} />
          </Svg>
        </Animated.View>
      </Animated.View>
    );

  return (
    <Animated.View pointerEvents="none" style={[box, wrap]}>
      <View style={layer}>
        <View style={[layer, { opacity: turning || flipping ? 0 : 1 }]}>
          <Lines tile={tile} color={palette.line} size={size} vb={vb} stroke={stroke} angle={(still * 360) / tile.turns} flip={stillFlip} />
        </View>
        {turning && !flipping && (
          <Animated.View style={[layer, LAYER, spinStyle]}>
            <Lines tile={tile} color={palette.line} size={size} vb={vb} stroke={stroke} flip={stillFlip} />
          </Animated.View>
        )}
        {flipping && (
          <Animated.View style={[layer, LAYER, foldStyle]}>
            <Lines tile={tile} color={palette.line} size={size} vb={vb} stroke={stroke} angle={(still * 360) / tile.turns} flip={stillFlip} />
          </Animated.View>
        )}
      </View>
      {link && (
        <Animated.View style={[{ position: 'absolute', left: cx - left - dot, top: cy - top - dot, width: dot * 2, height: dot * 2, alignItems: 'center', justifyContent: 'center' }, markStyle]}>
          {!link.driver && (
            <Animated.View style={[{ position: 'absolute', width: dot, height: dot, borderRadius: dot, borderWidth: 2, borderColor: link.color }, pingStyle]} />
          )}
          <View
            style={
              link.driver
                ? { width: dot * 1.15, height: dot * 1.15, borderRadius: dot, backgroundColor: link.color, borderWidth: 2, borderColor: palette.bg }
                : { width: dot, height: dot, borderRadius: dot, borderWidth: dot * 0.28, borderColor: link.color, backgroundColor: palette.bg, borderStyle: link.reverse ? 'dashed' : 'solid' }
            }
          />
        </Animated.View>
      )}
    </Animated.View>
  );
});

export interface BoardProps {
  puzzle: Puzzle;
  palette: Palette;
  width: number;
  height: number;
  version: number;
  onTap?: (id: number) => void;
  /** Tile the solve bloom starts from; null while playing. */
  solvedFrom?: number | null;
  introKey?: string | number;
  bump?: { tile: number; n: number };
  /** Bumped on Restart: tiles turn back to their start in a quick ripple from the centre. */
  rewind?: number;
  /** Laid out ahead and unseen; the tiles come in when it turns false. */
  waiting?: boolean;
  /** Milliseconds before the first tile comes in. */
  lead?: number;
}

export default function Board({ puzzle, palette, width, height, version, onTap, solvedFrom = null, introKey, bump, rewind = 0, waiting = false, lead = 170 }: BoardProps) {
  const s = boardScale(puzzle, width, height);
  const ox = width / 2;
  const oy = height / 2;
  const fills = useMemo(() => inkIndex(puzzle, palette.fills.length), [puzzle, palette]);
  const stroke = useMemo(() => strokeFor(puzzle), [puzzle]);
  const links = useMemo(() => {
    const m = new Map<number, { color: string; driver: boolean; reverse: boolean; mirror: boolean }>();
    let i = 0;
    for (const t of puzzle.tiles)
      if (t.link !== null) {
        const color = PAIR[i++ % PAIR.length];
        const reverse = t.linkDir === -1;
        m.set(t.id, { color, driver: true, reverse, mirror: t.linkMirror });
        m.set(t.link, { color, driver: false, reverse, mirror: t.linkMirror });
      }
    return m;
  }, [puzzle]);
  // tiles the last tap dragged along: a linked follower, a gear's neighbours
  const dragged = useMemo(() => {
    const t = bump && bump.tile >= 0 ? puzzle.tiles[bump.tile] : null;
    if (!t || t.locked) return new Set<number>();
    const ids = t.gear ? t.neighbors.flatMap((nb) => (nb ? [nb.tile] : [])) : [];
    if (t.link !== null) ids.push(t.link);
    return new Set(ids);
  }, [bump, puzzle]);

  const bloomClock = useSharedValue(0);
  const bloomFrom = useSharedValue({ x: 0, y: 0, max: 1 });
  useEffect(() => {
    if (solvedFrom === null) {
      bloomClock.value = withTiming(0, { duration: 160 });
      return;
    }
    const o = puzzle.tiles[solvedFrom] ?? puzzle.tiles[0];
    bloomFrom.value = { x: o.x, y: o.y, max: Math.max(1, ...puzzle.tiles.map((t) => Math.hypot(t.x - o.x, t.y - o.y))) };
    bloomClock.value = 0;
    bloomClock.value = withTiming(900, { duration: 900, easing: Easing.linear });
  }, [solvedFrom, puzzle, bloomClock, bloomFrom]);

  const intro = useMemo(() => {
    const d = puzzle.tiles.map((t) => Math.hypot(t.x, t.y));
    const max = Math.max(...d, 1);
    return d.map((x) => lead + (x / max) * 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, introKey]);

  const rewindAt = useMemo(() => {
    const d = puzzle.tiles.map((t) => Math.hypot(t.x, t.y));
    const max = Math.max(...d, 1);
    return d.map((x) => (x / max) * 220);
  }, [puzzle]);

  function grant(e: GestureResponderEvent) {
    if (!onTap) return;
    const x = (e.nativeEvent.locationX - ox) / s;
    const y = (e.nativeEvent.locationY - oy) / s;
    const hit = puzzle.tiles.find((t) => inside(t, x, y));
    if (hit) onTap(hit.id);
  }

  return (
    <View style={{ width, height }} onStartShouldSetResponder={() => !!onTap} onResponderGrant={grant} testID="board">
      {(['fills', 'lines'] as const).flatMap((part) =>
        puzzle.tiles.map((t) => (
          <TileView
            key={`${part}${t.id}`}
            part={part}
            stroke={stroke}
            tile={t}
            spin={t.spin}
            flip={t.flip}
            scale={s}
            ox={ox}
            oy={oy}
            palette={palette}
            fill={palette.fills[fills[t.id]]}
            bloomClock={bloomClock}
            bloomFrom={bloomFrom}
            introDelay={introKey === undefined ? null : waiting ? -1 : intro[t.id]}
            link={links.get(t.id)}
            bump={bump && bump.tile === t.id ? bump.n : 0}
            echo={dragged.has(t.id) ? bump!.n : 0}
            rewind={rewind}
            rewindDelay={rewindAt[t.id]}
          />
        )),
      )}
      <View testID={`board-v${version}`} style={{ display: 'none' }} />
    </View>
  );
}

function inside(t: PuzzleTile, x: number, y: number): boolean {
  let hit = false;
  const v = t.verts;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if (v[i].y > y !== v[j].y > y && x < ((v[j].x - v[i].x) * (y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) hit = !hit;
  }
  return hit;
}

/** A whole solved board in one static SVG, for backgrounds and thumbnails. */
export function BoardPicture({
  puzzle,
  palette,
  width,
  height,
  lines = true,
  maxScale = 400,
  cover = false,
}: {
  puzzle: Puzzle;
  palette: Palette;
  width: number;
  height: number;
  lines?: boolean;
  /** Largest size of one tile edge, in pixels. */
  maxScale?: number;
  /** Fill the whole box, cropping the board, instead of fitting all of it inside. */
  cover?: boolean;
}) {
  const b = puzzle.bounds;
  const s = cover ? Math.max(width / (b.maxX - b.minX), height / (b.maxY - b.minY)) : boardScale(puzzle, width, height, maxScale);
  const fills = inkIndex(puzzle, palette.fills.length);
  const stroke = strokeFor(puzzle);
  return (
    <Svg width={width} height={height} viewBox={`${-width / 2 / s} ${-height / 2 / s} ${width / s} ${height / s}`}>
      {puzzle.tiles.map((t) => {
        const art = lines ? tileArt(t, stroke) : null;
        const fill = palette.fills[fills[t.id]];
        return (
          <G key={t.id} transform={`translate(${t.x} ${t.y})`}>
            <Polygon points={outlinePoints(t, 0)} fill={fill} stroke={fill} strokeWidth={0.006} />
            {art && (
              <G stroke={palette.line} strokeWidth={stroke} strokeLinecap="round" fill="none">
                {art.paths.map((d, i) => (
                  <Path key={i} d={d} />
                ))}
                {art.rings.map((r, i) => (
                  <Circle key={i} cx={r.x} cy={r.y} r={r.r} fill={r.dot ? palette.line : 'none'} stroke={r.dot ? 'none' : palette.line} />
                ))}
              </G>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
