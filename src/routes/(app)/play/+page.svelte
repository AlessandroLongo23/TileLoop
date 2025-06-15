<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';

    import { Level } from '$lib/classes/Level.svelte';
    import { selectedTiling } from '$lib/stores/configuration.js';

    import LevelRenderer from '$lib/components/LevelRenderer.svelte';
    import GameHeader from '$lib/components/GameHeader.svelte';
    import WinModal from '$lib/components/WinModal.svelte';

    let width = $state(browser ? window.innerWidth : 600);
    let height = $state(browser ? window.innerHeight : 600);
    let isResizing = $state(false);
    let darkTheme = $state(true);

    let isSolved = $state(false);
    let showCelebration = $state(false);
    let celebrationStage = $state(0);
    let renderTrigger = $state(0);
    
    let timer = $state(0);
    let moves = $state(0);
    let gameStarted = $state(false);
    let timerInterval = $state(null);

    let level = $derived(new Level(null, null, width, height));

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

    function tileClick() {
        moves++;
        startTimer();

        if (level.checkIfSolved() && !isSolved) {
            isSolved = true;
            level.isFrozen = true;

            if (timerInterval) {
                clearInterval(timerInterval);
            }

            triggerCelebration();
        }
    }

    const triggerCelebration = () => {
        showCelebration = true;
        celebrationStage = 0;
        
        setTimeout(() => {}, 1000); // first delay
        setTimeout(() => celebrationStage = 1, 1500);  // Border animation completes
        setTimeout(() => celebrationStage = 2, 1750);  // Modal appears  
        setTimeout(() => celebrationStage = 3, 2000);  // Icon appears
        setTimeout(() => celebrationStage = 4, 2250); // Message appears
        setTimeout(() => celebrationStage = 5, 2500); // Stats/buttons appear
    }

    const handleNextLevel = () => {
        isSolved = false;
        showCelebration = false;
        celebrationStage = 0;

        level = new Level(null, null, width, height);
        timer = 0;
        moves = 0;
        gameStarted = false;
    }

    const handlePlayAgain = () => {
        isSolved = false;
        showCelebration = false;
        celebrationStage = 0;

        level.shuffle();
        level.isFrozen = false;
        renderTrigger++;
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
            width={width}
            height={height}
            level={level}
            onTileClick={tileClick}
            renderTrigger={renderTrigger}
            showCelebration={showCelebration}
            celebrationStage={celebrationStage}
        />

        {#if showCelebration}
            <WinModal
                {showCelebration}
                {celebrationStage}
                {gameMode}
                {timer}
                {moves}
                handleNextLevel={handleNextLevel}
                handlePlayAgain={handlePlayAgain}
            />
        {/if}
    </div>
</div>