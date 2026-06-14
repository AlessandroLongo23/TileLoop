<script>
    import { selectedTiling, scale } from '$lib/stores/configuration.js';
    import { Vector } from '$lib/classes/Vector.svelte.js';
    import { sounds } from '$lib/utils/sounds.js';
    import { isWithinTolerance } from '$lib/utils/math.svelte';
    
    import Tile from './Tile.svelte';

    let {
        width = 600,
        height = 600,
        level,
        renderTrigger,
        onTileClick = () => {},
        showCelebration,
        celebrationStage,
        isEditorMode = false,
        onConnectionClick = () => {}
    } = $props();

    let containerElement = $state();
    let lastClickTime = $state(0);
    let isProcessingClick = $state(false);
    let uniqueHalfways = $state([]);

    // Calculate unique halfway points for editor mode
    $effect(() => {
        if (isEditorMode && level?.tiling?.nodes) {
            calculateUniqueHalfways();
        }
    });

    // Also recalculate when render trigger changes (for connection edits)
    $effect(() => {
        if (renderTrigger >= 0 && isEditorMode && level?.tiling?.nodes) {
            calculateUniqueHalfways();
        }
    });

    function calculateUniqueHalfways() {
        let unique = [];
        for (const node of level.tiling.nodes) {
            for (const halfway of node.halfways) {
                if (!unique.some(h => isWithinTolerance(h.halfway, halfway))) {
                    // Find the paired halfway if it exists
                    let pairedHalfway = null;
                    let pairedNode = null;
                    
                    for (const otherNode of level.tiling.nodes) {
                        if (otherNode.id === node.id) continue;
                        for (const otherHalfway of otherNode.halfways) {
                            if (isWithinTolerance(otherHalfway, halfway)) {
                                pairedHalfway = otherHalfway;
                                pairedNode = otherNode;
                                break;
                            }
                        }
                        if (pairedHalfway) break;
                    }
                    
                    unique.push({
                        halfway,
                        node,
                        pairedHalfway,
                        pairedNode,
                        screenPosition: Vector.add(node.screenPosition, Vector.scale(Vector.sub(halfway, node.centroid), $scale))
                    });
                }
            }
        }
        uniqueHalfways = unique;
    }

    function handleContainerClick(event) {
        const currentTime = Date.now();
        if (isProcessingClick || currentTime - lastClickTime < 10) return;
        if (!containerElement || level.tiling.nodes.length === 0) return;
        
        isProcessingClick = true;
        lastClickTime = currentTime;
        
        event.preventDefault();
        event.stopPropagation();
        
        const rect = containerElement.getBoundingClientRect();
        const clickPos = new Vector(event.clientX - rect.left, event.clientY - rect.top);
        
        // In editor mode, check for connection point clicks first
        if (isEditorMode) {
            const connectionClick = checkConnectionPointClick(clickPos);
            if (connectionClick) {
                onConnectionClick(connectionClick.halfway, connectionClick.node);
                setTimeout(() => {
                    isProcessingClick = false;
                }, 10);
                return;
            }
        }
        
        let clickTilingPos = Vector.scale(Vector.sub(clickPos, new Vector(width / 2, height / 2)), 1 / $scale);
        const tile = level.tiling.nodes.find(tile => tile.containsPoint(clickTilingPos));
        if (tile) handleTileClick(tile);
        
        setTimeout(() => {
            isProcessingClick = false;
        }, 10);
    }

    function checkConnectionPointClick(clickPos) {
        if (!isEditorMode || !uniqueHalfways.length) return null;
        
        for (const uniqueHalfway of uniqueHalfways) {
            const distance = Vector.distance(clickPos, uniqueHalfway.screenPosition);
            
            if (distance < 25) { // 25px click radius
                return { halfway: uniqueHalfway.halfway, node: uniqueHalfway.node };
            }
        }
        return null;
    }

    function handleTileClick(tile) {
        if (level.isFrozen) return;
        if (tile.isRotating) return;
        if (isEditorMode) return;
        
        // Normal game mode - rotate the tile
        tile.isRotating = true;
        tile.rotate()
        renderTrigger++;
        tile.effects.forEach(effect => effect.resolve());
        sounds.stateChange(0.25, {
            bornRatio: 0.75,
            diedRatio: 0.25,
            activityLevel: 0,
            iteration: 0
        });
        
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
    {#each level.tiling.nodes as node (node.id)}
        {#if isEditorMode}
            {#key `${node.id}-${node.tileType}-${renderTrigger}`}
                <Tile 
                    node={node}
                    trigger={renderTrigger}
                    celebrationStage={showCelebration ? celebrationStage : -1}
                />
            {/key}
        {:else}
            <Tile 
                node={node}
                trigger={renderTrigger}
                celebrationStage={showCelebration ? celebrationStage : -1}
            />
        {/if}
    {/each}
    
    <!-- Connection Points Overlay (Editor Mode Only) - Show only unique halfways -->
    {#if isEditorMode}
        {#each uniqueHalfways as uniqueHalfway }
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="absolute flex items-center -translate-x-1/2 -translate-y-1/2 justify-center cursor-pointer z-20 opacity-25 hover:opacity-100 transition-all duration-300"
                style="
                    left: {uniqueHalfway.screenPosition.x}px;
                    top: {uniqueHalfway.screenPosition.y}px;
                    width: 30px;
                    height: 30px;
                "
                onclick={(e) => {
                    e.stopPropagation();
                    onConnectionClick(uniqueHalfway.halfway, uniqueHalfway.node);
                }}
            >
                <div 
                    class="relative size-3 rounded-full bg-zinc-800 active:bg-zinc-600 text-white text-xs font-bold flex items-center justify-center shadow-md"
                >
                </div>
            </div>
        {/each}
    {/if}
    
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