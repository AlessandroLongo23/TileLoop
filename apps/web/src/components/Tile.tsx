import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  platform,
  prepareTileSvg,
  tileStyleParams,
  themes,
  configStore,
  type Polygon,
} from '@tileloop/core';
import { useAppearance, useSession } from '../hooks/stores';
import './tile.css';

interface TileProps {
  node: Polygon;
  trigger?: number;
  celebrationStage?: number;
}

function shapeKeyFor(n: number): 'triangle' | 'square' | 'hexagon' | null {
  if (n === 3) return 'triangle';
  if (n === 4) return 'square';
  if (n === 6) return 'hexagon';
  return null;
}

/** Extract the accumulated rotate(...) degrees from a tile's svgTransform. */
function svgRotateDeg(svgTransform: string): number {
  const m = svgTransform.match(/rotate\(([-\d.]+)deg\)/);
  return m ? parseFloat(m[1]) : 0;
}

export default function Tile({ node, trigger = 0, celebrationStage = -1 }: TileProps) {
  const appearance = useAppearance();
  const session = useSession();
  const [svg, setSvg] = useState('');

  const tileset = useMemo(() => {
    const key = shapeKeyFor(node.n);
    if (!key) return 'loop';
    return appearance.shapeStyles[key]?.tileset || 'loop';
  }, [node.n, appearance]);

  const style = useMemo(() => tileStyleParams(node), [node, trigger]);
  const scale = configStore.getState().scale;

  useEffect(() => {
    let cancelled = false;
    const tileType = node.tileType;
    if (!tileType) return;
    const [sides, connections] = tileType.split('/');
    platform
      .loadTileSvg(tileset, Number(sides), connections)
      .then((raw) => {
        if (cancelled || !raw) {
          if (!raw) setSvg('');
          return;
        }
        setSvg(
          prepareTileSvg(raw, {
            tileset,
            nodeId: node.id ?? '',
            scale,
            scalePolygon: style.scalePolygon,
          }),
        );
      })
      .catch(() => setSvg(''));
    return () => {
      cancelled = true;
    };
  }, [node.tileType, node.id, tileset, scale, style.scalePolygon]);

  // Rotation (degrees) and mirroring, in the legacy "rotate(...) scaleX(...)" order.
  const rotateDeg = (style.startRotation * 180) / Math.PI + svgRotateDeg(node.svgTransform);
  const scaleX = node.mirrored ? -1 : 1;

  // Matched-edge highlight colour.
  const stop1Color = useMemo(() => {
    const halfways = node.halfways;
    const total = halfways.reduce((acc, h) => acc + (h.connections ?? 0), 0);
    if (total !== 1) return '#000000';
    const single = halfways.find((h) => h.connections === 1);
    if (!single || !single.matched) return '#000000';
    return themes['default'].colors[session.gameMode] ?? '#000000';
  }, [node, trigger, session.gameMode]);

  const borderStrokeWidth = celebrationStage >= 0 ? 0 : style.borderStrokeWidth;

  const cssVars = {
    '--border-stroke-width': `${borderStrokeWidth}px`,
    '--line-stroke-width': `${style.lineStrokeWidth}px`,
    '--gradient-stop-1-color': stop1Color,
  } as React.CSSProperties;

  const pos = node.screenPosition;

  return (
    <div
      data-tile
      className="pointer-events-none absolute"
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        className="tile-art"
        style={cssVars}
        animate={{ rotate: rotateDeg, scaleX }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        transformTemplate={(latest) => `rotate(${latest.rotate}) scaleX(${latest.scaleX})`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
