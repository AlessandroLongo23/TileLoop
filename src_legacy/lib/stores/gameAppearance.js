import { objectStore } from 'svelte-capacitor-store';

// Game Appearance Store - for storing player visual preferences
export const gameAppearance = objectStore({
	storeName: 'tileloop-appearance',
	initialValue: {
		// Global theme settings
		theme: 'auto', // auto, light, dark, retro
		
		// Shape-specific tileset preferences
		shapeStyles: {
			triangle: {
				tileset: 'loop', // loop, flow, tech
				colorVariant: 'default', // default, accent, muted
			},
			square: {
				tileset: 'loop',
				colorVariant: 'default',
			},
			hexagon: {
				tileset: 'loop',
				colorVariant: 'default',
			}
		},
		
		// Global tile appearance settings
		tileSettings: {
			animateRotation: true,
			highlightCompleted: true,
			connectionWidth: 'medium', // thin, medium, thick
			// shadowEnabled: true,
			// glowEffect: false
		},
		
		// UI preferences
		uiPreferences: {
			showGrid: false,
			gridOpacity: 0.3,
			showTileNumbers: false,
			showDifficulty: true,
			compactMode: false
		}
	},
	persist: true,
	browserStorage: 'indexedDB',
	validationStatement: (value) => {
		if (!value || typeof value !== 'object') return false;
		
		// Validate theme settings
		if (!value.theme || typeof value.theme !== 'string') return false;
		
		// Validate shape styles structure
		if (!value.shapeStyles || typeof value.shapeStyles !== 'object') return false;
		const requiredShapes = ['triangle', 'square', 'hexagon'];
		
		for (const shape of requiredShapes) {
			if (!value.shapeStyles[shape] || typeof value.shapeStyles[shape] !== 'object') return false;
			const shapeStyle = value.shapeStyles[shape];
			
			if (typeof shapeStyle.tileset !== 'string') return false;
			if (typeof shapeStyle.colorVariant !== 'string') return false;
		}
		
		// Validate tile settings
		if (!value.tileSettings || typeof value.tileSettings !== 'object') return false;
		if (typeof value.tileSettings.animateRotation !== 'boolean') return false;
		if (typeof value.tileSettings.highlightCompleted !== 'boolean') return false;
		
		// Validate UI preferences
		if (!value.uiPreferences || typeof value.uiPreferences !== 'object') return false;
		if (typeof value.uiPreferences.showGrid !== 'boolean') return false;
		if (typeof value.uiPreferences.compactMode !== 'boolean') return false;
		
		return true;
	},
	initFunction: async (currentValue, oldValue, set, reset) => {
		// Migration logic if needed in the future
		if (!currentValue && typeof window !== 'undefined') {
			// Check for any old appearance settings in localStorage
			const oldAppearance = localStorage.getItem('tileloop-appearance');
			if (oldAppearance) {
				try {
					const parsed = JSON.parse(oldAppearance);
					// Merge with default structure to ensure all properties exist
					const defaultAppearance = {
						theme: 'default',
						shapeStyles: {
							triangle: { tileset: 'loop', colorVariant: 'default' },
							square: { tileset: 'loop', colorVariant: 'default' },
							hexagon: { tileset: 'loop', colorVariant: 'default' }
						},
						tileSettings: {
							animateRotation: true,
							highlightCompleted: true,
							connectionWidth: 'medium',
						},
						uiPreferences: {
							showGrid: false,
							gridOpacity: 0.3,
							showTileNumbers: false,
							showDifficulty: true,
							compactMode: false
						}
					};
					
					const migratedAppearance = { ...defaultAppearance, ...parsed };
					set(migratedAppearance);
					// Clean up old localStorage
					localStorage.removeItem('tileloop-appearance');
				} catch (e) {
					console.warn('Failed to migrate old appearance settings:', e);
				}
			}
		}
	}
});

// Helper functions for appearance management
export function updateShapeStyle(shape, styleUpdates) {
	gameAppearance.update(current => ({
		...current,
		shapeStyles: {
			...current.shapeStyles,
			[shape]: {
				...current.shapeStyles[shape],
				...styleUpdates
			}
		}
	}));
}

export function resetShapeStyles() {
	gameAppearance.update(current => ({
		...current,
		shapeStyles: {
			triangle: { tileset: 'loop', colorVariant: 'default' },
			square: { tileset: 'loop', colorVariant: 'default' },
			hexagon: { tileset: 'loop', colorVariant: 'default' }
		}
	}));
}

export function updateUIPreferences(uiSettings) {
	gameAppearance.update(current => ({
		...current,
		uiPreferences: {
			...current.uiPreferences,
			...uiSettings
		}
	}));
} 