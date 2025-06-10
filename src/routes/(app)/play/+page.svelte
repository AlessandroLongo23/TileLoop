<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';

    import LevelRenderer from '$lib/components/LevelRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    
    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    let isResizing = $state(false);
    let darkTheme = $state(true);
    
    let timer = $state(0);
    let moves = $state(0);
    let gameStarted = $state(false);
    let timerInterval = $state(null);

    let renderWidth = $derived(width);
    let renderHeight = $derived(height);

    let gameMode = $derived($page.url.searchParams.get('mode') || 'campaign');
    let levelId = $derived($page.url.searchParams.get('level') || generateLevelId(gameMode));

    function generateLevelId(mode) {
        if (mode === 'campaign') {
            const chapter = $page.url.searchParams.get('chapter') || '1';
            const level = $page.url.searchParams.get('levelNum') || '1';
            return `${chapter}-${level}`;
        } else if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') {
            return $page.url.searchParams.get('levelNum') || '1';
        }
        return '1';
    }

    function startTimer() {
        if (!gameStarted && (gameMode === 'timeattack' || gameMode === 'campaign')) {
            gameStarted = true;
            timerInterval = setInterval(() => {
                timer++;
            }, 1000);
        }
    }

    function incrementMoves() {
        moves++;
        startTimer();
    }

    onMount(() => {
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
    <GameHeader 
        showLevelInfo={true}
        showBackButton={true}
        showStats={true}
        {gameMode}
        {levelId}
        {timer}
        {moves}
        bind:darkTheme
    />
    
    <div class="absolute top-0 right-0 bottom-0 left-0 transition-all duration-300 z-0 bg-zinc-900 overflow-hidden">
        <LevelRenderer 
            width={renderWidth}
            height={renderHeight}
            onTileClick={incrementMoves}
        />
    </div>
</div>