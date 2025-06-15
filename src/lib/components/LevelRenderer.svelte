<script>
    import { selectedTiling, scale } from '$lib/stores/configuration.js';
    import { Vector } from '$lib/classes/Vector.svelte.js';

    import Tile from './Tile.svelte';

    let {
        width = 600,
        height = 600,
        level,
        renderTrigger,
        onTileClick = () => {},
        showCelebration,
        celebrationStage
    } = $props();

    let containerElement = $state();
    let lastClickTime = $state(0);
    let isProcessingClick = $state(false);

    function handleContainerClick(event) {
        const currentTime = Date.now();
        if (isProcessingClick || currentTime - lastClickTime < 10) {
            return;
        }
        
        if (!containerElement || level.tiling.nodes.length === 0) return;
        
        isProcessingClick = true;
        lastClickTime = currentTime;
        
        event.preventDefault();
        event.stopPropagation();
        
        const rect = containerElement.getBoundingClientRect();
        const clickPos = new Vector(event.clientX - rect.left, event.clientY - rect.top);
        
        let closestTile = null;
        let minDistance = Infinity;
        
        for (const tile of level.tiling.nodes) {
            const offset = Vector.sub(clickPos, tile.screenPosition);
            const distance = offset.mag();
            
            if (distance < minDistance) {
                minDistance = distance;
                closestTile = tile;
            }
        }
        
        if (closestTile && minDistance < $scale) {
            handleTileClick(closestTile);
        }
        
        setTimeout(() => {
            isProcessingClick = false;
        }, 10);
    }

    function handleTileClick(tile) {
        if (level.isFrozen) return;
        if (tile.isRotating) return;
        
        tile.isRotating = true;
        tile.rotate()
        renderTrigger++;
        tile.effects.forEach(effect => effect.resolve());
        
        onTileClick();
        
        setTimeout(() => {
            tile.isRotating = false;
            renderTrigger++;
        }, 10);
    }
</script>

<button 
    bind:this={containerElement}
    class="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-400 cursor-pointer"
    style="width: {width}px; height: {height}px;"
    onclick={handleContainerClick}
>
    {#each level.tiling.nodes as node}
        <Tile 
            node={node}
            rotationTrigger={renderTrigger}
            celebrationStage={showCelebration ? celebrationStage : -1}
        />
    {/each}
    
    {#if level.tiling.nodes.length === 0}
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