<script>
    import { onMount } from 'svelte';
    
    let {
        position = { x: 0, y: 0 },
        tileType,
        rotation,
        scale,
        mirrored,
        node,
        onClick = () => {}
    } = $props();

    let svgContent = $state('');
    let svgKey = $state(0);

    async function loadSvg(type) {
        try {
            svgContent = '';
            
            const response = await fetch(`/tilesets/border/${type}.svg`);
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
        loadSvg(tileType);
    });

    $effect(() => {
        if (tileType) {
            loadSvg(tileType);
        }
    });

    let offset = $derived(-node.angle + (node.n == 3 ? -Math.PI / 6 : node.n == 6 ? -Math.PI / 2 - Math.PI / node.n : -Math.PI / node.n));
    let scalePolygon = $derived(2 / (2 * Math.sin(Math.PI / node.n)))
</script>

<div 
    class="absolute transition-transform duration-200 ease-in-out tile-button pointer-events-none"
    style="
        left: {position.x}px; 
        top: {position.y}px; 
        width: {scale * scalePolygon + 1}px; 
        height: {scale * scalePolygon + 1}px;
        transform: translate(-50%, -50%) rotate({(offset + rotation) * 180 / Math.PI}deg) {mirrored ? 'scaleX(-1);' : ''};
        stroke-width: {32 / scalePolygon}px;
        --border-stroke-width: {4 / scalePolygon}px;
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

<style>
    .tile-button :global(svg) {
        display: block;
    }

    .tile-button :global(#border-polygon) {
        fill: none;
        stroke: #aaa;
        stroke-width: var(--border-stroke-width);
    }

    .tile-button div {
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>