import { createPersistedStore } from '../state/persist';
import { chapters, levelsIn, SECTION_GATE, SECTION_LEVELS, todayKey, type LevelRef, type Opened } from './levels';

export interface LevelRecord {
  stars: number;
  best: number;
}

export interface Progress {
  campaign: Record<string, LevelRecord>;
  daily: { streak: number; last: string | null; done: string[] };
  endless: { level: number };
  /** Intro cards already shown (chapter * 100 + section). */
  seenIntros: number[];
}

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  /** Day, night, or whatever the phone uses. */
  theme?: 'system' | 'day' | 'night';
}

export const progressStore = createPersistedStore<Progress>('loop-progress', {
  campaign: {},
  daily: { streak: 0, last: null, done: [] },
  endless: { level: 1 },
  seenIntros: [],
});

export const settingsStore = createPersistedStore<Settings>('loop-settings', {
  sound: true,
  music: true,
  haptics: true,
  theme: 'system',
});

export const persistedGameStores = [progressStore, settingsStore];

const levelKey = (chapter: number, level: number) => `${chapter}-${level}`;

export function levelRecord(p: Progress, chapter: number, level: number): LevelRecord | undefined {
  return p.campaign[levelKey(chapter, level)];
}

export function chapterStars(p: Progress, chapter: number): number {
  let s = 0;
  for (let l = 1; l <= levelsIn(chapter); l++) s += levelRecord(p, chapter, l)?.stars ?? 0;
  return s;
}

export function chapterDone(p: Progress, chapter: number): number {
  let s = 0;
  for (let l = 1; l <= levelsIn(chapter); l++) if (levelRecord(p, chapter, l)) s++;
  return s;
}

/** Dots earned in one section (0-based) of a chapter. */
export function sectionStars(p: Progress, chapter: number, section: number): number {
  let s = 0;
  for (let i = 1; i <= SECTION_LEVELS; i++) s += levelRecord(p, chapter, section * SECTION_LEVELS + i)?.stars ?? 0;
  return s;
}

/** A section opens with its chapter (the first) or once the section before it gave enough dots. */
export function sectionOpen(p: Progress, chapter: number, section: number): boolean {
  if (!chapterUnlocked(p, chapter)) return false;
  return section === 0 || sectionStars(p, chapter, section - 1) >= SECTION_GATE;
}

/** The sections a player has opened, which Endless and the Daily draw from. */
export const openedBy = (p: Progress): Opened => (chapter, section) => sectionOpen(p, chapter, section);

/** A chapter opens once the one before it is through: its last section gave enough dots. */
export function chapterUnlocked(p: Progress, chapter: number): boolean {
  if (chapter === 1) return true;
  const prev = chapters[chapter - 2];
  return chapterUnlocked(p, prev.id) && sectionStars(p, prev.id, prev.sections.length - 1) >= SECTION_GATE;
}

/** Levels open one after another; on the journey, a section's first level waits for its gate. */
export function levelUnlocked(p: Progress, chapter: number, level: number): boolean {
  if (!chapterUnlocked(p, chapter)) return false;
  const i = (level - 1) % SECTION_LEVELS;
  if (!sectionOpen(p, chapter, Math.floor((level - 1) / SECTION_LEVELS))) return false;
  return i === 0 || !!levelRecord(p, chapter, level - 1);
}

/** The level a "Play" button should open: the first unsolved one that is open. */
export function nextCampaignLevel(p: Progress): { chapter: number; level: number } {
  // when a gate holds everything back, the open level with the most dots still to win (latest first)
  let replay = { chapter: 1, level: 1 };
  let least = 4;
  for (const ch of chapters)
    for (let l = 1; l <= levelsIn(ch.id); l++) {
      if (!levelUnlocked(p, ch.id, l)) continue;
      const stars = levelRecord(p, ch.id, l)?.stars ?? 0;
      if (!stars) return { chapter: ch.id, level: l };
      if (stars <= least) {
        least = stars;
        replay = { chapter: ch.id, level: l };
      }
    }
  return replay;
}

/** Record a solve. Returns the stars kept for the level (the best so far). */
export function recordSolve(ref: LevelRef, moves: number, stars: number): void {
  progressStore.getState().update((p) => {
    const next: Progress = { ...p, campaign: { ...p.campaign } };
    if (ref.mode === 'campaign') {
      const k = levelKey(ref.chapter!, ref.level!);
      const old = p.campaign[k];
      next.campaign[k] = {
        stars: Math.max(old?.stars ?? 0, stars),
        best: Math.min(old?.best ?? Infinity, moves),
      };
    } else if (ref.mode === 'endless') {
      next.endless = { level: Math.max(p.endless.level, (ref.level ?? 1) + 1) };
    } else if (ref.mode === 'daily' && ref.date && !p.daily.done.includes(ref.date)) {
      const yesterday = todayKey(new Date(new Date(`${ref.date}T12:00:00`).getTime() - 86400000));
      next.daily = {
        streak: p.daily.last === yesterday ? p.daily.streak + 1 : 1,
        last: ref.date,
        done: [...p.daily.done, ref.date].slice(-60),
      };
    }
    return next;
  });
}

export function markIntroSeen(key: number): void {
  progressStore.getState().update((p) => (p.seenIntros.includes(key) ? p : { ...p, seenIntros: [...p.seenIntros, key] }));
}

/** The streak as it stands today: it breaks if yesterday was missed. */
export function currentStreak(p: Progress, today = todayKey()): number {
  if (!p.daily.last) return 0;
  const yesterday = todayKey(new Date(new Date(`${today}T12:00:00`).getTime() - 86400000));
  return p.daily.last === today || p.daily.last === yesterday ? p.daily.streak : 0;
}
