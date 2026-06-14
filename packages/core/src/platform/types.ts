/**
 * Platform abstraction interfaces.
 *
 * The engine is framework- and host-agnostic. Anything that differs between
 * web, native, and tests (randomness, time, persistent storage, asset loading)
 * is injected through these interfaces so the same logic runs everywhere and is
 * deterministic under test.
 */

/** Source of randomness. `next()` returns a float in [0, 1), like Math.random. */
export interface Rng {
  next(): number;
}

/** Source of wall-clock time, abstracted for deterministic tests. */
export interface Clock {
  /** Milliseconds since the unix epoch (like Date.now). */
  now(): number;
  /** ISO-8601 timestamp string (like new Date().toISOString). */
  iso(): string;
}

/** Async key/value persistence (localStorage on web, AsyncStorage on native). */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Loads the raw SVG markup for a single tile. */
export type LoadTileSvg = (
  tileset: string,
  sides: number,
  connections: string,
) => Promise<string>;

/** The full set of injected platform dependencies. */
export interface Platform {
  rng: Rng;
  clock: Clock;
  storage: Storage;
  loadTileSvg: LoadTileSvg;
}
