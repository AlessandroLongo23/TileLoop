<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';

    import TilingRenderer from '$lib/components/TilingRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    
    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    let isResizing = $state(false);
    let soundEnabled = $state(true);
    let darkTheme = $state(true);
    
    // Game state
    let timer = $state(0);
    let moves = $state(0);
    let gameStarted = $state(false);
    let timerInterval = $state(null);

    let renderWidth = $derived(width);
    let renderHeight = $derived(height);

    // Extract game mode and level from URL parameters
    let gameMode = $derived($page.url.searchParams.get('mode') || 'story');
    let levelId = $derived($page.url.searchParams.get('level') || generateLevelId(gameMode));

    // Generate level ID based on game mode
    function generateLevelId(mode) {
        if (mode === 'story') {
            // For story mode, use chapter-level format (e.g., "1-1", "2-13")
            const chapter = $page.url.searchParams.get('chapter') || '1';
            const level = $page.url.searchParams.get('levelNum') || '1';
            return `${chapter}-${level}`;
        } else if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') {
            // For other modes, use progressive numbering
            return $page.url.searchParams.get('levelNum') || '1';
        }
        return '1';
    }

    // Start timer for time-based modes
    function startTimer() {
        if (!gameStarted && (gameMode === 'timeattack' || gameMode === 'story')) {
            gameStarted = true;
            timerInterval = setInterval(() => {
                timer++;
            }, 1000);
        }
    }

    // Increment move counter
    function incrementMoves() {
        moves++;
        startTimer(); // Start timer on first move
    }

    onMount(() => {
        // Update initial dimensions
        if (browser) {
            width = window.innerWidth;
            height = window.innerHeight;
        }
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (timerInterval) {
                clearInterval(timerInterval);
            }
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
        showLevelInfo={true}
        showBackButton={true}
        showStats={true}
        {gameMode}
        {levelId}
        {timer}
        {moves}
        bind:soundEnabled
        bind:darkTheme
    />
    
    <!-- Game Renderer -->
    <div class="absolute top-0 right-0 bottom-0 left-0 transition-all duration-300 z-0 bg-zinc-900 overflow-hidden">
        <TilingRenderer 
            width={renderWidth}
            height={renderHeight}
            onTileClick={incrementMoves}
        />
    </div>
</div>