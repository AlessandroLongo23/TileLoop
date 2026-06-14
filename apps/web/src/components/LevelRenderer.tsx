import { useMemo, useRef, useState } from 'react';
import {
  Vector,
  configStore,
  isWithinTolerance,
  type Level,
  type Polygon,
  type Halfway,
} from '@tileloop/core';
import { sounds } from '../audio/sounds';
import Tile from './Tile';

interface LevelRendererProps {
  width: number;
  height: number;
  level: Level;
  onTileClick?: () => void;
  showCelebration?: boolean;
  celebrationStage?: number;
  isEditorMode?: boolean;
  onConnectionClick?: (halfway: Halfway, node: Polygon) => void;
}

interface UniqueHalfway {
  halfway: Halfway;
  node: Polygon;
  screenPosition: Vector;
}

export default function LevelRenderer({
  width,
  height,
  level,
  onTileClick = () => {},
  showCelebration = false,
  celebrationStage = 0,
  isEditorMode = false,
  onConnectionClick = () => {},
}: LevelRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const lastClickTime = useRef(0);
  const processing = useRef(false);

  const scale = configStore.getState().scale;

  const uniqueHalfways = useMemo<UniqueHalfway[]>(() => {
    if (!isEditorMode || !level?.tiling?.nodes) return [];
    const unique: UniqueHalfway[] = [];
    for (const node of level.tiling.nodes) {
      for (const halfway of node.halfways) {
        if (unique.some((h) => isWithinTolerance(h.halfway, halfway))) continue;
        unique.push({
          halfway,
          node,
          screenPosition: Vector.add(
            node.screenPosition ?? new Vector(),
            Vector.scale(Vector.sub(halfway, node.centroid), scale),
          ),
        });
      }
    }
    return unique;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorMode, level, tick, scale]);

  function handleTileClick(tile: Polygon) {
    if (level.isFrozen || tile.isRotating || isEditorMode) return;
    tile.isRotating = true;
    tile.rotate();
    setTick((t) => t + 1);
    tile.effects?.forEach((effect) => effect.resolve());
    sounds.stateChange(0.25, { bornRatio: 0.75, diedRatio: 0.25, activityLevel: 0, iteration: 0 });
    onTileClick();
    setTimeout(() => {
      tile.isRotating = false;
      setTick((t) => t + 1);
    }, 10);
  }

  function handleContainerClick(event: React.MouseEvent) {
    const now = Date.now();
    if (processing.current || now - lastClickTime.current < 10) return;
    if (!containerRef.current || level.tiling.nodes.length === 0) return;
    processing.current = true;
    lastClickTime.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const clickPos = new Vector(event.clientX - rect.left, event.clientY - rect.top);

    if (isEditorMode) {
      const hit = uniqueHalfways.find(
        (u) => Vector.distance(clickPos, u.screenPosition) < 25,
      );
      if (hit) {
        onConnectionClick(hit.halfway, hit.node);
        setTimeout(() => (processing.current = false), 10);
        return;
      }
    }

    const clickTilingPos = Vector.scale(
      Vector.sub(clickPos, new Vector(width / 2, height / 2)),
      1 / scale,
    );
    const tile = level.tiling.nodes.find((t) => t.containsPoint(clickTilingPos));
    if (tile) handleTileClick(tile);

    setTimeout(() => (processing.current = false), 10);
  }

  return (
    <div
      ref={containerRef}
      data-testid="level-renderer"
      onClick={handleContainerClick}
      className="relative cursor-pointer overflow-hidden bg-gradient-to-br from-slate-100 to-slate-400"
      style={{ width, height }}
    >
      {level.tiling.nodes.map((node) => (
        <Tile
          key={node.id}
          node={node}
          trigger={tick}
          celebrationStage={showCelebration ? celebrationStage : -1}
        />
      ))}

      {isEditorMode &&
        uniqueHalfways.map((u, i) => (
          <div
            key={i}
            data-testid="connection-point"
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center opacity-25 transition-all duration-300 hover:opacity-100"
            style={{ left: u.screenPosition.x, top: u.screenPosition.y, width: 30, height: 30 }}
            onClick={(e) => {
              e.stopPropagation();
              onConnectionClick(u.halfway, u.node);
            }}
          >
            <div className="relative size-3 rounded-full bg-zinc-800 shadow-md active:bg-zinc-600" />
          </div>
        ))}

      {level.tiling.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium">No tiles generated</div>
            <div className="text-sm">Check your tiling configuration</div>
          </div>
        </div>
      )}
    </div>
  );
}
