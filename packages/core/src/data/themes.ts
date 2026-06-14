/** Available tile artwork sets. */
export const tilesets = ['loop', 'flow', 'tech'] as const;
export type Tileset = (typeof tilesets)[number];

export type GameMode = 'campaign' | 'zen' | 'timeattack' | 'precision';

export interface Theme {
  colors: Record<string, string>;
}

/** Colour themes keyed by name; `default.colors[gameMode]` drives matched-edge hue. */
export const themes: Record<string, Theme> = {
  default: {
    colors: {
      timeattack: 'oklch(55.5% 0.163 48.998)',
      precision: 'oklch(49.1% 0.27 292.581)',
      zen: 'oklch(50.8% 0.118 165.612)',
    },
  },
};
