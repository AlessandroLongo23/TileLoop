/** Identifiers for the game's sound effects. */
export type SoundId = 'toggleOn' | 'toggleOff' | 'button' | 'screenshot' | 'slider' | 'stateChange';

export interface SoundDef {
  /** Asset path (served from /sound on web, bundled on native). */
  file: string;
  defaultVolume: number;
}

/** File + default volume for each sound effect. */
export const SOUND_DEFS: Record<SoundId, SoundDef> = {
  toggleOn: { file: '/sound/Toggle On.mp3', defaultVolume: 0.2 },
  toggleOff: { file: '/sound/Toggle Off.mp3', defaultVolume: 0.2 },
  button: { file: '/sound/Button.mp3', defaultVolume: 0.15 },
  screenshot: { file: '/sound/ScreenshotExport.mp3', defaultVolume: 0.25 },
  slider: { file: '/sound/Slider.mp3', defaultVolume: 0.2 },
  stateChange: { file: '/sound/State change.mp3', defaultVolume: 0.3 },
};

/** Optional per-play modulation parameters (web engine applies filters/pitch). */
export interface SoundParams {
  bornRatio?: number;
  diedRatio?: number;
  activityLevel?: number;
  iteration?: number;
}

/**
 * Platform-agnostic sound interface. Web implements it with Web Audio (pitch +
 * biquad-filter variation); native implements it with expo-audio (file + volume).
 */
export interface SoundEngine {
  play(id: SoundId, volume?: number, params?: SoundParams): void | Promise<void>;
}

/** No-op engine used before a real engine is installed. */
export const silentSoundEngine: SoundEngine = {
  play() {
    /* no-op */
  },
};
