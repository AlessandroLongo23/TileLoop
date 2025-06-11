<script>
    import { onMount } from 'svelte';
    import { Vector } from '$lib/classes/Vector.svelte.js';
    
    let {
        node,
        position = { x: 0, y: 0 },
        scale,
        rotationTrigger = 0,
        celebrationStage = -1
    } = $props();

    let svgContent = $state('');
    let svgKey = $state(0);

    async function loadSvg(type) {
        try {
            svgContent = '';
            
            const response = await fetch(`/tilesets/standard/${type}.svg`);
            if (response.ok) {
                let content = await response.text();
                content = content.replace(/width="[^"]*"/g, '');
                content = content.replace(/height="[^"]*"/g, '');

                content = content.replace(/class="bg-white[^"]*"/g, '');
                content = content.replace(/style="[^"]*"/g, '');

                content = content.replace(/fill="white"/g, 'fill="none"');

                content = content.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
                svgContent = content;
                svgKey++;
            } else {
                console.warn(`Failed to load SVG: ${type}.svg`);
                svgContent = '';
            }
        } catch (error) {
            console.error('Failed to load SVG:', error);
            svgContent = '';
        }
    }

    onMount(() => {
        loadSvg(node.tileType);
    });

    $effect(() => {
        if (node.tileType) {
            loadSvg(node.tileType);
        }
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
    
    let currentRotation = $derived(rotationTrigger >= 0 ? node.rotation : 0);
    let halfways = $derived(rotationTrigger >= 0 ? node.halfways.map(h => new Object({ x: h.x, y: h.y, connections: h.connections, matched: h.matched })) : []);
    let totalRotation = $derived.by(() => {
        let r = 0;
        r += offset;
        r += node.angle;
        r += currentRotation;
        if (node.mirrored) {
            let mirrorTurns = 0;
            if (node.n == 3) mirrorTurns = 2;
            else if (node.n == 4) mirrorTurns = 1;
            else if (node.n == 6) mirrorTurns = 1;
            r -= ((node.svgTurns - mirrorTurns) * (2 * Math.PI / node.n));
        } else {
            r += (node.svgTurns * (2 * Math.PI / node.n));
        }
        return r;
    });

    // Calculate border stroke width based on celebration stage
    let borderStrokeWidth = $derived.by(() => {
        if (celebrationStage >= 0) {
            // Animate to zero during stage 0
            return 0;
        }
        return 4 / scalePolygon;
    });
</script>

<div 
    class="absolute transition-transform duration-200 ease-in-out tile-button pointer-events-none"
    style="
        left: {position.x}px; 
        top: {position.y}px; 
        width: {scale * scalePolygon + 1}px; 
        height: {scale * scalePolygon + 1}px;
        transform: translate(-50%, -50%) rotate({totalRotation * 180 / Math.PI}deg) scaleX({node.mirrored ? -1 : 1});
        stroke-width: {40 / scalePolygon}px;
        --border-stroke-width: {borderStrokeWidth}px;
        --border-stroke-color: {node.effects.length > 0 ? node.effects[0].color : '#aaa'};
    "
>
    {#if svgContent}
        {#key svgKey}
            <div class="w-full h-full">
                {@html svgContent}
            </div>
        {/key}
    {:else}
        <div class="w-full h-full flex items-center justify-center text-xs">
            Loading...
        </div>
    {/if}
</div>

<!-- {#each halfways as halfway}
    {@const temp = Vector.sub(new Vector(halfway.x, halfway.y), node.centroid)}
    <div
        class="absolute flex flex-row gap-1 transition-transform duration-200 ease-in-out"
        style="
            transform: translate({temp.x * scale * 0.8}px, {temp.y * scale * 0.8}px);
            left: {Math.round(position.x)}px;
            top: {Math.round(position.y)}px;
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
    .tile-button :global(svg) {
        display: block;
    }

    .tile-button :global(#border-polygon) {
        fill: none;
        /* stroke: var(--border-stroke-color); */
        stroke-width: var(--border-stroke-width);
        transition: stroke-width 300ms ease-out;
    }

    .tile-button div {
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>