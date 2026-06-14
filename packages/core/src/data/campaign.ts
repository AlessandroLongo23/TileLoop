export const CHAPTERS_COUNT = 10;
export const LEVELS_PER_CHAPTER = 15;

export interface LevelProgress {
  completed: boolean;
  unlocked: boolean;
  stars: number;
  bestTime: number | null;
  bestMoves: number | null;
  attempts: number;
  dateCompleted: string | null;
}

export type CampaignProgress = Record<number, Record<number, LevelProgress>>;

/** Fresh campaign progress: only level 1-1 unlocked. */
export function createDefaultCampaignProgress(): CampaignProgress {
  const progress: CampaignProgress = {};
  for (let chapter = 1; chapter <= CHAPTERS_COUNT; chapter++) {
    progress[chapter] = {};
    for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
      progress[chapter][level] = {
        completed: false,
        unlocked: chapter === 1 && level === 1,
        stars: 0,
        bestTime: null,
        bestMoves: null,
        attempts: 0,
        dateCompleted: null,
      };
    }
  }
  return progress;
}
