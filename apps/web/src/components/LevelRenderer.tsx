import { useRef, useState } from 'react';
import { Vector, configStore, type Level, type Polygon } from '@tileloop/core';
import { sounds } from '../audio/sounds';
import Tile from './Tile';

interface LevelRendererProps {
  width: number;
  height: number;
  level: Level;
  onTileClick?: () => void;
  showCelebration?: boolean;
  celebrationStage?: number;
}

export default function LevelRenderer({
  width,
  height,
  level,
  onTileClick = () => {},
  showCelebration = false,
  celebrationStage = 0,
}: LevelRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const lastClickTime = useRef(0);
  const processing = useRef(false);

  function handleTileClick(tile: Polygon) {
    if (level.isFrozen) return;
    if (tile.isRotating) return;

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
    const scale = configStore.getState().scale;
    const clickTilingPos = Vector.scale(
      Vector.sub(clickPos, new Vector(width / 2, height / 2)),
      1 / scale,
    );
    const tile = level.tiling.nodes.find((t) => t.containsPoint(clickTilingPos));
    if (tile) handleTileClick(tile);

    setTimeout(() => {
      processing.current = false;
    }, 10);
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
