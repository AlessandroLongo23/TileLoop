export const CORE_VERSION = '0.1.0';

// Platform
export * from './platform/types';
export * from './platform/rng';
export * from './platform/context';

// Geometry
export * from './geometry/constants';
export * from './geometry/Vector';
export * from './geometry/math';
export * from './geometry/geometry';
export * from './geometry/optimizing';

// Utilities
export * from './util/seq';

// Tiling engine
export * from './tiling/Polygon';
export * from './tiling/Tiling';
export * from './tiling/TilingGenerator';

// State
export * from './state/configStore';
export * from './state/persist';

// Static data
export * from './data/tilingRules';

// Game
export * from './game/puzzle';
export * from './game/art';
export * from './game/levels';
export * from './game/progress';
