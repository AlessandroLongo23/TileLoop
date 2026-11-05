import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { Palette } from '@tileloop/core';
import { useSettings } from './hooks/stores';

/** OKLCH (lightness 0..1, chroma, hue in degrees) to `#rrggbb`, chroma eased off until it fits sRGB. */
function oklch(L: number, C: number, hue: number): string {
  for (; ; C *= 0.92) {
    const [a, b] = [C * Math.cos((hue * Math.PI) / 180), C * Math.sin((hue * Math.PI) / 180)];
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (C > 0.002 && rgb.some((v) => v < 0 || v > 1)) continue;
    const srgb = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
    return '#' + rgb.map((v) => srgb(Math.min(1, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
  }
}

/**
 * A world in any hue, built the way the chapter palettes are: measured in OKLCH they share their
 * lightnesses (paper 0.945, ink 0.285, fills 0.765 / 0.68 / 0.845) and differ in hue and how
 * strong the fills are (`chroma`, 0.5 for chapter 9's slate to 1.4 for chapter 10's mustard).
 */
export const world = (hue: number, chroma: number): Palette => ({
  bg: oklch(0.945, 0.014, hue),
  line: oklch(0.285, 0.03, hue),
  fills: [oklch(0.765, 0.09 * chroma, hue), oklch(0.68, 0.105 * chroma, hue - 6), oklch(0.845, 0.065 * chroma, hue)],
});

/** The home screen's colours (and Settings'), new on every launch. */
export const homePalette: Palette = world(360 * Math.random(), 0.6 + 0.8 * Math.random());

/** `#rrggbb` + alpha (0..1) → `rgba()`. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** True for a light background (dark status bar and text go on it). */
export function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
}

/** `a` moved towards `b` by `t` (0..1), both `#rrggbb`. */
export function mix(a: string, b: string, t: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Night turns a world inside out: its line colour becomes the sky, its paper becomes the ink. */
export const night = (p: Palette): Palette => ({ bg: mix(p.line, '#000000', 0.45), line: p.bg, fills: p.fills });

export const themed = (p: Palette, dark: boolean): Palette => (dark ? night(p) : p);

/** True when the game wears its night colours: by setting, or following the phone. */
export function useNight(): boolean {
  const theme = useSettings().theme ?? 'system';
  const scheme = useColorScheme();
  return theme === 'night' || (theme === 'system' && scheme === 'dark');
}

/** A world's colours in the current theme. */
export function usePalette(p: Palette): Palette {
  const dark = useNight();
  return useMemo(() => themed(p, dark), [p, dark]);
}

/** Type: the platform's own face, so the game feels native. Weights do the work. */
export const type = {
  title: { fontSize: 64, fontWeight: '800' as const, letterSpacing: -2.5 },
  heading: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  small: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
};
