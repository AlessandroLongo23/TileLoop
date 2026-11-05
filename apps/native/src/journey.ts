/** The campaign level played most recently, so the map can pull its camera back out from it. */
export const lastPlayed: { chapter: number; level: number } | { chapter: null; level: null } = { chapter: null, level: null };

export function setLastPlayed(chapter: number, level: number): void {
  Object.assign(lastPlayed, { chapter, level });
}
