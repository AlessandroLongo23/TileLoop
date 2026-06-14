import { TOLERANCE } from './constants';

/** Spatial-hash key bucketing a coordinate to a tolerance-sized grid cell. */
export function getSpatialKey(x: number, y: number): string {
  const gridSize = TOLERANCE * 2;
  const hashX = Math.floor(x / gridSize);
  const hashY = Math.floor(y / gridSize);
  return `${hashX},${hashY}`;
}
