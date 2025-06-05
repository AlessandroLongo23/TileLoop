<!-- <script>
    import { selectedTiling } from '$lib/stores/configuration.js';
    import { sortPointsByAngleAndDistance } from '$lib/utils/geometry.svelte';
    import { TilingGenerator } from '$lib/classes/TilingGenerator.svelte';
    import { isWithinTolerance } from '$lib/utils/math.svelte';
    import { Vector } from '$lib/classes/Vector.svelte.js';
    import * as ls from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { sounds } from '$lib/utils/sounds.js';

    import { Level } from '$lib/classes/Level.svelte.js';

    let {
        width = 600,
        height = 600,
        showExtra = true
    } = $props();

    let grab = $state(false);
    
    let canvasElement = $state(null);

    let prevWidth = $state(width);   
    let prevHeight = $state(height);
    let prevSelectedTiling = $state($selectedTiling);

    let level = $state();

    onMount(async () => {
        if (typeof window !== 'undefined') {
            p5 = (await import('p5')).default;
            myp5 = new p5(sketch, canvasContainer);
            
            canvasElement = myp5;
            
            if (width && height && myp5) {
                myp5.resizeCanvas(width, height);
                prevWidth = width;
                prevHeight = height;
            }
        }
    });

    $effect(() => {
        if (myp5 && (width !== prevWidth || height !== prevHeight)) {
            prevWidth = width;
            prevHeight = height;
            
            if (canvasElement && canvasElement.resizeCanvas) {
                canvasElement.resizeCanvas(width, height);
            }
        }
    });

	let sketch = function(p5) {
        p5.setup = () => {
            p5.createCanvas(width, height);
            canvasElement = p5;
            p5.colorMode(p5.HSB, 360, 100, 100);
            
            // tilingGenerator = new TilingGenerator();
            try {
                level = new Level($selectedTiling.rulestring);
            } catch (e) {
                console.error(e);
            }
        }

        p5.draw = async () => {
            p5.push();
            p5.translate(p5.width / 2, p5.height / 2);
            p5.scale(1, -1);
            p5.background(240, 7, 70);
            p5.strokeWeight(0.025);
            p5.scale(50);

            if (prevSelectedTiling.rulestring != $selectedTiling.rulestring) {
                level = new Level($selectedTiling.rulestring);
            }

            level.draw(p5);

            p5.pop();

            if (grab) {
                const mouse = new Vector(p5.mouseX, p5.mouseY);
                const prevMouse = new Vector(p5.pmouseX, p5.pmouseY);
            }
            
            prevWidth = width;
            prevHeight = height;

            prevSelectedTiling = {...$selectedTiling};
        }

        p5.windowResized = () => {
            if (prevWidth !== width || prevHeight !== height) {
                p5.resizeCanvas(width, height);
                prevWidth = width;
                prevHeight = height;
            }
        }
    };

    let canvasContainer = $state();
    let p5;
    let myp5 = $state();
</script>

<div class="relative h-full w-full">
    <div class="cursor-pointer" bind:this={canvasContainer} oncontextmenu={(e) => e.preventDefault()}></div>
</div> -->