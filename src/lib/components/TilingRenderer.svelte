<script>
    import { selectedTiling } from '$lib/stores/configuration.js';
    import { Level } from '$lib/classes/Level.svelte.js';
    import { TilingGenerator } from '$lib/classes/TilingGenerator.svelte';
    import Tile from './Tile.svelte';
    import { onMount } from 'svelte';
    import { compareArrays } from '$lib/utils/utils.svelte.js';

    let {
        width = 600,
        height = 600,
        showExtra = true
    } = $props();

    let level = $state();
    let tiles = $state([]);
    let prevSelectedTiling = $state($selectedTiling);
    let containerElement = $state();
    let generationCounter = $state(0);

    // Scale factor to convert from tiling coordinates to screen pixels
    const SCALE = 60;
    const centerX = $derived(width / 2);
    const centerY = $derived(height / 2);

    // Generate tiles when component mounts or tiling changes
    $effect(() => {
        if ($selectedTiling && (prevSelectedTiling?.rulestring !== $selectedTiling.rulestring)) {
            generateTiles();
            prevSelectedTiling = {...$selectedTiling};
        }
    });

    onMount(() => {
        generateTiles();
    });

    function generateTiles() {
        try {
            if (!$selectedTiling || !$selectedTiling.rulestring) {
                console.warn('No tiling configuration available');
                tiles = [];
                return;
            }

            // Clear existing tiles first
            tiles = [];
            
            // Force a small delay to ensure DOM cleanup
            setTimeout(() => {
                level = new Level($selectedTiling.rulestring);
                generationCounter++; // Increment counter for unique IDs
                tiles = convertTilingToTiles(level.tiling);
            }, 10);
        } catch (e) {
            console.error('Error generating tiles:', e);
            tiles = [];
        }
    }

    function convertTilingToTiles(tiling) {
        const generatedTiles = [];
        
        if (!tiling || !tiling.nodes) {
            console.warn('No tiling nodes available');
            return generatedTiles;
        }

        for (let i = 0; i < tiling.nodes.length; i++) {
            const node = tiling.nodes[i];
            
            // Convert tiling coordinates to screen coordinates
            const screenX = centerX + (node.centroid.x * SCALE);
            const screenY = centerY - (node.centroid.y * SCALE); // Flip Y axis
            
            // Only render tiles that are visible on screen (with some margin)
            const margin = 100;
            if (screenX < -margin || screenX > width + margin || 
                screenY < -margin || screenY > height + margin) {
                continue;
            }

            // Determine tile type based on polygon properties
            const [tileType, mirrored] = getTileType(tiling, node);
            
            // Create more unique ID using generation counter and node properties
            const uniqueId = `tile-${generationCounter}-${i}-${node.centroid.x.toFixed(3)}-${node.centroid.y.toFixed(3)}`;
            
            generatedTiles.push({
                id: uniqueId,
                position: { x: screenX, y: screenY },
                tileType: tileType,
                rotation: 0,
                mirrored: mirrored,
                node: node
            });
        }
        
        return generatedTiles;
    }

    function getTileType(tiling, node) {
        const sides = node.n;
        const maxConnections = tiling.nodes.flatMap(n => n.halfways).map(h => h.connections).reduce((a, b) => Math.max(a, b), 0);
        const connections = node.halfways.map(h => h.connections);
        const [lowestLexicographicCycle, mirrored] = connections.cycleToMinimumLexicographicalOrder();
        const connectionId = lowestLexicographicCycle.fromBase(maxConnections + 1)
        const tileType = `${sides}_${maxConnections + 1}_${connectionId}`;

        return [tileType, mirrored];
    }

    function handleContainerClick(event) {
        if (!containerElement || tiles.length === 0) return;
        
        const rect = containerElement.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        let closestTile = null;
        let minDistance = Infinity;
        
        for (const tile of tiles) {
            const dx = clickX - tile.position.x;
            const dy = clickY - tile.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestTile = tile;
            }
        }
        
        if (closestTile) {
            handleTileClick(closestTile);
        }
    }

    function handleTileClick(tile) {
        tile.rotation += 2 * Math.PI / tile.node.n;
    }

    Array.prototype.fromBase = function(base) {
        let result = 0;
        for (let i = 0; i < this.length; i++) {
            result += this[i] * Math.pow(base, this.length - i - 1);
        }
        return result;
    }

    Array.prototype.cycleToMinimumLexicographicalOrder = function() {
        let min = this.slice(0);
        let mirrored = false;
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < this.length; i++) {
                let rotated = this.slice(i).concat(this.slice(0, i));
                if (compareArrays(rotated, min) < 0) {
                    min = rotated;
                    mirrored = j == 1;
                }
            }

            this.reverse();
        }
        return [min, mirrored];
    }
</script>

<button 
    bind:this={containerElement}
    class="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-400 cursor-pointer"
    style="width: {width}px; height: {height}px;"
    onclick={handleContainerClick}
>
    {#each tiles as tile (tile.id)}
        {#key `${generationCounter}-${tile.id}`}
            <Tile 
                position={tile.position}
                tileType={tile.tileType}
                rotation={tile.rotation}
                scale={SCALE}
                mirrored={tile.mirrored}
                node={tile.node}
                onClick={() => {}} 
            />
        {/key}
    {/each}
    
    {#if tiles.length === 0}
        <div class="absolute inset-0 flex items-center justify-center text-gray-500">
            <div class="text-center">
                <div class="text-lg font-medium">No tiles generated</div>
                <div class="text-sm">Check your tiling configuration</div>
                {#if $selectedTiling}
                    <div class="text-xs mt-2">Rule: {$selectedTiling.rulestring}</div>
                {/if}
            </div>
        </div>
    {/if}
</button> 