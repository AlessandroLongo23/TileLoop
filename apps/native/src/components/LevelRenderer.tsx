import { useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { Vector, configStore, type Level, type Polygon } from '@tileloop/core';
import Tile from './Tile';

interface LevelRendererProps {
  width: number;
  height: number;
  level: Level;
  onTileClick?: () => void;
}

export default function LevelRenderer({
  width,
  height,
  level,
  onTileClick = () => {},
}: LevelRendererProps) {
  const [tick, setTick] = useState(0);
  const lastTap = useRef(0);

  function rotateTile(tile: Polygon) {
    if (level.isFrozen || tile.isRotating) return;
    tile.isRotating = true;
    tile.rotate();
    setTick((t) => t + 1);
    tile.effects?.forEach((effect) => effect.resolve());
    onTileClick();
    setTimeout(() => {
      tile.isRotating = false;
      setTick((t) => t + 1);
    }, 10);
  }

  function handleTouch(event: GestureResponderEvent) {
    const now = Date.now();
    if (now - lastTap.current < 10) return;
    lastTap.current = now;

    const { locationX, locationY } = event.nativeEvent;
    const scale = configStore.getState().scale;
    const clickTilingPos = Vector.scale(
      Vector.sub(new Vector(locationX, locationY), new Vector(width / 2, height / 2)),
      1 / scale,
    );
    const tile = level.tiling.nodes.find((t) => t.containsPoint(clickTilingPos));
    if (tile) rotateTile(tile);
  }

  return (
    <View
      style={{ width, height, backgroundColor: '#cbd5e1', overflow: 'hidden' }}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleTouch}
    >
      {level.tiling.nodes.map((node) => (
        <Tile key={node.id} node={node} trigger={tick} />
      ))}
    </View>
  );
}
