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
    import LevelRenderer from '$lib/components/LevelRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';

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
    
    // Track current tiling to detect changes
    let currentTilingRulestring = $state($selectedTiling?.rulestring || '');
    let currentTransformSteps = $state($transformSteps);
    
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
            level.isFrozen = false; // Allow interactions in editor mode
            // Don't shuffle the level - we want clean connections for editing
            resetAllConnections();
            renderTrigger++;
        } catch (error) {
            console.error('Failed to generate level:', error);
        }
    }
    
    // Check for tiling changes
    $effect(() => {
        const newRulestring = $selectedTiling?.rulestring;
        const newTransformSteps = $transformSteps;
        
        if (newRulestring && 
            (newRulestring !== currentTilingRulestring || newTransformSteps !== currentTransformSteps)) {
            generateNewLevel();
            currentTilingRulestring = newRulestring;
            currentTransformSteps = newTransformSteps;
        }
    });
    
    function resetAllConnections() {
        if (!level?.tiling?.nodes) return;
        
        for (const node of level.tiling.nodes) {
            for (const halfway of node.halfways) {
                halfway.connections = 0;
                halfway.matched = true; 
            }
        }
        
        for (const node of level.tiling.nodes) {
            const [tileType, mirrored, turns, simmetries] = level.getTileType(node);
            node.tileType = tileType;
            
            if (mirrored) node.mirror();
            
            node.svgTurns = turns;
            node.simmetries = simmetries;
        }
        
        renderTrigger++;
    }
    
    function handleConnectionClick(halfway, node) {
        if (!isEditorMode || !level) return;
        
        const currentConnections = halfway.connections || 0;
        const newConnections = (currentConnections + 1) % 3;
        
        updateConnectionPair(halfway, newConnections);
        
        for (const node of level.tiling.nodes) {
            const [tileType, mirrored, turns, simmetries] = level.getTileType(node);
            node.tileType = tileType;
            if (mirrored) node.mirror();
            node.svgTurns = turns;
            node.simmetries = simmetries;
        }
        
        level.id = `level-editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        renderTrigger++;
    }
    
    function updateConnectionPair(targetHalfway, connections) {
        if (!level?.tiling?.nodes) return;
        
        let uniqueHalfways = [];
        for (const node of level.tiling.nodes) {
            for (const halfway of node.halfways) {
                const existing = uniqueHalfways.find(h => isWithinTolerance(h.a, halfway));
                if (!existing) {
                    uniqueHalfways.push({
                        a: halfway,
                        b: null
                    });
                } else {
                    existing.b = halfway;
                }
            }
        }
        
        const halfwayPair = uniqueHalfways.find(h => 
            isWithinTolerance(h.a, targetHalfway) || 
            (h.b && isWithinTolerance(h.b, targetHalfway))
        );
        
        if (halfwayPair) {
            halfwayPair.a.connections = connections;
            if (halfwayPair.b) {
                halfwayPair.b.connections = connections;
            }
            
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
        
        for (const node of level.tiling.nodes) {
            // node.rotation = 0;
            // node.svgTurns = 0;
            node.svgTransform = '';
        }
        renderTrigger++;
    }
    
    function testLevel() {
        isEditorMode = !isEditorMode;
        if (!isEditorMode) {
            shuffleLevel();
            level.isFrozen = false;
        } else {
            resetToSolvedState();
            level.isFrozen = false;
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
                    
                    level = loadLevelFromJSON(levelData, renderWidth, renderHeight);
                    level.isFrozen = false;
                    
                    levelName = levelData.metadata.name || 'Imported Level';
                    levelDescription = levelData.metadata.description || 'Imported from JSON';
                    
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
    <title>TileLoop - Level Editor</title>
</svelte:head>

<div class="flex h-screen w-full bg-zinc-900 overflow-hidden relative">
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
                
                <button
                    onclick={testLevel}
                    class="px-4 py-2 rounded font-medium transition-colors {isEditorMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'}"
                >
                    {isEditorMode ? 'Test Level' : 'Edit Mode'}
                </button>
                
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
    
    <Sidebar 
        bind:sidebarElement={sidebarElement} 
        bind:isSidebarOpen={isSidebarOpen}
    />
    
    <div
        class="absolute top-16 right-0 bottom-0 transition-all duration-300 z-0 overflow-hidden"
        style="left: {isSidebarOpen ? sidebarWidth : 0}px;"
    >
        {#if level?.tiling?.nodes}
            {#key level?.id}
                <LevelRenderer 
                    width={renderWidth}
                    height={renderHeight}
                    {level}
                    {renderTrigger}
                    onConnectionClick={handleConnectionClick}
                    showCelebration={false}
                    celebrationStage={-1}
                    {isEditorMode}
                />
            {/key}
        {:else}
            <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-400">
                <div class="text-center text-gray-600">
                    <div class="text-lg font-medium">No level loaded</div>
                    <div class="text-sm">Select a tiling from the sidebar to start</div>
                </div>
            </div>
        {/if}
    </div>
</div> 