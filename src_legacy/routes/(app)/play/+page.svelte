<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';

    import { Level } from '$lib/classes/Level.svelte';
    import { selectedTiling } from '$lib/stores/configuration.js';
    import { 
        completeLevel, 
        updateGameModeProgress, 
        saveCurrentGameState, 
        clearCurrentGameState,
        currentGameState,
        currentGameSession,
        gameSettings,
        advanceToNextLevel,
        endGameSession,
        getCurrentSession,
        CHAPTERS_COUNT,
        LEVELS_PER_CHAPTER
    } from '$lib/stores/gameProgress.js';

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

    // Get current session data from store instead of URL
    let session = $derived($currentGameSession);
    let gameMode = $derived(session?.gameMode || 'campaign');
    let chapterNum = $derived(session?.chapter || 1);
    let levelNum = $derived(session?.level || 1);
    let levelId = $derived(generateLevelId(gameMode, chapterNum, levelNum));

    // Initialize the level - will be regenerated manually when needed
    let level = $state(new Level(null, null, width, height));

    function generateLevelId(mode, chapter, level) {
        if (mode === 'campaign') {
            return `${chapter}-${level}`;
        } else if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') {
            return level.toString();
        }
        return '1';
    }

    function startTimer() {
        if (!gameStarted && (gameMode === 'timeattack' || gameMode === 'campaign')) {
            gameStarted = true;
            timerInterval = setInterval(() => {
                timer++;
                // Auto-save game state every 5 seconds if enabled
                if ($gameSettings.autoSave && timer % 5 === 0) {
                    saveGameState();
                }
            }, 1000);
        }
    }

    function saveGameState() {
        const currentSession = getCurrentSession();
        const gameData = {
            gameMode: currentSession.gameMode,
            levelId,
            chapterNum: currentSession.chapter,
            levelNum: currentSession.level,
            timer,
            moves,
            startTime: new Date().toISOString(),
            levelState: {
                // Save level state if needed - can be expanded
                isSolved,
                gameStarted
            }
        };
        
        saveCurrentGameState(gameData);
    }

    function tileClick() {
        moves++;
        startTimer();

        // Auto-save on every move if enabled
        if ($gameSettings.autoSave) {
            saveGameState();
        }

        if (level.checkIfSolved() && !isSolved) {
            isSolved = true;
            level.isFrozen = true;

            if (timerInterval) {
                clearInterval(timerInterval);
            }

            handleLevelComplete();
            triggerCelebration();
        }
    }

    async function handleLevelComplete() {
        const completionData = {
            gameMode,
            level: levelNum,
            chapter: chapterNum,
            time: timer,
            moves,
            completed: true,
            playTime: timer,
            stars: calculateStars(),
            isPerfect: moves <= (level.minMovesToSolve || moves) // Check if optimal
        };

        // Save progress based on game mode
        if (gameMode === 'campaign') {
            await completeLevel(chapterNum, levelNum, {
                time: timer,
                moves,
                stars: completionData.stars
            });
        } else {
            updateGameModeProgress(gameMode, completionData);
        }

        // Clear current game state since level is completed
        clearCurrentGameState();
    }

    function calculateStars() {
        // Simple star calculation based on moves vs optimal
        const optimalMoves = level.minMovesToSolve || moves;
        const efficiency = optimalMoves / moves;
        
        if (efficiency >= 1.0) return 3; // Perfect
        if (efficiency >= 0.8) return 2; // Good
        if (efficiency >= 0.6) return 1; // Okay
        return 0; // Could be better
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
        // Close celebration modal first
        isSolved = false;
        showCelebration = false;
        celebrationStage = 0;

        // Reset game state for new level
        timer = 0;
        moves = 0;
        gameStarted = false;
        
        // Clear any existing timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Advance to next level using session store
        advanceToNextLevel();
        
        // Check if campaign is completed
        const currentSession = getCurrentSession();
        if (!currentSession.isActive) {
            // Campaign completed or session ended
            goto('/campaign');
            return;
        }

        // Generate a new random level
        level = new Level(null, null, width, height);
        
        // Force a re-render
        renderTrigger++;

        console.log(`Generated new level for: ${gameMode} ${generateLevelId(currentSession.gameMode, currentSession.chapter, currentSession.level)}`);
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
            
            // Check if there's a valid game session
            const currentSession = getCurrentSession();
            if (!currentSession.isActive) {
                // No active session, redirect to menu
                goto('/menu');
                return;
            }
            
            // Check for saved game state and restore if exists
            restoreGameState();
        }
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            // Save game state on unmount if game is active
            if (gameStarted && !isSolved && $gameSettings.autoSave) {
                saveGameState();
            }
        };
    });

    async function restoreGameState() {
        const savedState = $currentGameState;
        const currentSession = getCurrentSession();
        
        if (savedState && 
            savedState.gameMode === currentSession.gameMode && 
            savedState.levelId === levelId) {
            
            // Restore game state
            timer = savedState.timer || 0;
            moves = savedState.moves || 0;
            gameStarted = savedState.levelState?.gameStarted || false;
            
            // Resume timer if game was active
            if (gameStarted && !isSolved) {
                timerInterval = setInterval(() => {
                    timer++;
                    if ($gameSettings.autoSave && timer % 5 === 0) {
                        saveGameState();
                    }
                }, 1000);
            }
            
            console.log('Game state restored:', { timer, moves, gameStarted });
        }
    }

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

    let title = $derived.by(() => {
        if (gameMode === 'campaign') {
            return `TileLoop / Campaign lvl. ${chapterNum}-${levelNum}`;
        } else {
            return `TileLoop / ${gameMode.capitalize()} lvl. ${levelNum}`;
        }
    });
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

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
        {#key level?.id}
            <LevelRenderer 
                width={width}
                height={height}
                level={level}
                onTileClick={tileClick}
                renderTrigger={renderTrigger}
                showCelebration={showCelebration}
                celebrationStage={celebrationStage}
            />
        {/key}

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