import { tilingRules } from '../data/tilingRules';
import { atlasTilings } from '../data/atlasTilings';
import type { PuzzleSpec } from './puzzle';
import { mulberry32 } from '../platform/rng';

/** A world's colours: a calm background, one colour for every line, and the fills a solved board takes. */
export interface Palette {
  bg: string;
  line: string;
  fills: string[];
}

/** One run of ten levels inside a chapter: a single twist on the chapter's idea. */
export interface Section {
  /** Tilings the section's levels cycle through; `{n}` is replaced by the level number. */
  rules: string[];
  /** Board size from the first level of the section to its finale. */
  tiles: [number, number];
  density: number;
  /** Board height / width, for sections whose boards take an unusual shape. */
  aspect?: number;
  /** Mechanics, as shares of the board (see PuzzleSpec). */
  fixed?: number;
  doubles?: number;
  links?: number;
  reverse?: number;
  passive?: number;
  mirrors?: number;
  gears?: number;
  /** Shown once, before the section's first level, when the section brings something new. */
  intro?: { title: string; body: string };
}

export interface Chapter {
  id: number;
  title: string;
  sections: Section[];
  palette: Palette;
}

export interface LevelRef {
  mode: 'campaign' | 'daily' | 'endless' | 'lab';
  chapter?: number;
  level?: number;
  date?: string;
}

export interface LevelDef {
  ref: LevelRef;
  spec: PuzzleSpec;
  seed: number;
  palette: Palette;
}

export const SECTION_LEVELS = 10;
/** Dots a section must give (of its 30) before the next one opens. */
export const SECTION_GATE = 18;

export function levelsIn(chapter: number): number {
  return (chapters[chapter - 1]?.sections.length ?? 0) * SECTION_LEVELS;
}

/** Every tiling a chapter uses, first section first. */
export function chapterRules(ch: Chapter): string[] {
  return [...new Set(ch.sections.flatMap((s) => s.rules))];
}

const rulesIn = (groupId: string) =>
  tilingRules.find((g) => g.id === groupId)?.rules.map((r) => r.rulestring) ?? [];

const world = (bg: string, line: string, ...fills: string[]): Palette => ({ bg, line, fills });

const SQUARES = '4-4-0,4/r90/m(v2)';
/** Mixed tilings whose smallest tile stays a fingertip wide on a phone at 24 tiles or more. */
const ROOMY = ['6-3-3,3-0,3/r60/r(h8)', '6-3,3-3/m30/r(h1)', '4-3/m(h4)/m(h3)/r(h2)', '4-3-3-3/m90/r(h7)/r(h5)', '4-3,4-3,3/m90/r(h3)', '3-0,4-0,3/m30/r(c3)', '4-4-3-3/m90/r(h3)', '6-4-3-3/m30/r(h5)', '4-3,3-4,3/r90/m(h3)'];
const HEXAGONS = '6/r60/r(h1)';
const TRIANGLES = '3/r60/r(h2)';
const atlas = (id: string) => `atlas:ctrnact-${id}`;

/**
 * The journey: ten chapters of five sections. Each chapter brings one idea and each section one
 * twist on it. Fixed tiles help early on and fade out; the dual tilings (a cell per corner of a
 * mixed tiling) bring the pentagons, rhombi and other shapes that flip instead of turning.
 */
export const chapters: Chapter[] = [
  {
    id: 1,
    title: 'Squares',
    palette: world('#F4EDE4', '#2D2A26', '#E9B872', '#E39E6B', '#F1CF9B'),
    sections: [
      {
        rules: [SQUARES], tiles: [4, 9], density: 0.6, fixed: 0.3,
        intro: { title: 'Close every loop', body: 'Tap a tile to turn it. Every line has to meet a line on the next tile. Shaded tiles are already in place.' },
      },
      { rules: [SQUARES], tiles: [8, 16], density: 0.72, fixed: 0.22 },
      { rules: [SQUARES], tiles: [12, 20], density: 0.42, fixed: 0.14 },
      { rules: [SQUARES], tiles: [14, 22], density: 0.58, aspect: 2, fixed: 0.07 },
      { rules: [SQUARES], tiles: [18, 28], density: 0.76 },
    ],
  },
  {
    id: 2,
    title: 'Honeycomb',
    palette: world('#E6EFEA', '#22302A', '#8DC3A7', '#6BAA8E', '#B5D6C3'),
    sections: [
      { rules: [HEXAGONS], tiles: [5, 12], density: 0.55, fixed: 0.25 },
      { rules: [HEXAGONS], tiles: [10, 18], density: 0.72, fixed: 0.18 },
      { rules: [HEXAGONS], tiles: [12, 22], density: 0.42, fixed: 0.1 },
      { rules: [HEXAGONS], tiles: [14, 24], density: 0.55, aspect: 1.8, fixed: 0.05 },
      { rules: [HEXAGONS], tiles: [20, 32], density: 0.6 },
    ],
  },
  {
    id: 3,
    title: 'Triangles',
    palette: world('#F3E6E8', '#3A2329', '#E59AA6', '#D07687', '#F0BAC2'),
    sections: [
      { rules: [TRIANGLES], tiles: [8, 16], density: 0.6, fixed: 0.25 },
      { rules: [TRIANGLES], tiles: [12, 22], density: 0.5, fixed: 0.16 },
      { rules: [TRIANGLES], tiles: [14, 26], density: 0.72, fixed: 0.08 },
      { rules: [TRIANGLES], tiles: [12, 22], density: 0.6, aspect: 1.8 },
      { rules: [TRIANGLES], tiles: [24, 36], density: 0.62 },
    ],
  },
  {
    id: 4,
    title: 'Weave',
    palette: world('#E5ECF3', '#1F2B3A', '#8EB4DA', '#6C98C6', '#B3CDE7'),
    // Every mix here keeps its smallest tile at a fingertip's size on a phone; twelve-sided wheels,
    // with their tiny triangles, never do.
    sections: [
      {
        rules: ['6-3-3,3-0,3/r60/r(h8)', '6-3,3-3/m30/r(h1)'], tiles: [10, 24], density: 0.56, fixed: 0.12,
        intro: { title: 'Mixed tiles', body: 'From here on a board mixes shapes. Each one still turns one edge at a time.' },
      },
      { rules: ['6-4-3-3/m30/r(h5)', '6-4-3,4-3,3/m30/r(c5)'], tiles: [10, 22], density: 0.56, fixed: 0.06 },
      { rules: ['8-4/m90/r(h4)'], tiles: [8, 16], density: 0.5 },
      { rules: ['4-3/m90/r(h2)', '4-3-3-3/m90/r(h7)/r(h5)', '4-3,4-3,3/m90/r(h3)'], tiles: [12, 28], density: 0.56 },
      {
        rules: ['4-3-3-3-3/m90/r(h2)/m(h22)', '6-3-3/m30/r(v3)', '6-3-3-0,3,3-0,3-0,3/r60/r(h7)', '4-4-3-3/m90/r(h7)/r(v1)', '3-0,4-0,3-0,3/m30/r(h6)', '6-3-3-0,4-0,3-0,0,3/m30/r(h10)'],
        tiles: [14, 28], density: 0.54,
      },
    ],
  },
  {
    id: 5,
    title: 'Pairs',
    palette: world('#F4E7E1', '#3A251D', '#E39373', '#CF7556', '#EDB39B'),
    sections: [
      {
        rules: [SQUARES], tiles: [8, 18], density: 0.56, links: 0.14,
        intro: { title: 'Bound pairs', body: 'A tile with a dot turns its partner, the tile with a ring, whenever you turn it.' },
      },
      { rules: [HEXAGONS], tiles: [10, 20], density: 0.56, links: 0.2 },
      {
        rules: [SQUARES, HEXAGONS], tiles: [10, 22], density: 0.56, links: 0.2, reverse: 0.6,
        intro: { title: 'Against the grain', body: 'A dashed ring turns the other way round.' },
      },
      {
        rules: [SQUARES, HEXAGONS], tiles: [10, 22], density: 0.56, links: 0.2, passive: 1,
        intro: { title: 'Held tiles', body: 'Some partners cannot be turned by hand. Only the tile with the dot moves them.' },
      },
      { rules: ROOMY.slice(0, 4), tiles: [14, 26], density: 0.56, links: 0.2, passive: 0.7, reverse: 0.4 },
    ],
  },
  {
    id: 6,
    title: 'Twins',
    palette: world('#E9EDE3', '#282E20', '#A9BF7C', '#8EA85E', '#C6D6A4'),
    sections: [
      {
        rules: [SQUARES], tiles: [8, 18], density: 0.6, doubles: 0.35,
        intro: { title: 'Double lines', body: 'A double line only meets another double line.' },
      },
      { rules: [HEXAGONS], tiles: [10, 22], density: 0.55, doubles: 0.3 },
      { rules: [TRIANGLES], tiles: [14, 28], density: 0.6, doubles: 0.25 },
      { rules: ROOMY.slice(0, 5), tiles: [12, 24], density: 0.54, doubles: 0.3 },
      { rules: ROOMY.slice(4), tiles: [14, 24], density: 0.54, doubles: 0.3, links: 0.1, passive: 0.5 },
    ],
  },
  {
    id: 7,
    title: 'Turns',
    palette: world('#EEE8F4', '#2B2438', '#B39DDB', '#957DC7', '#CDBEE8'),
    sections: [
      {
        rules: ['6-3-6/m30/r(v4)*', atlas('isotoxal-family-k1-07')], tiles: [10, 24], density: 0.6,
        intro: { title: 'Half turns', body: 'A rhombus fits its place two ways only, so each tap turns it half way round.' },
      },
      { rules: [atlas('isotoxal-family-k1-15'), atlas('isotoxal-family-k1-16')], tiles: [8, 14], density: 0.55 },
      { rules: [atlas('mixed-family-k1-06'), atlas('mixed-family-k3-43')], tiles: [10, 22], density: 0.55 },
      { rules: [atlas('star-9fold-k1-03')], tiles: [12, 28], density: 0.52 },
      { rules: [atlas('mixed-family-k4-185'), atlas('mixed-family-k1-06')], tiles: [14, 24], density: 0.52, links: 0.1, passive: 0.5 },
    ],
  },
  {
    id: 8,
    title: 'Mirrors',
    palette: world('#E8F1F2', '#1E3033', '#7CC6C9', '#5AAFB3', '#A6DADC'),
    sections: [
      {
        rules: ['4-3-3-3-3/m90/r(h2)/m(h22)*', '4-3-3-3/m90/r(h7)/r(h5)*', '4-4-3-3-3/m(h9)/r(h1)/r(h3)*'], tiles: [10, 24], density: 0.56,
        intro: { title: 'Flips', body: 'Some shapes only fit their place one way up. A tap flips them over instead of turning them.' },
      },
      { rules: ['6-3-3-0,3,3-0,3-0,3/r60/r(h7)*', '6-3-3,3-0,3/r60/r(h8)*'], tiles: [12, 26], density: 0.55 },
      { rules: ['3-0,3-0,6-0,0,3/r60/m(c1)*', '6-3-3/m30/r(v3)*'], tiles: [12, 28], density: 0.55 },
      {
        rules: [HEXAGONS, SQUARES], tiles: [10, 22], density: 0.58, mirrors: 0.16,
        intro: { title: 'Mirrors', body: 'A tile with a dot flips its partner across the line drawn on it. The partner never moves by hand.' },
      },
      { rules: ['4-3-3-3/m90/r(h7)/r(h5)*', '6-3-3,3-0,3/r60/r(h8)*', '3-0,3-0,6-0,0,3/r60/m(c1)*'], tiles: [16, 32], density: 0.55, mirrors: 0.12 },
    ],
  },
  {
    id: 9,
    title: 'Fractal',
    palette: world('#ECEEF1', '#22262D', '#93A3BE', '#7B8CAB', '#B4C0D4'),
    sections: [
      {
        rules: ['split:squares:0.2:{n}'], tiles: [12, 24], density: 0.6,
        intro: { title: 'Two sizes', body: 'Some squares are split in four. A big tile meets two small ones along each split side.' },
      },
      { rules: ['split:squares:0.35:{n}'], tiles: [14, 26], density: 0.6 },
      { rules: ['split:squares:0.5:{n}'], tiles: [12, 24], density: 0.62 },
      { rules: ['split:squares:0.35:{n}'], tiles: [16, 30], density: 0.6, links: 0.12, passive: 0.5 },
      { rules: ['split:squares:0.4:{n}'], tiles: [18, 32], density: 0.6, links: 0.12, reverse: 0.5, passive: 0.5 },
    ],
  },
  {
    id: 10,
    title: 'Gears',
    palette: world('#F5EDDC', '#33291A', '#EDC75C', '#E0AE3C', '#F3D98D'),
    sections: [
      {
        rules: [SQUARES], tiles: [8, 16], density: 0.55, gears: 0.08,
        intro: { title: 'Gears', body: 'A gear turns itself and every tile around it.' },
      },
      { rules: [SQUARES], tiles: [12, 22], density: 0.55, gears: 0.16 },
      { rules: [HEXAGONS], tiles: [12, 24], density: 0.55, gears: 0.15 },
      { rules: [SQUARES, HEXAGONS], tiles: [6, 14], density: 0.55, gears: 1 },
      { rules: ROOMY.slice(0, 4), tiles: [12, 22], density: 0.55, gears: 0.12, links: 0.08, doubles: 0.2 },
    ],
  },
];

/** Stable 32-bit hash, so every level has its own seed. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The section (0-based) a level belongs to. */
export const sectionOf = (level: number) => Math.floor((level - 1) / SECTION_LEVELS);

/**
 * Inside a section: level 1 shows the twist on a small board, 2 to 7 grow, 8 is a breather,
 * 9 is big and 10 is the section's hardest.
 */
export function campaignLevel(chapter: number, level: number): LevelDef {
  const ch = chapters[chapter - 1];
  const sec = ch.sections[sectionOf(level)];
  const i = (level - 1) % SECTION_LEVELS;
  const [lo, hi] = sec.tiles;
  const ramp = (k: number) => lerp(lo, hi * 0.85, k / 6);
  const tiles = i <= 6 ? ramp(i) : i === 7 ? ramp(6) * 0.7 : i === 8 ? hi * 0.92 : hi;
  return {
    ref: { mode: 'campaign', chapter: ch.id, level },
    seed: hashSeed(`loop:${ch.id}:${level}`),
    palette: ch.palette,
    spec: specFor(sec, sec.rules[i % sec.rules.length].replace('{n}', String(level)), Math.round(tiles), i),
  };
}

function specFor(sec: Section, rule: string, tiles: number, i = 0): PuzzleSpec {
  return {
    rule,
    tiles,
    density: sec.density,
    ...(sec.aspect ? { aspect: i % 2 ? sec.aspect : 1 / sec.aspect } : {}),
    ...(sec.fixed ? { fixed: sec.fixed } : {}),
    ...(sec.doubles ? { doubles: sec.doubles } : {}),
    ...(sec.links ? { links: sec.links } : {}),
    ...(sec.reverse ? { reverse: sec.reverse } : {}),
    ...(sec.passive ? { passive: sec.passive } : {}),
    ...(sec.mirrors ? { mirrors: sec.mirrors } : {}),
    ...(sec.gears ? { gears: sec.gears } : {}),
  };
}

/** The card to show before a level, if it opens a section that brings something new. Keyed for "seen". */
export function introFor(chapter: number, level: number): { key: number; title: string; body: string } | null {
  if ((level - 1) % SECTION_LEVELS) return null;
  const intro = chapters[chapter - 1]?.sections[sectionOf(level)]?.intro;
  return intro ? { key: chapter * 100 + sectionOf(level), ...intro } : null;
}

const dailyPool = [
  ...rulesIn('1Ur'),
  ...rulesIn('1Usr'),
  ...rulesIn('2U'),
];

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The same puzzle for everyone on a given day, in the colours of the world its tiling comes from. */
export function dailyLevel(date = todayKey()): LevelDef {
  const seed = hashSeed(`loop:daily:${date}`);
  const rulestring = dailyPool[seed % dailyPool.length];
  const owner = chapters.find((c) => chapterRules(c).includes(rulestring));
  return {
    ref: { mode: 'daily', date },
    seed,
    palette: owner?.palette ?? chapters[(seed >>> 8) % chapters.length].palette,
    spec: { rule: rulestring, tiles: 26 + ((seed >>> 4) % 10), density: 0.55, doubles: 0.15, links: 0.1 },
  };
}

export const ENDLESS_BLOCK = 5;

/** Which world a block of Endless levels takes: the campaign order first, then a shuffle per round, never the same twice running. */
function endlessWorld(block: number): number {
  const k = chapters.length;
  const order = (round: number) => {
    const o = chapters.map((_, i) => i);
    if (round === 0) return o;
    const rng = mulberry32(hashSeed(`loop:endless:round:${round}`));
    for (let i = k - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    // a round never opens with the world the last one closed on
    if (o[0] === order(round - 1)[k - 1]) [o[0], o[1]] = [o[1], o[0]];
    return o;
  };
  return order(Math.floor(block / k))[block % k];
}

/** Endless mode: level n, slowly growing. Every five levels share one world: its tilings, its rules and its colours. */
export function endlessLevel(n: number): LevelDef {
  const seed = hashSeed(`loop:endless:${n}`);
  const ch = chapters[endlessWorld(Math.floor((n - 1) / ENDLESS_BLOCK))];
  // any section of the world, with its mechanics, on a board that grows with n
  const sec = ch.sections[(seed >>> 3) % ch.sections.length];
  const rule = sec.rules[seed % sec.rules.length].replace('{n}', String(n));
  // never past the section's own largest board, so small tiles stay big enough to tap
  const tiles = Math.round(Math.min(8 + Math.min(n * 1.1, 34), sec.tiles[1]));
  return { ref: { mode: 'endless', level: n }, seed, palette: ch.palette, spec: specFor(sec, rule, tiles) };
}

/** Lab: test boards for tilings and mechanics that are not in the campaign yet. */
const lab: { name: string; spec: PuzzleSpec }[] = [
  ...atlasTilings.flatMap((t) => [12, 22].map((tiles) => ({ name: t.name, spec: { rule: `atlas:${t.id}`, tiles, density: 0.55 } }))),
  { name: 'Split squares', spec: { rule: 'split:squares:0.25:1', tiles: 22, density: 0.6 } },
  { name: 'Split squares', spec: { rule: 'split:squares:0.35:2', tiles: 34, density: 0.6 } },
  { name: 'Split triangles', spec: { rule: 'split:triangles:0.3:3', tiles: 26, density: 0.6 } },
  ...[14, 24].flatMap((tiles) => [
    { name: 'Reverse links', spec: { rule: '6/r60/r(h1)', tiles, density: 0.55, links: 0.2, reverse: 1 } },
    { name: 'Some gears', spec: { rule: '4-4-0,4/r90/m(v2)', tiles, density: 0.55, gears: 0.2 } },
    { name: 'All gears', spec: { rule: '4-4-0,4/r90/m(v2)', tiles: tiles - 4, density: 0.55, gears: 1 } },
    { name: 'Held pairs', spec: { rule: '6/r60/r(h1)', tiles, density: 0.55, links: 0.2, passive: 1 } },
    { name: 'Mirrors', spec: { rule: '6/r60/r(h1)', tiles, density: 0.58, mirrors: 0.15 } },
    { name: 'Flips: pentagons', spec: { rule: '4-3-3-3/m90/r(h7)/r(h5)*', tiles, density: 0.56 } },
    { name: 'Flips: florets', spec: { rule: '6-3-3-0,3,3-0,3-0,3/r60/r(h7)*', tiles, density: 0.56 } },
    { name: 'Half turns', spec: { rule: '6-3-6/m30/r(v4)*', tiles, density: 0.6 } },
    { name: 'Fixed hints', spec: { rule: '4-4-0,4/r90/m(v2)', tiles, density: 0.6, fixed: 0.25 } },
  ]),
];
export const LAB_LEVELS = lab.length;
export function labLevel(n: number): LevelDef & { name: string } {
  const l = lab[(n - 1) % lab.length];
  return { ref: { mode: 'lab', level: n }, name: l.name, seed: hashSeed(`loop:lab:${n}`), palette: chapters[3].palette, spec: l.spec };
}

export function levelDef(ref: LevelRef): LevelDef {
  if (ref.mode === 'lab') return labLevel(ref.level ?? 1);
  if (ref.mode === 'daily') return dailyLevel(ref.date);
  if (ref.mode === 'endless') return endlessLevel(ref.level ?? 1);
  return campaignLevel(ref.chapter ?? 1, ref.level ?? 1);
}
