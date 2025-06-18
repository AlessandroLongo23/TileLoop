<script>
    import { selectedTiling, transformSteps } from '$lib/stores/configuration.js';
    import { Level } from '$lib/classes/Level.svelte.js';
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    import LevelRenderer from '$lib/components/LevelRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';

    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    let isResizing = $state(false);
    let darkTheme = $state(true);

    let sidebarElement = $state('');
    let sidebarWidth = $state(320);
    let isSidebarOpen = $state(true);
    let prevSidebarState = $state(true);

    let renderWidth = $derived(width - (isSidebarOpen ? sidebarWidth : 0));
    let renderHeight = $derived(height);

    let level = $state(new Level($selectedTiling.rulestring));
    let prevTransformSteps = $state($transformSteps);
    let prevSelectedTiling = $state($selectedTiling);
    let renderTrigger = $state(0);
    
    $effect(() => {
        if ($transformSteps !== prevTransformSteps || $selectedTiling.rulestring !== prevSelectedTiling.rulestring) {
            level = new Level($selectedTiling.rulestring);
            prevTransformSteps = $transformSteps;
            prevSelectedTiling = $selectedTiling;
        }
    });

    onMount(() => {
        if (browser) {
            width = window.innerWidth;
            height = window.innerHeight;
        }
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    const handleResize = () => {
        if (!isResizing) {
            isResizing = true;
            if (browser) {
                width = window.innerWidth;
                height = window.innerHeight;
            }
            setTimeout(() => {
                isResizing = false;
            }, 100);
        }
    }

    function tileClick() {
        level.shuffle();
        renderTrigger++;
    }
</script>

<div class="flex h-screen w-full bg-zinc-900 overflow-hidden relative">
    <GameHeader 
        showLevelInfo={false}
        bind:darkTheme
    />
    
    <Sidebar 
        bind:sidebarElement={sidebarElement} 
        bind:isSidebarOpen={isSidebarOpen}
    />
        
    <div
        class="absolute top-0 right-0 bottom-0 transition-all duration-300 z-0 bg-zinc-900 overflow-hidden"
        style="left: {isSidebarOpen ? sidebarWidth : 0}px;"
    >
        {#key level?.id}
            <LevelRenderer 
                width={renderWidth}
                height={renderHeight}
                level={level}
                onTileClick={tileClick}
                renderTrigger={renderTrigger}
            />
        {/key}
    </div>
</div>