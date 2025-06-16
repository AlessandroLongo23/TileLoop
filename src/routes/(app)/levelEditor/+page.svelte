<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { Download, Save, Trash2, RotateCcw, Shuffle, Upload } from 'lucide-svelte';
    
    import { Level } from '$lib/classes/Level.svelte';
    import { selectedTiling, transformSteps } from '$lib/stores/configuration.js';
    import { Vector } from '$lib/classes/Vector.svelte';
    import { isWithinTolerance } from '$lib/utils/math.svelte';
    import { loadLevelFromJSON, validateLevelData, getLevelStats } from '$lib/utils/levelLoader.svelte';
    
    import Sidebar from '$lib/components/Sidebar.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    import Tile from '$lib/components/Tile.svelte';

    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    
    let isSidebarOpen = $state(true);
    let sidebarElement = $state('');
    let sidebarWidth = $derived(isSidebarOpen ? 400 : 0);
    let renderWidth = $derived(width - sidebarWidth);
    let renderHeight = $derived(height - 120); // Account for header
    
    let level = $state(null);
    let renderTrigger = $state(0);
    let isEditorMode = $state(true);
    let levelName = $state('Custom Level');
    let levelDescription = $state('Created with Level Editor');
    
    // Editor specific states
    let selectedConnection = $state(1); // 0, 1, or 2 connections
    let showConnectionPoints = $state(true);
    let gridSnap = $state(true);
    
    // Track current tiling to detect changes without causing infinite loops
    let currentTilingRulestring = $state($selectedTiling?.rulestring || '');
    
    // Handle window resize
    onMount(() => {
        if (browser) {
            const handleResize = () => {
                width = window.innerWidth;
                height = window.innerHeight;
            };
            
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    });
    
    function generateNewLevel() {
        try {
            level = new Level($selectedTiling.rulestring, $transformSteps, renderWidth, renderHeight);
            // Don't shuffle the level - we want clean connections for editing
            resetAllConnections();
            currentTilingRulestring = $selectedTiling.rulestring;
            renderTrigger++;
        } catch (error) {
            console.error('Failed to generate level:', error);
        }
    }
    
    // Check for tiling changes manually to avoid infinite loops
    function checkForTilingChange() {
        if ($selectedTiling?.rulestring && $selectedTiling.rulestring !== currentTilingRulestring) {
            generateNewLevel();
        }
    }
    
    function resetAllConnections() {
        if (!level?.tiling?.nodes) return;
        
        // Reset all connections to 0
        for (const node of level.tiling.nodes) {
            for (const halfway of node.halfways) {
                halfway.connections = 0;
                halfway.matched = true; // Show as matched for clean display
            }
        }
        renderTrigger++;
    }
    
    function handleTileClick(event, node) {
        if (!isEditorMode) return;
        
        event.stopPropagation();
        
        // Get click position relative to tile center
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const clickX = event.clientX - centerX;
        const clickY = event.clientY - centerY;
        const clickPoint = new Vector(clickX, clickY);
        
        // Find closest halfway point
        let closestHalfway = null;
        let minDistance = Infinity;
        
        for (const halfway of node.halfways) {
            const halfwayScreen = Vector.sub(halfway, node.centroid);
            const scaledHalfway = Vector.scale(halfwayScreen, level.scale * 0.8);
            const distance = Vector.distance(clickPoint, scaledHalfway);
            
            if (distance < minDistance && distance < 30) { // 30px threshold
                minDistance = distance;
                closestHalfway = halfway;
            }
        }
        
        if (closestHalfway) {
            cycleConnection(closestHalfway);
        }
    }
    
    function cycleConnection(halfway) {
        // Cycle through 0 -> 1 -> 2 -> 0
        const currentConnections = halfway.connections || 0;
        const newConnections = (currentConnections + 1) % 3;
        
        // Update the halfway and its pair (if it exists)
        updateConnectionPair(halfway, newConnections);
        renderTrigger++;
    }
    
    function updateConnectionPair(targetHalfway, connections) {
        if (!level?.tiling?.nodes) return;
        
        // Find all halfways and their pairs
        let uniqueHalfways = [];
        for (const node of level.tiling.nodes) {
            for (const halfway of node.halfways) {
                if (!uniqueHalfways.some(h => isWithinTolerance(h.a, halfway))) {
                    uniqueHalfways.push({
                        a: halfway,
                        b: null
                    });
                } else {
                    const existing = uniqueHalfways.find(h => isWithinTolerance(h.a, halfway));
                    if (existing) existing.b = halfway;
                }
            }
        }
        
        // Update the target halfway and its pair
        const halfwayPair = uniqueHalfways.find(h => 
            isWithinTolerance(h.a, targetHalfway) || 
            (h.b && isWithinTolerance(h.b, targetHalfway))
        );
        
        if (halfwayPair) {
            halfwayPair.a.connections = connections;
            if (halfwayPair.b) {
                halfwayPair.b.connections = connections;
            }
            
            // Update matched status for visual feedback
            if (halfwayPair.b) {
                halfwayPair.a.matched = true;
                halfwayPair.b.matched = true;
            } else {
                halfwayPair.a.matched = (connections === 0);
            }
        }
    }
    
    function exportLevel() {
        if (!level?.tiling?.nodes) {
            alert('No level to export!');
            return;
        }
        
        // Prepare level data for export
        const levelData = {
            metadata: {
                name: levelName,
                description: levelDescription,
                created: new Date().toISOString(),
                editor: 'TileLoop Level Editor v1.0'
            },
            tiling: {
                rulestring: $selectedTiling.rulestring,
                name: $selectedTiling.name,
                transformSteps: $transformSteps
            },
            dimensions: {
                width: renderWidth,
                height: renderHeight
            },
            tiles: level.tiling.nodes.map(node => ({
                id: node.id,
                position: {
                    x: node.centroid.x,
                    y: node.centroid.y
                },
                screenPosition: {
                    x: node.screenPosition.x,
                    y: node.screenPosition.y
                },
                sides: node.n,
                rotation: node.rotation,
                angle: node.angle,
                tileType: node.tileType,
                mirrored: node.mirrored,
                svgTurns: node.svgTurns,
                vertices: node.vertices.map(v => ({ x: v.x, y: v.y })),
                connections: node.halfways.map(h => ({
                    position: { x: h.x, y: h.y },
                    connections: h.connections || 0
                }))
            }))
        };
        
        // Download as JSON
        const dataStr = JSON.stringify(levelData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${levelName.replace(/\s+/g, '_').toLowerCase()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    function clearLevel() {
        if (confirm('Clear all connections? This cannot be undone.')) {
            resetAllConnections();
        }
    }
    
    function shuffleLevel() {
        if (level) {
            level.shuffle();
            renderTrigger++;
        }
    }
    
    function resetToSolvedState() {
        if (!level?.tiling?.nodes) return;
        
        // Reset all tiles to their solved rotation (rotation = 0)
        for (const node of level.tiling.nodes) {
            node.rotation = 0;
        }
        renderTrigger++;
    }
    
    function testLevel() {
        isEditorMode = !isEditorMode;
        if (!isEditorMode) {
            // When entering test mode, show solved state
            resetToSolvedState();
        }
        renderTrigger++;
    }
    
    function importLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const levelData = JSON.parse(e.target.result);
                    
                    if (!validateLevelData(levelData)) {
                        alert('Invalid level file format!');
                        return;
                    }
                    
                    // Load the level
                    level = loadLevelFromJSON(levelData, renderWidth, renderHeight);
                    
                    // Update UI with imported level info
                    levelName = levelData.metadata.name || 'Imported Level';
                    levelDescription = levelData.metadata.description || 'Imported from JSON';
                    
                    // Update the selected tiling to match
                    if (levelData.tiling.name) {
                        // Try to find matching tiling in store
                        // This is a simplified approach - you might want to set the store value
                        console.log('Level uses tiling:', levelData.tiling.name);
                    }
                    
                    renderTrigger++;
                    
                    const stats = getLevelStats(levelData);
                    if (stats) {
                        console.log('Imported level stats:', stats);
                    }
                    
                } catch (error) {
                    console.error('Failed to import level:', error);
                    alert('Failed to import level: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    onMount(() => {
        if ($selectedTiling) {
            generateNewLevel();
        }
    });
</script>

<svelte:head>
    <title>Level Editor - TileLoop</title>
</svelte:head>

<div class="flex h-screen w-full bg-zinc-900 overflow-hidden relative">
    <!-- Header -->
    <div class="absolute top-0 left-0 right-0 z-20 bg-zinc-900 border-b border-zinc-700">
        <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-4">
                <h1 class="text-xl font-bold text-white">Level Editor</h1>
                <div class="flex items-center gap-2">
                    <input 
                        bind:value={levelName}
                        placeholder="Level Name"
                        class="px-3 py-1 bg-zinc-800 text-white rounded text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
                    />
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <!-- Editor Tools -->
                <div class="flex items-center gap-1 mr-4">
                    <button
                        onclick={importLevel}
                        class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Import Level JSON"
                    >
                        <Upload size={18} />
                    </button>
                    
                    <button
                        onclick={clearLevel}
                        class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Clear All Connections"
                    >
                        <Trash2 size={18} />
                    </button>
                    
                    <button
                        onclick={() => generateNewLevel()}
                        class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Generate New Layout"
                    >
                        <RotateCcw size={18} />
                    </button>
                    
                    <button
                        onclick={shuffleLevel}
                        class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Shuffle (for testing)"
                    >
                        <Shuffle size={18} />
                    </button>
                </div>
                
                <!-- Mode Toggle -->
                <button
                    onclick={testLevel}
                    class="px-4 py-2 rounded font-medium transition-colors {isEditorMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'}"
                >
                    {isEditorMode ? 'Test Level' : 'Edit Mode'}
                </button>
                
                <!-- Export Button -->
                <button
                    onclick={exportLevel}
                    class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-medium"
                >
                    <Download size={18} />
                    Export JSON
                </button>
            </div>
        </div>
    </div>
    
    <!-- Sidebar -->
    <Sidebar 
        bind:sidebarElement={sidebarElement} 
        bind:isSidebarOpen={isSidebarOpen}
    />
    
    <!-- Main Editor Area -->
    <div
        class="absolute top-16 right-0 bottom-0 transition-all duration-300 z-0 bg-gradient-to-br from-slate-100 to-slate-400 overflow-hidden"
        style="left: {isSidebarOpen ? sidebarWidth : 0}px;"
    >
        <!-- Check for tiling changes each render -->
        {checkForTilingChange()}
        
        {#if level?.tiling?.nodes}
            <!-- Level Renderer -->
            <div class="relative w-full h-full">
                {#each level.tiling.nodes as node}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="absolute cursor-pointer transition-transform hover:scale-105 {isEditorMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}"
                        style="
                            left: {node.screenPosition.x}px; 
                            top: {node.screenPosition.y}px; 
                            transform: translate(-50%, -50%);
                        "
                        onclick={(e) => isEditorMode ? handleTileClick(e, node) : null}
                    >
                        <Tile 
                            {node}
                            rotationTrigger={renderTrigger}
                            celebrationStage={-1}
                        />
                        
                        <!-- Connection Points Overlay (Editor Mode Only) -->
                        {#if isEditorMode && showConnectionPoints}
                            {#each node.halfways as halfway, i}
                                {@const temp = Vector.sub(new Vector(halfway.x, halfway.y), node.centroid)}
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <div
                                    class="absolute flex items-center justify-center cursor-pointer z-20"
                                    style="
                                        left: {Math.round(node.screenPosition.x)}px;
                                        top: {Math.round(node.screenPosition.y)}px;
                                        transform: translate({temp.x * level.scale * 0.8}px, {temp.y * level.scale * 0.8}px);
                                        width: 20px;
                                        height: 20px;
                                        margin-left: -10px;
                                        margin-top: -10px;
                                    "
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        cycleConnection(halfway);
                                    }}
                                >
                                    <!-- Connection Indicator -->
                                    <div class="relative">
                                        {#if halfway.connections === 0}
                                            <div class="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg hover:scale-125 transition-transform"></div>
                                        {:else if halfway.connections === 1}
                                            <div class="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-lg hover:scale-125 transition-transform"></div>
                                        {:else if halfway.connections === 2}
                                            <div class="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg hover:scale-125 transition-transform"></div>
                                        {/if}
                                        
                                        <!-- Connection Count -->
                                        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center shadow-md">
                                            {halfway.connections || 0}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                {/each}
            </div>
            
            <!-- Instructions Overlay -->
            {#if isEditorMode}
                <div class="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-w-md">
                    <h3 class="font-bold mb-2">Level Editor Instructions</h3>
                    <ul class="text-sm space-y-1">
                        <li>• <strong>Click on connection points</strong> to cycle through 0→1→2 connections</li>
                        <li>• <strong>Red dots:</strong> No connection (0)</li>
                        <li>• <strong>Yellow dots:</strong> Single connection (1)</li>
                        <li>• <strong>Green dots:</strong> Double connection (2)</li>
                        <li>• Use the sidebar to select different tilings</li>
                        <li>• Test your level before exporting</li>
                    </ul>
                </div>
            {/if}
        {:else}
            <div class="absolute inset-0 flex items-center justify-center text-gray-600">
                <div class="text-center">
                    <div class="text-lg font-medium">No level loaded</div>
                    <div class="text-sm">Select a tiling from the sidebar to start</div>
                </div>
            </div>
        {/if}
    </div>
</div> 