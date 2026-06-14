import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { SvgXml } from 'react-native-svg';
import {
  platform,
  prepareTileSvg,
  tileStyleParams,
  themes,
  configStore,
  type Polygon,
} from '@tileloop/core';
import { useAppearance, useSession } from '../hooks/stores';

interface TileProps {
  node: Polygon;
  trigger?: number;
}

function shapeKeyFor(n: number): 'triangle' | 'square' | 'hexagon' | null {
  if (n === 3) return 'triangle';
  if (n === 4) return 'square';
  if (n === 6) return 'hexagon';
  return null;
}

function svgRotateDeg(svgTransform: string): number {
  const m = svgTransform.match(/rotate\(([-\d.]+)deg\)/);
  return m ? parseFloat(m[1]) : 0;
}

export default function Tile({ node, trigger = 0 }: TileProps) {
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
  const size = scale * style.scalePolygon + 1;

  const stop1Color = useMemo(() => {
    const halfways = node.halfways;
    const total = halfways.reduce((acc, h) => acc + (h.connections ?? 0), 0);
    if (total !== 1) return '#000000';
    const single = halfways.find((h) => h.connections === 1);
    if (!single || !single.matched) return '#000000';
    return themes['default'].colors[session.gameMode] ?? '#000000';
  }, [node, trigger, session.gameMode]);

  useEffect(() => {
    let cancelled = false;
    const tileType = node.tileType;
    if (!tileType) return;
    const [sides, connections] = tileType.split('/');
    platform
      .loadTileSvg(tileset, Number(sides), connections)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) {
          setSvg('');
          return;
        }
        setSvg(
          prepareTileSvg(raw, {
            tileset,
            nodeId: node.id ?? '',
            scale,
            scalePolygon: style.scalePolygon,
            inline: {
              borderStrokeWidth: style.borderStrokeWidth,
              lineStrokeWidth: style.lineStrokeWidth,
              stop1Color,
            },
          }),
        );
      })
      .catch(() => setSvg(''));
    return () => {
      cancelled = true;
    };
  }, [node.tileType, node.id, tileset, scale, style.scalePolygon, stop1Color]);

  const rotateDeg = (style.startRotation * 180) / Math.PI + svgRotateDeg(node.svgTransform);
  const scaleX = node.mirrored ? -1 : 1;
  const pos = node.screenPosition;

  return (
    <View
      style={{
        position: 'absolute',
        left: (pos?.x ?? 0) - size / 2,
        top: (pos?.y ?? 0) - size / 2,
        width: size,
        height: size,
      }}
      pointerEvents="none"
    >
      <MotiView
        animate={{ rotate: `${rotateDeg}deg`, scaleX }}
        transition={{ type: 'timing', duration: 300 }}
      >
        {svg ? <SvgXml xml={svg} width={size} height={size} /> : null}
      </MotiView>
    </View>
  );
}
