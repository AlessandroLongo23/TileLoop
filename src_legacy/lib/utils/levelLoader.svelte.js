import { Level } from '$lib/classes/Level.svelte';
import { Vector } from '$lib/classes/Vector.svelte';

/**
 * Loads a level from exported JSON data
 * @param {Object} levelData - The exported level JSON data
 * @param {number} width - Target screen width
 * @param {number} height - Target screen height
 * @returns {Level} - Constructed level instance
 */
export function loadLevelFromJSON(levelData, width, height) {
    try {
        // Validate the level data structure
        if (!levelData.tiling || !levelData.tiles) {
            throw new Error('Invalid level data: missing tiling or tiles');
        }

        // Create a new Level instance with the original tiling
        const level = new Level(
            levelData.tiling.rulestring, 
            levelData.tiling.transformSteps,
            width, 
            height
        );

        // If the level doesn't generate the same tiles, we need to reconstruct manually
        if (level.tiling.nodes.length !== levelData.tiles.length) {
            console.warn('Generated level doesn\'t match exported data, reconstructing...');
            return reconstructLevelFromData(levelData, width, height);
        }

        // Update connections to match the exported level
        const tileMap = new Map();
        levelData.tiles.forEach(tileData => {
            tileMap.set(tileData.id, tileData);
        });

        for (const node of level.tiling.nodes) {
            const tileData = tileMap.get(node.id);
            if (tileData) {
                // Update connections for each halfway point
                for (let i = 0; i < node.halfways.length; i++) {
                    if (tileData.connections[i]) {
                        node.halfways[i].connections = tileData.connections[i].connections;
                    }
                }
            }
        }

        // Don't shuffle - keep the designed connections
        level.minMovesToSolve = calculateMinMovesToSolve(level);
        
        return level;

    } catch (error) {
        console.error('Failed to load level from JSON:', error);
        throw error;
    }
}

/**
 * Reconstructs a level when the generated level doesn't match exported data
 * @param {Object} levelData - The exported level JSON data
 * @param {number} width - Target screen width
 * @param {number} height - Target screen height
 * @returns {Level} - Reconstructed level instance
 */
function reconstructLevelFromData(levelData, width, height) {
    // This is a more complex reconstruction for cases where
    // the level generation doesn't exactly match
    console.warn('Level reconstruction not fully implemented yet');
    
    // For now, create a basic level and warn the user
    const level = new Level(
        levelData.tiling.rulestring, 
        levelData.tiling.transformSteps,
        width, 
        height
    );
    
    console.warn('Loaded level may not match exactly. Consider using the same tiling configuration.');
    return level;
}

/**
 * Calculates minimum moves to solve based on current connections
 * @param {Level} level - The level instance
 * @returns {number} - Estimated minimum moves to solve
 */
function calculateMinMovesToSolve(level) {
    let minMoves = 0;
    
    for (const node of level.tiling.nodes) {
        // Simple estimation: assume each tile needs some rotations
        // This could be improved with actual pathfinding logic
        const hasConnections = node.halfways.some(h => h.connections > 0);
        if (hasConnections) {
            minMoves += Math.floor(Math.random() * node.n); // Random estimation
        }
    }
    
    return Math.max(1, minMoves);
}

/**
 * Validates level JSON structure
 * @param {Object} levelData - The level data to validate
 * @returns {boolean} - Whether the level data is valid
 */
export function validateLevelData(levelData) {
    if (!levelData || typeof levelData !== 'object') {
        return false;
    }

    // Check required top-level properties
    const requiredProps = ['metadata', 'tiling', 'dimensions', 'tiles'];
    for (const prop of requiredProps) {
        if (!levelData[prop]) {
            console.error(`Missing required property: ${prop}`);
            return false;
        }
    }

    // Check tiling structure
    if (!levelData.tiling.rulestring) {
        console.error('Missing tiling.rulestring');
        return false;
    }

    // Check tiles array
    if (!Array.isArray(levelData.tiles)) {
        console.error('tiles must be an array');
        return false;
    }

    // Validate each tile
    for (const tile of levelData.tiles) {
        if (!tile.id || typeof tile.position !== 'object' || !Array.isArray(tile.connections)) {
            console.error('Invalid tile structure:', tile);
            return false;
        }
    }

    return true;
}

/**
 * Creates a preview of level statistics
 * @param {Object} levelData - The level data
 * @returns {Object} - Level statistics
 */
export function getLevelStats(levelData) {
    if (!validateLevelData(levelData)) {
        return null;
    }

    const stats = {
        name: levelData.metadata.name || 'Unnamed Level',
        description: levelData.metadata.description || '',
        tileCount: levelData.tiles.length,
        tilingType: levelData.tiling.name || 'Custom',
        rulestring: levelData.tiling.rulestring,
        created: levelData.metadata.created,
        totalConnections: 0,
        connectionsByType: { 0: 0, 1: 0, 2: 0 }
    };

    // Count connections
    for (const tile of levelData.tiles) {
        for (const connection of tile.connections) {
            const count = connection.connections || 0;
            stats.totalConnections += count;
            stats.connectionsByType[count]++;
        }
    }

    return stats;
} 