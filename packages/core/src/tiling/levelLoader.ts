import { Level } from './Level';
import { platform } from '../platform/context';

export interface LevelConnectionData {
  position: { x: number; y: number };
  connections: number;
}

export interface LevelTileData {
  id: string;
  position: { x: number; y: number };
  screenPosition?: { x: number; y: number };
  sides?: number;
  rotation?: number;
  angle?: number;
  tileType?: string;
  mirrored?: boolean;
  svgTurns?: number;
  vertices?: { x: number; y: number }[];
  connections: LevelConnectionData[];
}

export interface LevelData {
  metadata: { name?: string; description?: string; created?: string; editor?: string };
  tiling: { rulestring: string; name?: string; transformSteps?: number };
  dimensions: { width: number; height: number };
  tiles: LevelTileData[];
}

export interface LevelStats {
  name: string;
  description: string;
  tileCount: number;
  tilingType: string;
  rulestring: string;
  created?: string;
  totalConnections: number;
  connectionsByType: Record<number, number>;
}

/** Rebuild a Level from exported JSON, restoring designed connections. */
export function loadLevelFromJSON(levelData: LevelData, width: number, height: number): Level {
  if (!levelData.tiling || !levelData.tiles) {
    throw new Error('Invalid level data: missing tiling or tiles');
  }

  const level = new Level(
    levelData.tiling.rulestring,
    levelData.tiling.transformSteps ?? null,
    width,
    height,
  );

  if (level.tiling.nodes.length !== levelData.tiles.length) {
    console.warn("Generated level doesn't match exported data, reconstructing...");
    return reconstructLevelFromData(levelData, width, height);
  }

  const tileMap = new Map<string, LevelTileData>();
  levelData.tiles.forEach((tileData) => tileMap.set(tileData.id, tileData));

  for (const node of level.tiling.nodes) {
    const tileData = node.id ? tileMap.get(node.id) : undefined;
    if (tileData) {
      for (let i = 0; i < node.halfways.length; i++) {
        if (tileData.connections[i]) {
          node.halfways[i].connections = tileData.connections[i].connections;
        }
      }
    }
  }

  level.minMovesToSolve = calculateMinMovesToSolve(level);
  return level;
}

function reconstructLevelFromData(levelData: LevelData, width: number, height: number): Level {
  console.warn('Level reconstruction not fully implemented; loading base tiling.');
  return new Level(
    levelData.tiling.rulestring,
    levelData.tiling.transformSteps ?? null,
    width,
    height,
  );
}

function calculateMinMovesToSolve(level: Level): number {
  let minMoves = 0;
  for (const node of level.tiling.nodes) {
    const hasConnections = node.halfways.some((h) => (h.connections ?? 0) > 0);
    if (hasConnections) {
      minMoves += Math.floor(platform.rng.next() * node.n);
    }
  }
  return Math.max(1, minMoves);
}

export function validateLevelData(levelData: unknown): levelData is LevelData {
  if (!levelData || typeof levelData !== 'object') return false;
  const data = levelData as Record<string, unknown>;

  for (const prop of ['metadata', 'tiling', 'dimensions', 'tiles']) {
    if (!data[prop]) {
      console.error(`Missing required property: ${prop}`);
      return false;
    }
  }

  if (!(data.tiling as { rulestring?: string }).rulestring) {
    console.error('Missing tiling.rulestring');
    return false;
  }

  if (!Array.isArray(data.tiles)) {
    console.error('tiles must be an array');
    return false;
  }

  for (const tile of data.tiles as LevelTileData[]) {
    if (!tile.id || typeof tile.position !== 'object' || !Array.isArray(tile.connections)) {
      console.error('Invalid tile structure:', tile);
      return false;
    }
  }

  return true;
}

export function getLevelStats(levelData: LevelData): LevelStats | null {
  if (!validateLevelData(levelData)) return null;

  const stats: LevelStats = {
    name: levelData.metadata.name || 'Unnamed Level',
    description: levelData.metadata.description || '',
    tileCount: levelData.tiles.length,
    tilingType: levelData.tiling.name || 'Custom',
    rulestring: levelData.tiling.rulestring,
    created: levelData.metadata.created,
    totalConnections: 0,
    connectionsByType: { 0: 0, 1: 0, 2: 0 },
  };

  for (const tile of levelData.tiles) {
    for (const connection of tile.connections) {
      const count = connection.connections || 0;
      stats.totalConnections += count;
      stats.connectionsByType[count] = (stats.connectionsByType[count] ?? 0) + 1;
    }
  }

  return stats;
}
