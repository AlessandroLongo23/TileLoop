import { writable } from 'svelte/store';

// Campaign configuration
export const CHAPTERS_COUNT = 10;
export const LEVELS_PER_CHAPTER = 15;

// Default campaign progress structure
function createDefaultProgress() {
	const progress = {};
	for (let chapter = 1; chapter <= CHAPTERS_COUNT; chapter++) {
		progress[chapter] = {};
		for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
			progress[chapter][level] = {
				completed: false,
				stars: 0, // 0-3 stars based on performance
				bestTime: null,
				bestMoves: null
			};
		}
	}
	// Unlock first level of first chapter
	progress[1][1].unlocked = true;
	
	// For demo purposes, unlock and complete a few levels
	for (let i = 1; i <= 5; i++) {
		progress[1][i].unlocked = true;
		if (i <= 3) {
			progress[1][i].completed = true;
			progress[1][i].stars = Math.floor(Math.random() * 3) + 1;
		}
	}
	
	return progress;
}

// Load progress from localStorage or create default
function loadCampaignProgress() {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('tileloop-campaign-progress');
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch (e) {
				console.warn('Failed to parse campaign progress, using default');
			}
		}
	}
	return createDefaultProgress();
}

// Create the store
export const campaignProgress = writable(loadCampaignProgress());

// Subscribe to changes and save to localStorage
if (typeof window !== 'undefined') {
	campaignProgress.subscribe(progress => {
		localStorage.setItem('tileloop-campaign-progress', JSON.stringify(progress));
	});
}

// Helper functions
export function isLevelUnlocked(chapter, level) {
	if (typeof window === 'undefined') return false;
	
	const progress = loadCampaignProgress();
	
	if (chapter === 1 && level === 1) {
		return true;
	} else if (level === 1) {
		// First level of chapter is unlocked if previous chapter is completed
		return isChapterCompleted(chapter - 1);
	} else {
		// Level is unlocked if previous level is completed
		return progress[chapter]?.[level - 1]?.completed || false;
	}
}

export function isChapterCompleted(chapter) {
	if (typeof window === 'undefined') return false;
	
	const progress = loadCampaignProgress();
	if (progress[chapter]) {
		return Object.values(progress[chapter]).every(level => level.completed);
	}
	return false;
}

export function isChapterUnlocked(chapter) {
	if (chapter === 1) return true;
	return isChapterCompleted(chapter - 1);
}

export function completeLevel(chapter, level, stats = {}) {
	campaignProgress.update(progress => {
		if (progress[chapter] && progress[chapter][level]) {
			progress[chapter][level].completed = true;
			
			// Update stats if provided
			if (stats.time && (!progress[chapter][level].bestTime || stats.time < progress[chapter][level].bestTime)) {
				progress[chapter][level].bestTime = stats.time;
			}
			if (stats.moves && (!progress[chapter][level].bestMoves || stats.moves < progress[chapter][level].bestMoves)) {
				progress[chapter][level].bestMoves = stats.moves;
			}
			if (stats.stars) {
				progress[chapter][level].stars = Math.max(progress[chapter][level].stars, stats.stars);
			}
			
			// Unlock next level
			if (level < LEVELS_PER_CHAPTER) {
				progress[chapter][level + 1].unlocked = true;
			} else if (chapter < CHAPTERS_COUNT) {
				// Unlock first level of next chapter
				progress[chapter + 1][1].unlocked = true;
			}
		}
		return progress;
	});
}

export function getLevelProgress(chapter, level) {
	if (typeof window === 'undefined') return null;
	
	const progress = loadCampaignProgress();
	return progress[chapter]?.[level] || null;
}

export function getChapterProgress(chapter) {
	if (typeof window === 'undefined') return null;
	
	const progress = loadCampaignProgress();
	return progress[chapter] || null;
} 