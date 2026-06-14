import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Level,
  completeLevel,
  updateGameModeProgress,
  clearCurrentGameState,
  advanceToNextLevel,
  getCurrentSession,
  startGameSession,
} from '@tileloop/core';
import { useSession } from '../hooks/stores';
import GameHeader from '../components/GameHeader';
import LevelRenderer from '../components/LevelRenderer';
import WinModal from '../components/WinModal';

function generateLevelId(mode: string, chapter: number, level: number): string {
  if (mode === 'campaign') return `${chapter}-${level}`;
  return level.toString();
}

export default function Play() {
  const navigate = useNavigate();
  const session = useSession();

  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 600));
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 600,
  );

  const gameMode = session.gameMode || 'campaign';
  const chapterNum = session.chapter || 1;
  const levelNum = session.level || 1;
  const levelId = generateLevelId(gameMode, chapterNum, levelNum);

  const [level, setLevel] = useState(() => new Level(null, null, width, height));
  const [renderKey, setRenderKey] = useState(0);

  const [isSolved, setIsSolved] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStage, setCelebrationStage] = useState(0);

  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const gameStarted = useRef(false);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if there is no active session.
  useEffect(() => {
    if (!getCurrentSession().isActive) {
      // Fall back to a zen session so a direct /play visit (e.g. tests) still works.
      startGameSession('zen');
    }
    const onResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer() {
    if (!gameStarted.current && (gameMode === 'timeattack' || gameMode === 'campaign')) {
      gameStarted.current = true;
      timerInterval.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
  }

  function calculateStars(currentMoves: number): number {
    const optimalMoves = level.minMovesToSolve || currentMoves;
    const efficiency = optimalMoves / currentMoves;
    if (efficiency >= 1.0) return 3;
    if (efficiency >= 0.8) return 2;
    if (efficiency >= 0.6) return 1;
    return 0;
  }

  function handleLevelComplete(finalMoves: number) {
    const stars = calculateStars(finalMoves);
    if (gameMode === 'campaign') {
      completeLevel(chapterNum, levelNum, { time: timer, moves: finalMoves, stars });
    } else {
      updateGameModeProgress(gameMode, {
        gameMode,
        level: levelNum,
        chapter: chapterNum,
        time: timer,
        moves: finalMoves,
        completed: true,
        playTime: timer,
        stars,
        isPerfect: finalMoves <= (level.minMovesToSolve || finalMoves),
      });
    }
    clearCurrentGameState();
  }

  function triggerCelebration() {
    setShowCelebration(true);
    setCelebrationStage(0);
    setTimeout(() => setCelebrationStage(1), 1500);
    setTimeout(() => setCelebrationStage(2), 1750);
    setTimeout(() => setCelebrationStage(3), 2000);
    setTimeout(() => setCelebrationStage(4), 2250);
    setTimeout(() => setCelebrationStage(5), 2500);
  }

  function tileClick() {
    startTimer();
    setMoves((m) => {
      const next = m + 1;
      if (level.checkIfSolved() && !isSolved) {
        setIsSolved(true);
        level.isFrozen = true;
        if (timerInterval.current) clearInterval(timerInterval.current);
        handleLevelComplete(next);
        triggerCelebration();
      }
      return next;
    });
  }

  function resetForNewLevel() {
    setIsSolved(false);
    setShowCelebration(false);
    setCelebrationStage(0);
    setTimer(0);
    setMoves(0);
    gameStarted.current = false;
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }

  function handleNextLevel() {
    resetForNewLevel();
    advanceToNextLevel();
    const current = getCurrentSession();
    if (!current.isActive) {
      navigate('/campaign');
      return;
    }
    setLevel(new Level(null, null, width, height));
    setRenderKey((k) => k + 1);
  }

  function handlePlayAgain() {
    setIsSolved(false);
    setShowCelebration(false);
    setCelebrationStage(0);
    level.shuffle();
    level.isFrozen = false;
    setRenderKey((k) => k + 1);
  }

  // Test-only deterministic solve hook (enabled when a seed is set or in dev).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__tileloop?.seed == null && !import.meta.env.DEV) return;
    window.__tileloop = window.__tileloop ?? {};
    window.__tileloop.solve = () => {
      for (const node of level.tiling.nodes) {
        const back = (((node.n - (node.turns % node.n)) % node.n) + node.n) % node.n;
        if (back !== 0) node.rotate(back);
      }
      if (level.checkIfSolved() && !isSolved) {
        setIsSolved(true);
        level.isFrozen = true;
        if (timerInterval.current) clearInterval(timerInterval.current);
        handleLevelComplete(moves || 1);
        triggerCelebration();
      }
    };
  });

  const title =
    gameMode === 'campaign'
      ? `TileLoop / Campaign lvl. ${chapterNum}-${levelNum}`
      : `TileLoop / ${gameMode} lvl. ${levelNum}`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-zinc-900">
      <GameHeader
        showLevelInfo
        showBackButton
        showStats
        gameMode={gameMode}
        levelId={levelId}
        timer={timer}
        moves={moves}
      />

      <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-900">
        <LevelRenderer
          key={`${level.id}-${renderKey}`}
          width={width}
          height={height}
          level={level}
          onTileClick={tileClick}
          showCelebration={showCelebration}
          celebrationStage={celebrationStage}
        />

        {showCelebration && (
          <WinModal
            celebrationStage={celebrationStage}
            gameMode={gameMode}
            timer={timer}
            moves={moves}
            handleNextLevel={handleNextLevel}
            handlePlayAgain={handlePlayAgain}
          />
        )}
      </div>
    </div>
  );
}
