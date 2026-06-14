import type { Polygon } from '../tiling/Polygon';

/** Derived per-tile style values (formerly computed inline in Tile.svelte). */
export interface TileStyle {
  scalePolygon: number;
  lineStrokeWidth: number;
  borderStrokeWidth: number;
  effectStrokeWidth: number;
  /** Base rotation in radians. */
  startRotation: number;
  /** CSS transform string (rotation + the tile's accumulated svgTransform). */
  transforms: string;
}

/** Rotational offset that aligns the source SVG art for n-gons. */
function calculateOffset(n: number): number {
  if (n === 3) return -Math.PI / 6;
  if (n === 4) return Math.PI / 4;
  if (n === 6) return -Math.PI / 2 - Math.PI / 6;
  return 0;
}

function calculateStartRotation(node: Polygon): number {
  let r = calculateOffset(node.n);
  r += node.angle;
  const svgTurns = node.svgTurns ?? 0;
  if (node.mirrored) {
    let mirrorTurns = 0;
    if (node.n === 3) mirrorTurns = 2;
    else if (node.n === 4) mirrorTurns = 1;
    else if (node.n === 6) mirrorTurns = 1;
    r -= (svgTurns - mirrorTurns) * ((2 * Math.PI) / node.n);
  } else {
    r += svgTurns * ((2 * Math.PI) / node.n);
  }
  return r;
}

/** Compute the style values needed to render a tile node. */
export function tileStyleParams(node: Polygon): TileStyle {
  const scalePolygon = 2 / (2 * Math.sin(Math.PI / node.n));
  const lineStrokeWidth = 32 / scalePolygon;
  const borderStrokeWidth = 2 / scalePolygon;
  const effectStrokeWidth = (node.effects?.length ?? 0) > 0 ? 3 : 0;
  const startRotation = calculateStartRotation(node);
  const transforms = `rotate(${(startRotation * 180) / Math.PI}deg) ${node.svgTransform}`;

  return {
    scalePolygon,
    lineStrokeWidth,
    borderStrokeWidth,
    effectStrokeWidth,
    startRotation,
    transforms,
  };
}

export interface PrepareTileSvgOptions {
  tileset: string;
  nodeId: string;
  scale: number;
  scalePolygon: number;
}

/**
 * Normalize a raw tileset SVG: rewrite its viewBox/size, namespace its element
 * ids per tile (so multiple tiles don't collide on shared gradient/mask ids),
 * and strip filters. Mirrors the string munging that lived in Tile.svelte.
 */
export function prepareTileSvg(raw: string, opts: PrepareTileSvgOptions): string {
  const size = opts.scale * opts.scalePolygon + 1;
  const ns = `${opts.tileset}_${opts.nodeId}`;

  let content = raw.replace(
    /viewBox="0 0 600 600"[^>]*width="600"[^>]*height="600"/g,
    `viewBox="0 0 600 600" width="${size}px" height="${size}px"`,
  );

  content = content
    .replace('id="pathMask"', `id="pathMask_${ns}"`)
    .replace('url(#pathMask)', `url(#pathMask_${ns})`)
    .replace('id="redGradient"', `id="redGradient_${ns}"`)
    .replace('url(#redGradient)', `url(#redGradient_${ns})`)
    .replace('id="gradientStop2" offset="20%"', `id="gradientStop2" offset="${20 * opts.scalePolygon}%"`)
    .replace(/<filter.*?>.*?<\/filter>/gs, '');

  return content;
}
