import { gameSettingsStore, type SoundParams } from '@tileloop/core';

// Web Audio engine — ported from the legacy sounds.js. The pitch/filter
// variation is web-specific (the core only owns the sound definitions).

let audioContext: AudioContext | undefined;
if (typeof window !== 'undefined') {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
  } catch (e) {
    console.error('Web Audio API not supported', e);
  }
}

const soundBuffers: Record<string, AudioBuffer | undefined> = {};
const loadingPromises: Record<string, Promise<AudioBuffer | null> | undefined> = {};

const MAX_INSTANCES = 10;
const activeSounds = { slider: 0 };

interface FilterOptions {
  type?: BiquadFilterType;
  frequency?: number;
  q?: number;
  gain?: number;
}
interface PlayOptions {
  pitchVariation?: number;
  filter?: FilterOptions;
}

async function loadSound(url: string): Promise<AudioBuffer | null> {
  if (!audioContext) return null;
  if (loadingPromises[url]) return loadingPromises[url];
  if (soundBuffers[url]) return soundBuffers[url];

  loadingPromises[url] = fetch(url)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext!.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      soundBuffers[url] = audioBuffer;
      delete loadingPromises[url];
      return audioBuffer;
    })
    .catch((error) => {
      console.error('Error loading sound', url, error);
      delete loadingPromises[url];
      return null;
    });

  return loadingPromises[url];
}

export function playSound(sound: string, volume = 0.5, options: PlayOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !audioContext) return Promise.resolve();

  try {
    if (!gameSettingsStore.getState().value.soundEnabled) return Promise.resolve();
  } catch {
    console.warn('Game settings not loaded, playing sound anyway');
  }

  const soundType = sound.split('/').pop()!.split('.')[0].replace(/\s+/g, '').toLowerCase();

  if (soundType === 'slider') {
    if (activeSounds.slider >= MAX_INSTANCES) return Promise.resolve();
    activeSounds.slider++;
  }

  return loadSound(sound)
    .then((buffer) => {
      if (!buffer) return;

      const source = audioContext!.createBufferSource();
      source.buffer = buffer;

      if (options.pitchVariation) {
        const variation = 1.0 + (Math.random() * 2 - 1) * options.pitchVariation;
        source.playbackRate.value = variation;
      }

      const gainNode = audioContext!.createGain();
      gainNode.gain.value = volume;

      if (options.filter) {
        const filter = audioContext!.createBiquadFilter();
        filter.type = options.filter.type || 'lowpass';
        filter.frequency.value = options.filter.frequency || 1000;
        if (options.filter.q !== undefined) filter.Q.value = options.filter.q;
        if (options.filter.gain !== undefined) filter.gain.value = options.filter.gain;
        source.connect(filter);
        filter.connect(gainNode);
      } else {
        source.connect(gainNode);
      }

      gainNode.connect(audioContext!.destination);
      source.start(0);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          if (soundType === 'slider') activeSounds.slider = Math.max(0, activeSounds.slider - 1);
          resolve();
        };
      });
    })
    .catch((err) => {
      console.error('Error playing sound:', err);
      if (soundType === 'slider') activeSounds.slider = Math.max(0, activeSounds.slider - 1);
    });
}

export const sounds = {
  toggleOn: (volume = 0.2) =>
    playSound('/sound/Toggle On.mp3', volume, {
      pitchVariation: 0.05,
      filter: { type: 'highshelf', frequency: 2000 + Math.random() * 500, gain: 2 + Math.random() },
    }),
  toggleOff: (volume = 0.2) =>
    playSound('/sound/Toggle Off.mp3', volume, {
      pitchVariation: 0.05,
      filter: { type: 'lowshelf', frequency: 1000 + Math.random() * 400, gain: 1.5 + Math.random() },
    }),
  button: (volume = 0.15) =>
    playSound('/sound/Button.mp3', volume, {
      pitchVariation: 0.07,
      filter: { type: 'peaking', frequency: 1200 + Math.random() * 800, q: 1 + Math.random() * 2, gain: 2 + Math.random() },
    }),
  screenshot: (volume = 0.25) =>
    playSound('/sound/ScreenshotExport.mp3', volume, {
      pitchVariation: 0.03,
      filter: {
        type: Math.random() > 0.5 ? 'highshelf' : 'peaking',
        frequency: 3000 + Math.random() * 1000,
        q: Math.random() * 1.5,
        gain: 1 + Math.random() * 2,
      },
    }),
  slider: (volume = 0.2) =>
    playSound('/sound/Slider.mp3', volume, {
      pitchVariation: 0.1,
      filter: {
        type: (['lowpass', 'highpass', 'bandpass'] as const)[Math.floor(Math.random() * 3)],
        frequency: 800 + Math.random() * 1200,
        q: 0.5 + Math.random() * 2,
      },
    }),
  stateChange: (volume = 0.3, simulationParams: SoundParams = {}) => {
    const options: PlayOptions = { pitchVariation: 0.15 };

    if (simulationParams.bornRatio !== undefined) {
      options.pitchVariation = 0.15 + simulationParams.bornRatio * 0.1;
    }
    if (simulationParams.activityLevel !== undefined) {
      options.pitchVariation = Math.min(0.3, 0.1 + simulationParams.activityLevel * 0.2);
    }
    if (simulationParams.iteration !== undefined) {
      const filterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass'];
      const filterType = filterTypes[simulationParams.iteration % filterTypes.length];
      const baseFreq = 800 + Math.random() * 800;
      const freqModulation = simulationParams.bornRatio ? 1 + simulationParams.bornRatio * 4 : 1;
      options.filter = {
        type: filterType,
        frequency: baseFreq * freqModulation,
        q: 1 + (simulationParams.activityLevel || 0) * 5,
      };
    }

    return playSound('/sound/State change.mp3', volume, options);
  },
};
