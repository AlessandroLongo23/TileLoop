import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { settingsStore } from '@tileloop/core';

// Recorded sounds from Kenney's Interface Sounds (CC0), chosen for short, soft, warm tones.
const sources = {
  tap0: require('../assets/sounds/tap0.wav'),
  tap1: require('../assets/sounds/tap1.wav'),
  tap2: require('../assets/sounds/tap2.wav'),
  solve: require('../assets/sounds/solve.wav'),
  locked: require('../assets/sounds/locked.wav'),
  click: require('../assets/sounds/click.wav'),
  appear: require('../assets/sounds/appear.wav'),
};
type SoundName = keyof typeof sources;

// A few players per sound, so fast taps overlap instead of cutting each other off.
const pools = new Map<SoundName, { players: AudioPlayer[]; next: number }>();
let music: AudioPlayer | null = null;
const settings = () => settingsStore.getState().value;

export async function initAudio(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: false } as never);
  } catch {
    // web: nothing to set
  }
}

function player(name: SoundName): AudioPlayer | null {
  try {
    let pool = pools.get(name);
    if (!pool) {
      const size = name.startsWith('tap') ? 3 : 1;
      pool = { players: Array.from({ length: size }, () => createAudioPlayer(sources[name])), next: 0 };
      pools.set(name, pool);
    }
    const p = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    return p;
  } catch {
    return null;
  }
}

// browsers refuse sound before the first gesture; wait for it there
let unlocked = Platform.OS !== 'web';
if (!unlocked && typeof window !== 'undefined')
  window.addEventListener('pointerdown', () => (unlocked = true), { once: true });

export function play(name: SoundName, volume = 1): void {
  if (!settings().sound || !unlocked) return;
  const p = player(name);
  if (!p) return;
  try {
    p.volume = volume;
    void p.seekTo(0);
    p.play();
  } catch {
    // a missing audio device must never break the game
  }
}

/** Three takes of the tap, never the same one twice in a row, at slightly varied loudness. */
let last = 0;
export function playTap(): void {
  last = (last + 1 + Math.floor(Math.random() * 2)) % 3;
  play(`tap${last}` as SoundName, 0.45 + Math.random() * 0.15);
}

export function haptic(kind: 'tap' | 'soft' | 'success' = 'tap'): void {
  if (!settings().haptics || Platform.OS === 'web') return;
  if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else void Haptics.impactAsync(kind === 'soft' ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light);
}

export function syncMusic(): void {
  try {
    if (settings().music) {
      if (!music) {
        music = createAudioPlayer(require('../assets/sounds/music.m4a'));
        music.loop = true;
        music.volume = 0.25;
      }
      music.play();
    } else music?.pause();
  } catch {
    // ignore
  }
}
