import { objectStore, variableStore, arrayStore } from 'svelte-capacitor-store';
import { storage, migrateLocalStorageToMobile } from '$lib/utils/mobileStorage.js';

// Campaign configuration
export const CHAPTERS_COUNT = 10;
export const LEVELS_PER_CHAPTER = 15;

// Default campaign progress structure
function createDefaultCampaignProgress() {
	const progress = {};
	for (let chapter = 1; chapter <= CHAPTERS_COUNT; chapter++) {
		progress[chapter] = {};
		for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
			progress[chapter][level] = {
				completed: false,
				unlocked: chapter === 1 && level === 1, // Only first level starts unlocked
				stars: 0, // 0-3 stars based on performance
				bestTime: null,
				bestMoves: null,
				attempts: 0,
				dateCompleted: null
			};
		}
	}
	return progress;
}

// Campaign Progress Store
export const campaignProgress = objectStore({
	storeName: 'tileloop-campaign-progress',
	initialValue: createDefaultCampaignProgress(),
	persist: true,
	browserStorage: 'indexedDB', // Better performance than localStorage
	validationStatement: (value) => {
		// Validate structure
		if (!value || typeof value !== 'object') return false;
		
		// Check that all chapters exist and have proper structure
		for (let chapter = 1; chapter <= CHAPTERS_COUNT; chapter++) {
			if (!value[chapter] || typeof value[chapter] !== 'object') return false;
			
			for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
				const levelData = value[chapter][level];
				if (!levelData || typeof levelData !== 'object') return false;
				
				// Required properties validation
				if (typeof levelData.completed !== 'boolean') return false;
				if (typeof levelData.unlocked !== 'boolean') return false;
				if (typeof levelData.stars !== 'number' || levelData.stars < 0 || levelData.stars > 3) return false;
				if (typeof levelData.attempts !== 'number' || levelData.attempts < 0) return false;
			}
		}
		return true;
	},
	initFunction: async (currentValue, oldValue, set, reset) => {
		// Migrate from old localStorage format if needed
		if (!currentValue && typeof window !== 'undefined') {
			const oldData = localStorage.getItem('tileloop-campaign-progress');
			if (oldData) {
				try {
					const parsed = JSON.parse(oldData);
					// Merge with default structure to ensure all properties exist
					const defaultProgress = createDefaultCampaignProgress();
					const migratedProgress = { ...defaultProgress };
					
					// Copy over existing data
					Object.keys(parsed).forEach(chapter => {
						if (migratedProgress[chapter]) {
							Object.keys(parsed[chapter]).forEach(level => {
								if (migratedProgress[chapter][level]) {
									migratedProgress[chapter][level] = {
										...migratedProgress[chapter][level],
										...parsed[chapter][level]
									};
								}
							});
						}
					});
					
					set(migratedProgress);
					// Clean up old localStorage
					localStorage.removeItem('tileloop-campaign-progress');
				} catch (e) {
					console.warn('Failed to migrate old campaign progress:', e);
				}
			}
		}
	}
});

// Current Game State Store (for saving mid-game progress)
export const currentGameState = objectStore({
	storeName: 'tileloop-current-game',
	initialValue: null,
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		if (value === null) return true; // Allow null (no active game)
		
		if (typeof value !== 'object') return false;
		
		// Required fields for active game state
		const requiredFields = ['gameMode', 'levelId', 'timer', 'moves', 'startTime'];
		return requiredFields.every(field => value.hasOwnProperty(field));
	}
});

// Game Mode Progress Stores
export const zenModeProgress = objectStore({
	storeName: 'tileloop-zen-progress',
	initialValue: {
		highestLevel: 0, // 0 means no levels completed yet, so current level = 1
		totalLevelsCompleted: 0,
		totalPlayTime: 0,
		preferences: {
			autoSave: true,
			showHints: true
		}
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		return value && 
		       typeof value.highestLevel === 'number' && 
		       typeof value.totalLevelsCompleted === 'number' &&
		       typeof value.totalPlayTime === 'number' &&
		       value.preferences && typeof value.preferences === 'object';
	}
});

export const timeAttackProgress = objectStore({
	storeName: 'tileloop-timeattack-progress',
	initialValue: {
		highestLevel: 0, // 0 means no levels completed yet, so current level = 1
		bestTimes: {}, // level -> best time in seconds
		totalLevelsCompleted: 0,
		averageTime: 0
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		return value && 
		       typeof value.highestLevel === 'number' && 
		       typeof value.totalLevelsCompleted === 'number' &&
		       typeof value.averageTime === 'number' &&
		       typeof value.bestTimes === 'object';
	}
});

export const precisionModeProgress = objectStore({
	storeName: 'tileloop-precision-progress',
	initialValue: {
		highestLevel: 0, // 0 means no levels completed yet, so current level = 1
		bestMoves: {}, // level -> minimum moves
		totalLevelsCompleted: 0,
		averageMoves: 0,
		perfectGames: 0 // levels completed with optimal moves
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		return value && 
		       typeof value.highestLevel === 'number' && 
		       typeof value.totalLevelsCompleted === 'number' &&
		       typeof value.averageMoves === 'number' &&
		       typeof value.perfectGames === 'number' &&
		       typeof value.bestMoves === 'object';
	}
});

// Game Settings Store
export const gameSettings = objectStore({
	storeName: 'tileloop-settings',
	initialValue: {
		soundEnabled: true,
		musicEnabled: true,
		vibrationEnabled: true,
		darkTheme: true,
		autoSave: true,
		showAnimations: true,
		difficulty: 'normal', // easy, normal, hard
		language: 'en'
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		return value && typeof value === 'object' &&
		       typeof value.soundEnabled === 'boolean' &&
		       typeof value.musicEnabled === 'boolean' &&
		       typeof value.darkTheme === 'boolean' &&
		       typeof value.autoSave === 'boolean';
	}
});

// Game Statistics Store
export const gameStats = objectStore({
	storeName: 'tileloop-statistics',
	initialValue: {
		totalPlayTime: 0,
		totalLevelsCompleted: 0,
		totalMoves: 0,
		averageMovesPerLevel: 0,
		preferredGameMode: 'campaign',
		streakCount: 0,
		longestStreak: 0,
		firstPlayDate: null,
		lastPlayDate: null
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		return value && 
		       typeof value.totalPlayTime === 'number' &&
		       typeof value.totalLevelsCompleted === 'number' &&
		       typeof value.totalMoves === 'number';
	}
});

// Current Game Session Store (for tracking active game without URL params)
export const currentGameSession = objectStore({
	storeName: 'tileloop-current-session',
	initialValue: {
		gameMode: 'campaign',
		chapter: 1,
		level: 1,
		isActive: false
	},
	persist: false, // Don't persist - this is session-only
	validationStatement: (value) => {
		return value && 
		       typeof value.gameMode === 'string' &&
		       typeof value.chapter === 'number' &&
		       typeof value.level === 'number' &&
		       typeof value.isActive === 'boolean';
	}
});

// Helper Functions
export function isLevelUnlocked(chapter, level) {
	const progress = campaignProgress.get();
	if (!progress || !progress[chapter] || !progress[chapter][level]) return false;
	
	return progress[chapter][level].unlocked;
}

export function isChapterCompleted(chapter) {
	const progress = campaignProgress.get();
	if (!progress || !progress[chapter]) return false;
	
	return Object.values(progress[chapter]).every(level => level.completed);
}

export function isChapterUnlocked(chapter) {
	if (chapter === 1) return true;
	return isChapterCompleted(chapter - 1);
}

export async function completeLevel(chapter, level, stats = {}) {
	campaignProgress.update(progress => {
		if (progress[chapter] && progress[chapter][level]) {
			const levelData = progress[chapter][level];
			
			// Mark as completed
			levelData.completed = true;
			levelData.attempts += 1;
			levelData.dateCompleted = new Date().toISOString();
			
			// Update stats if provided and better than previous
			if (stats.time && (!levelData.bestTime || stats.time < levelData.bestTime)) {
				levelData.bestTime = stats.time;
			}
			if (stats.moves && (!levelData.bestMoves || stats.moves < levelData.bestMoves)) {
				levelData.bestMoves = stats.moves;
			}
			if (stats.stars && stats.stars > levelData.stars) {
				levelData.stars = stats.stars;
			}
			
			// Unlock next level
			if (level < LEVELS_PER_CHAPTER && progress[chapter][level + 1]) {
				progress[chapter][level + 1].unlocked = true;
			} else if (chapter < CHAPTERS_COUNT && progress[chapter + 1] && progress[chapter + 1][1]) {
				// Unlock first level of next chapter
				progress[chapter + 1][1].unlocked = true;
			}
		}
		return progress;
	});
	
	// Update global stats
	updateGlobalStats(stats);
	
	// Immediately save progress after level completion
	try {
		await saveAllProgress();
		console.log('Progress saved after level completion');
	} catch (error) {
		console.error('Failed to save progress after level completion:', error);
	}
}

export function saveCurrentGameState(gameData) {
	currentGameState.set({
		...gameData,
		saveTime: new Date().toISOString()
	});
}

export function clearCurrentGameState() {
	currentGameState.set(null);
}

export function updateGameModeProgress(mode, levelData) {
	switch (mode) {
		case 'zen':
			zenModeProgress.update(progress => {
				if (levelData.completed && levelData.level >= progress.highestLevel) {
					progress.highestLevel = levelData.level;
					progress.totalLevelsCompleted += 1;
				}
				if (levelData.playTime) {
					progress.totalPlayTime += levelData.playTime;
				}
				return progress;
			});
			break;
			
		case 'timeattack':
			timeAttackProgress.update(progress => {
				if (levelData.completed && levelData.level >= progress.highestLevel) {
					progress.highestLevel = levelData.level;
					progress.totalLevelsCompleted += 1;
					if (levelData.time && (!progress.bestTimes[levelData.level] || levelData.time < progress.bestTimes[levelData.level])) {
						progress.bestTimes[levelData.level] = levelData.time;
					}
					// Update average time
					const totalTime = Object.values(progress.bestTimes).reduce((sum, time) => sum + time, 0);
					progress.averageTime = totalTime / progress.totalLevelsCompleted;
				}
				return progress;
			});
			break;
			
		case 'precision':
			precisionModeProgress.update(progress => {
				if (levelData.completed && levelData.level >= progress.highestLevel) {
					progress.highestLevel = levelData.level;
					progress.totalLevelsCompleted += 1;
					if (levelData.moves && (!progress.bestMoves[levelData.level] || levelData.moves < progress.bestMoves[levelData.level])) {
						progress.bestMoves[levelData.level] = levelData.moves;
					}
					// Check if it's a perfect game (optimal moves)
					if (levelData.isPerfect) {
						progress.perfectGames += 1;
					}
					// Update average moves
					const totalMoves = Object.values(progress.bestMoves).reduce((sum, moves) => sum + moves, 0);
					progress.averageMoves = totalMoves / progress.totalLevelsCompleted;
				}
				return progress;
			});
			break;
	}
}

function updateGlobalStats(gameData) {
	gameStats.update(stats => {
		const now = new Date().toISOString();
		
		if (!stats.firstPlayDate) {
			stats.firstPlayDate = now;
		}
		stats.lastPlayDate = now;
		
		if (gameData.completed) {
			stats.totalLevelsCompleted += 1;
		}
		if (gameData.moves) {
			stats.totalMoves += gameData.moves;
			stats.averageMovesPerLevel = stats.totalMoves / stats.totalLevelsCompleted;
		}
		if (gameData.playTime) {
			stats.totalPlayTime += gameData.playTime;
		}
		if (gameData.gameMode) {
			stats.preferredGameMode = gameData.gameMode;
		}
		
		return stats;
	});
}

// Initialize all stores
export async function initializeGameStores() {
	try {
		// First, migrate any existing localStorage data to mobile storage
		await migrateLocalStorageToMobile();
		
		// Then initialize all stores
		await Promise.all([
			campaignProgress.init(),
			currentGameState.init(),
			zenModeProgress.init(),
			timeAttackProgress.init(),
			precisionModeProgress.init(),
			gameSettings.init(),
			gameStats.init(),
			currentGameSession.init()
		]);
		
		console.log('Game stores initialized successfully');
		
		// Ensure mobile storage is working by testing it
		await testMobileStorage();
		
	} catch (error) {
		console.error('Failed to initialize game stores:', error);
		throw error;
	}
}

// Test mobile storage functionality
async function testMobileStorage() {
	try {
		const testKey = 'tileloop-storage-test';
		const testValue = { test: true, timestamp: Date.now() };
		
		// Test write
		await storage.set(testKey, testValue);
		console.log('Mobile storage write test: SUCCESS');
		
		// Test read
		const retrieved = await storage.get(testKey);
		if (retrieved && retrieved.test === true) {
			console.log('Mobile storage read test: SUCCESS');
		} else {
			throw new Error('Retrieved value does not match');
		}
		
		// Clean up test data
		await storage.remove(testKey);
		console.log('Mobile storage cleanup test: SUCCESS');
		
	} catch (error) {
		console.error('Mobile storage test failed:', error);
		// Don't throw here - let the app continue with fallback storage
	}
}

// Explicit save functions for critical game data
export async function saveAllProgress() {
	try {
		console.log('Saving all game progress...');
		
		// Get current state of all stores
		const progressData = {
			campaign: campaignProgress.get(),
			zenMode: zenModeProgress.get(),
			timeAttack: timeAttackProgress.get(),
			precisionMode: precisionModeProgress.get(),
			settings: gameSettings.get(),
			stats: gameStats.get(),
			currentGame: currentGameState.get(),
			timestamp: Date.now()
		};
		
		// Save to mobile storage as backup
		await storage.set('tileloop-backup-progress', progressData);
		console.log('Game progress saved successfully');
		
		return true;
	} catch (error) {
		console.error('Failed to save game progress:', error);
		return false;
	}
}

export async function loadBackupProgress() {
	try {
		console.log('Loading backup game progress...');
		
		const backupData = await storage.get('tileloop-backup-progress');
		if (!backupData) {
			console.log('No backup progress found');
			return false;
		}
		
		// Restore data to stores
		if (backupData.campaign) {
			campaignProgress.set(backupData.campaign);
		}
		if (backupData.zenMode) {
			zenModeProgress.set(backupData.zenMode);
		}
		if (backupData.timeAttack) {
			timeAttackProgress.set(backupData.timeAttack);
		}
		if (backupData.precisionMode) {
			precisionModeProgress.set(backupData.precisionMode);
		}
		if (backupData.settings) {
			gameSettings.set(backupData.settings);
		}
		if (backupData.stats) {
			gameStats.set(backupData.stats);
		}
		if (backupData.currentGame) {
			currentGameState.set(backupData.currentGame);
		}
		
		console.log('Backup progress loaded successfully');
		return true;
	} catch (error) {
		console.error('Failed to load backup progress:', error);
		return false;
	}
}

// Auto-save progress periodically and on key events
export function setupAutoSave() {
	// Save progress every 30 seconds
	setInterval(async () => {
		await saveAllProgress();
	}, 30000);
	
	// Save on page visibility change (when app goes to background)
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', async () => {
			if (document.visibilityState === 'hidden') {
				await saveAllProgress();
				console.log('Progress saved due to app going to background');
			}
		});
	}
	
	// Save on beforeunload (when app is closing)
	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', async () => {
			await saveAllProgress();
		});
		
		// Also save on page focus loss
		window.addEventListener('blur', async () => {
			await saveAllProgress();
			console.log('Progress saved due to window blur');
		});
	}
}

// Export legacy functions for backward compatibility
export function getLevelProgress(chapter, level) {
	const progress = campaignProgress.get();
	return progress?.[chapter]?.[level] || null;
}

export function getChapterProgress(chapter) {
	const progress = campaignProgress.get();
	return progress?.[chapter] || null;
}

// Helper functions to get current progress for each mode
export function getCurrentCampaignProgress() {
	const progress = campaignProgress.get();
	let currentChapter = 1;
	let currentLevel = 1;
	let totalCompleted = 0;
	let foundCurrentLevel = false;

	for (let chapter = 1; chapter <= CHAPTERS_COUNT && !foundCurrentLevel; chapter++) {
		for (let level = 1; level <= LEVELS_PER_CHAPTER; level++) {
			const levelData = progress?.[chapter]?.[level];
			if (levelData?.completed) {
				totalCompleted++;
			} else if (levelData?.unlocked && !levelData?.completed) {
				// Found the first unlocked but not completed level
				currentChapter = chapter;
				currentLevel = level;
				foundCurrentLevel = true;
				break;
			}
		}
	}

	// If no current level was found, all levels are completed
	// Return the last level as current (campaign finished)
	if (!foundCurrentLevel && totalCompleted > 0) {
		currentChapter = CHAPTERS_COUNT;
		currentLevel = LEVELS_PER_CHAPTER;
	}

	return {
		currentChapter,
		currentLevel,
		totalCompleted,
		totalLevels: CHAPTERS_COUNT * LEVELS_PER_CHAPTER,
		isCompleted: !foundCurrentLevel && totalCompleted === CHAPTERS_COUNT * LEVELS_PER_CHAPTER
	};
}

export function getCurrentModeProgress(mode) {
	switch (mode) {
		case 'zen':
			const zenProgress = zenModeProgress.get();
			return {
				currentLevel: zenProgress.highestLevel + 1, // Next level to play
				totalCompleted: zenProgress.totalLevelsCompleted,
				totalPlayTime: zenProgress.totalPlayTime
			};
		case 'timeattack':
			const timeProgress = timeAttackProgress.get();
			return {
				currentLevel: timeProgress.highestLevel + 1, // Next level to play
				totalCompleted: timeProgress.totalLevelsCompleted,
				averageTime: timeProgress.averageTime
			};
		case 'precision':
			const precisionProgress = precisionModeProgress.get();
			return {
				currentLevel: precisionProgress.highestLevel + 1, // Next level to play
				totalCompleted: precisionProgress.totalLevelsCompleted,
				averageMoves: precisionProgress.averageMoves,
				perfectGames: precisionProgress.perfectGames
			};
		default:
			return { currentLevel: 1, totalCompleted: 0 };
	}
}

// Game Session Management Functions
export function startGameSession(gameMode, chapter = null, level = null) {
	let sessionData = { gameMode, isActive: true };
	
	if (gameMode === 'campaign') {
		if (chapter && level) {
			// Use specified chapter/level
			sessionData.chapter = chapter;
			sessionData.level = level;
		} else {
			// Use current campaign progress
			const campaignCurrent = getCurrentCampaignProgress();
			sessionData.chapter = campaignCurrent.currentChapter;
			sessionData.level = campaignCurrent.currentLevel;
		}
	} else {
		// For other modes, use current progress
		const modeProgress = getCurrentModeProgress(gameMode);
		sessionData.chapter = 1; // Other modes don't use chapters
		sessionData.level = level || modeProgress.currentLevel;
	}
	
	currentGameSession.set(sessionData);
}

export function endGameSession() {
	currentGameSession.update(session => ({
		...session,
		isActive: false
	}));
}

export function advanceToNextLevel() {
	currentGameSession.update(session => {
		if (session.gameMode === 'campaign') {
			let nextChapter = session.chapter;
			let nextLevel = session.level + 1;
			
			// If we've reached the end of the chapter, move to next chapter
			if (nextLevel > LEVELS_PER_CHAPTER) {
				nextChapter++;
				nextLevel = 1;
			}
			
			// Check if we've completed all levels
			if (nextChapter > CHAPTERS_COUNT) {
				return { ...session, isActive: false }; // End campaign
			}
			
			return {
				...session,
				chapter: nextChapter,
				level: nextLevel
			};
		} else {
			// For other modes, just increment level
			return {
				...session,
				level: session.level + 1
			};
		}
	});
}

export function getCurrentSession() {
	return currentGameSession.get();
} 