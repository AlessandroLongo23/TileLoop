<script>
    import { onMount } from 'svelte';
    import { Vector } from '$lib/classes/Vector.svelte.js';
    import { scale } from '$lib/stores/configuration.js';
    import { currentGameSession } from '$lib/stores/gameProgress.js';
    import { gameAppearance } from '$lib/stores/gameAppearance.js';
    import { themes } from '$lib/stores/data.js';

    let {
        node,
        rotationTrigger = 0,
        celebrationStage = -1
    } = $props();

    let svgContent = $state('');
    let isLoading = $state(false);

    let selectedTileset = $derived.by(() => {
        const sides = node.n;
        let shapeKey;
        
        if (sides === 3) shapeKey = 'triangle';
        else if (sides === 4) shapeKey = 'square';
        else if (sides === 6) shapeKey = 'hexagon';
        else return 'loop';
        
        return $gameAppearance.shapeStyles[shapeKey]?.tileset || 'loop';
    });

    async function loadSvg(type, tileset) {
        if (!type || !tileset) return;
        
        isLoading = true;
        
        try {
            const svgPath = `/tilesets/${tileset}/${type}.svg`;
            const response = await fetch(svgPath);
            
            if (response.ok) {
                let content = await response.text();
                
                content = content.replace(
                    /viewBox="0 0 600 600"[^>]*width="600"[^>]*height="600"/g,
                    `viewBox="0 0 600 600" width="${$scale * scalePolygon + 1}px" height="${$scale * scalePolygon + 1}px"`
                );

                content = content.replace('id="pathMask"', 'id="pathMask_' + tileset + "_" + node.id + '"');
                content = content.replace('url(#pathMask)', 'url(#pathMask_' + tileset + "_" + node.id + ')');
                content = content.replace('id="redGradient"', 'id="redGradient_' + tileset + "_" + node.id + '"');
                content = content.replace('url(#redGradient)', 'url(#redGradient_' + tileset + "_" + node.id + ')');
                content = content.replace('id="gradientStop2" offset="20%"', 'id="gradientStop2" offset="' + (20 * scalePolygon) + '%"');

                svgContent = content;
            } else {
                console.warn(`Failed to load SVG: ${svgPath}`);
                svgContent = '';
            }
        } catch (error) {
            console.error(`Error loading SVG:`, error);
            svgContent = '';
        } finally {
            isLoading = false;
        }
    }

    // Load SVG on mount
    onMount(() => {
        loadSvg(node.tileType, selectedTileset);
    });

    // Reload when tileType or tileset changes
    $effect(() => {
        loadSvg(node.tileType, selectedTileset);
    });

    let offset = $derived.by(() => {
        let off = 0;
        if (node.n == 3) 
            off = -Math.PI / 6;
        else if (node.n == 4)
            off = Math.PI / 4;
        else if (node.n == 6) 
            off = -Math.PI / 2 - Math.PI / 6;

        return off;
    });
    
    let scalePolygon = $derived(2 / (2 * Math.sin(Math.PI / node.n)));
    
    let transforms = $derived(rotationTrigger >= 0 ? `rotate(${startRotation * 180 / Math.PI}deg) ${node.svgTransform}` : node.svgTransform);
    let halfways = $derived(rotationTrigger >= 0 ? node.halfways.map(h => new Object({ x: h.x, y: h.y, connections: h.connections, matched: h.matched })) : []);
    let startRotation = $derived.by(() => {
        let r = 0;
        r += offset;
        r += node.angle;
        if (node.mirrored) {
            let mirrorTurns = 0;
            if (node.n == 3) mirrorTurns = 0;
            else if (node.n == 4) mirrorTurns = 0;
            else if (node.n == 6) mirrorTurns = 0;
            r -= ((node.svgTurns - mirrorTurns) * (2 * Math.PI / node.n));
        } else {
            r += (node.svgTurns * (2 * Math.PI / node.n));
        }
        return r;
    });

    let borderStrokeWidth = $derived.by(() => {
        if (celebrationStage >= 0) return 0;

        return 2 / scalePolygon;
    });

    let lineStrokeWidth = $derived(32 / scalePolygon);

    let effectStrokeWidth = $derived.by(() => {
        if (celebrationStage >= 0 || node.effects.length == 0) return 0;

        return 4;
    });
</script>

<div 
    class="absolute transition-transform duration-200 ease-in-out tile-button pointer-events-none"
    style="
        left: {node.screenPosition.x}px; 
        top: {node.screenPosition.y}px; 
        transform: translate(-50%, -50%) {transforms};
        --border-stroke-width: {borderStrokeWidth}px;
        --border-stroke-color: #888;
        --line-stroke-color: #fff;
        --line-stroke-width: {lineStrokeWidth}px;
        --effect-border-stroke-width: {effectStrokeWidth}px;
        --effect-border-stroke-color: {node.effects.length > 0 ? node.effects[0].color : '#aaa'};
        --gradient-stop-1-color: {halfways.reduce((acc, h) => acc + h.connections, 0) == 1 && halfways.filter(h => h.connections == 1)[0].matched ? $themes['default'].colors[$currentGameSession.gameMode] : '#000000'};
        z-index: {node.effects.length > 0 ? 10 : 0};
    "
>
    {#if svgContent}
        <div class="w-full h-full">
            {@html svgContent}
        </div>
    {:else if !isLoading}
        <div class="w-full h-full flex items-center justify-center text-xs text-red-500">
            Error loading {node.tileType}
        </div>
    {/if}
</div>

<!-- {#each halfways as halfway}
    {@const temp = Vector.sub(new Vector(halfway.x, halfway.y), node.centroid)}
    <div
        class="absolute flex flex-row gap-1 transition-transform duration-200 ease-in-out"
        style="
            transform: translate({temp.x * $scale * 0.8}px, {temp.y * $scale * 0.8}px);
            left: {Math.round(node.screenPosition.x)}px;
            top: {Math.round(node.screenPosition.y)}px;
        "
    >
        {#each { length: halfway.connections }, connection}
            <div 
                class="relative size-1 rounded-full {halfway.matched ? 'bg-green-500' : 'bg-red-500'}"
            >
            </div>
        {/each}
    </div>
{/each} -->

<style>
    .tile-button {
        background: transparent !important;
    }
    
    .tile-button :global(#base-polygon) {
        fill: transparent !important;
        stroke: var(--border-stroke-color);
        stroke-width: var(--border-stroke-width);
    }
    
    .tile-button :global(polygon),
    .tile-button :global(rect:not([mask*="pathMask"])),
    .tile-button :global(circle),
    .tile-button :global(ellipse) {
        fill: transparent !important;
    }
    
    .tile-button :global(path:not(#base-polygon):not(#border-polygon)),
    .tile-button :global(line),
    .tile-button :global(circle) {
        stroke: var(--line-stroke-color) !important;
        stroke-width: var(--line-stroke-width) !important;
        fill: none !important;
        opacity: 1 !important;
        transition: stroke-width 300ms ease-out;
    }
    
    .tile-button :global(#border-polygon) {
        /* stroke: var(--effect-border-stroke-color) !important;
        stroke-width: var(--effect-border-stroke-width) !important; */
        fill: transparent !important;
        transition: stroke-width 300ms ease-out;
    }

    .tile-button :global(#gradientStop1) {
        stop-color: var(--gradient-stop-1-color) !important;
        transition: stop-color 300ms ease-out;
    }

    .tile-button :global(#gradientStop2) {
        offset: 90% !important;
    }

    .tile-button :global(svg) {
        background: transparent !important;
    }
</style>