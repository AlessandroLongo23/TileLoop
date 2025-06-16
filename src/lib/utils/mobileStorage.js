import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Storage adapter for mobile platforms
export class MobileStorageAdapter {
	constructor() {
		this.isNative = Capacitor.isNativePlatform();
		this.isInitialized = false;
	}

	async initialize() {
		if (this.isInitialized) return;
		
		if (this.isNative) {
			// On native platforms, ensure Preferences plugin is available
			try {
				await Preferences.configure({
					group: 'TileLoopGame'
				});
				console.log('Mobile storage initialized with Capacitor Preferences');
			} catch (error) {
				console.warn('Failed to configure Preferences plugin:', error);
				// Fallback to localStorage if available
				this.isNative = false;
			}
		}
		
		this.isInitialized = true;
	}

	async getItem(key) {
		await this.initialize();
		
		if (this.isNative) {
			try {
				const result = await Preferences.get({ key });
				return result.value;
			} catch (error) {
				console.error('Failed to get item from mobile storage:', error);
				return null;
			}
		} else {
			// Fallback to localStorage
			try {
				return localStorage.getItem(key);
			} catch (error) {
				console.error('Failed to get item from localStorage:', error);
				return null;
			}
		}
	}

	async setItem(key, value) {
		await this.initialize();
		
		if (this.isNative) {
			try {
				await Preferences.set({ key, value });
				return true;
			} catch (error) {
				console.error('Failed to set item in mobile storage:', error);
				return false;
			}
		} else {
			// Fallback to localStorage
			try {
				localStorage.setItem(key, value);
				return true;
			} catch (error) {
				console.error('Failed to set item in localStorage:', error);
				return false;
			}
		}
	}

	async removeItem(key) {
		await this.initialize();
		
		if (this.isNative) {
			try {
				await Preferences.remove({ key });
				return true;
			} catch (error) {
				console.error('Failed to remove item from mobile storage:', error);
				return false;
			}
		} else {
			// Fallback to localStorage
			try {
				localStorage.removeItem(key);
				return true;
			} catch (error) {
				console.error('Failed to remove item from localStorage:', error);
				return false;
			}
		}
	}

	async clear() {
		await this.initialize();
		
		if (this.isNative) {
			try {
				await Preferences.clear();
				return true;
			} catch (error) {
				console.error('Failed to clear mobile storage:', error);
				return false;
			}
		} else {
			// Fallback to localStorage
			try {
				localStorage.clear();
				return true;
			} catch (error) {
				console.error('Failed to clear localStorage:', error);
				return false;
			}
		}
	}

	async getAllKeys() {
		await this.initialize();
		
		if (this.isNative) {
			try {
				const result = await Preferences.keys();
				return result.keys || [];
			} catch (error) {
				console.error('Failed to get keys from mobile storage:', error);
				return [];
			}
		} else {
			// Fallback to localStorage
			try {
				return Object.keys(localStorage);
			} catch (error) {
				console.error('Failed to get keys from localStorage:', error);
				return [];
			}
		}
	}
}

// Create singleton instance
export const mobileStorage = new MobileStorageAdapter();

// Enhanced storage functions with automatic JSON serialization
export const storage = {
	async get(key) {
		const value = await mobileStorage.getItem(key);
		if (value === null) return null;
		
		try {
			return JSON.parse(value);
		} catch (error) {
			// Return as string if not valid JSON
			return value;
		}
	},

	async set(key, value) {
		const serialized = typeof value === 'string' ? value : JSON.stringify(value);
		return await mobileStorage.setItem(key, serialized);
	},

	async remove(key) {
		return await mobileStorage.removeItem(key);
	},

	async clear() {
		return await mobileStorage.clear();
	},

	async keys() {
		return await mobileStorage.getAllKeys();
	}
};

// Migration utility for existing localStorage data
export async function migrateLocalStorageToMobile() {
	if (!Capacitor.isNativePlatform() || typeof window === 'undefined') {
		return;
	}

	console.log('Migrating localStorage data to mobile storage...');

	const prefix = 'tileloop-';
	const keysToMigrate = [];
	
	// Find all TileLoop keys in localStorage
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(prefix)) {
				keysToMigrate.push(key);
			}
		}
	} catch (error) {
		console.warn('Could not access localStorage for migration:', error);
		return;
	}

	// Migrate each key
	for (const key of keysToMigrate) {
		try {
			const value = localStorage.getItem(key);
			if (value) {
				await storage.set(key, value);
				console.log(`Migrated ${key} to mobile storage`);
			}
		} catch (error) {
			console.error(`Failed to migrate ${key}:`, error);
		}
	}

	// Clear migrated data from localStorage after successful migration
	if (keysToMigrate.length > 0) {
		try {
			for (const key of keysToMigrate) {
				localStorage.removeItem(key);
			}
			console.log(`Migration complete. Cleaned up ${keysToMigrate.length} keys from localStorage.`);
		} catch (error) {
			console.warn('Could not clean up localStorage after migration:', error);
		}
	}
} 