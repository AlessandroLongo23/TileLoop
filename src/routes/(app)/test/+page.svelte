<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    import TilingRenderer from '$lib/components/TilingRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    
    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    let isResizing = $state(false);
    let soundEnabled = $state(true);
    let darkTheme = $state(true);

    let sidebarElement = $state('');
    let sidebarWidth = $state(320);
    let isSidebarOpen = $state(true);
    let prevSidebarState = $state(true);

    // Calculate the actual rendering area dimensions
    let renderWidth = $derived(width - (isSidebarOpen ? sidebarWidth : 0));
    let renderHeight = $derived(height);

    onMount(() => {
        // Update initial dimensions
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
</script>

<div class="flex h-screen w-full bg-zinc-900 overflow-hidden relative">
    <!-- Game Header -->
    <GameHeader 
        showLevelInfo={false}
        bind:soundEnabled
        bind:darkTheme
    />
    
    <!-- Sidebar -->
    <Sidebar 
        bind:sidebarElement={sidebarElement} 
        bind:isSidebarOpen={isSidebarOpen}
    />
        
    <!-- Game Renderer -->
    <div
        class="absolute top-0 right-0 bottom-0 transition-all duration-300 z-0 bg-zinc-900 overflow-hidden"
        style="left: {isSidebarOpen ? sidebarWidth : 0}px;"
    >
        <TilingRenderer 
            width={renderWidth}
            height={renderHeight} 
        />
    </div>
</div>