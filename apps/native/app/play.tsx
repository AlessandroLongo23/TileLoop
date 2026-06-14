import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import {
  Level,
  completeLevel,
  updateGameModeProgress,
  advanceToNextLevel,
  getCurrentSession,
  startGameSession,
} from '@tileloop/core';
import { useSession } from '../src/hooks/stores';
import LevelRenderer from '../src/components/LevelRenderer';

export default function Play() {
  const router = useRouter();
  const session = useSession();
  const { width, height } = useWindowDimensions();

  const gameMode = session.gameMode || 'campaign';
  const chapterNum = session.chapter || 1;
  const levelNum = session.level || 1;

  const [level, setLevel] = useState(() => new Level(null, null, width, height));
  const [renderKey, setRenderKey] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [moves, setMoves] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    if (!getCurrentSession().isActive) startGameSession('zen');
  }, []);

  function tileClick() {
    setMoves((m) => {
      const next = m + 1;
      if (level.checkIfSolved() && !isSolved) {
        setIsSolved(true);
        level.isFrozen = true;
        const stars = 3;
        if (gameMode === 'campaign') {
          completeLevel(chapterNum, levelNum, { moves: next, stars });
        } else {
          updateGameModeProgress(gameMode, {
            gameMode,
            level: levelNum,
            chapter: chapterNum,
            moves: next,
            completed: true,
            stars,
          });
        }
        setShowWin(true);
      }
      return next;
    });
  }

  function handleNext() {
    setIsSolved(false);
    setShowWin(false);
    setMoves(0);
    advanceToNextLevel();
    if (!getCurrentSession().isActive) {
      router.replace('/');
      return;
    }
    setLevel(new Level(null, null, width, height));
    setRenderKey((k) => k + 1);
  }

  function handlePlayAgain() {
    setIsSolved(false);
    setShowWin(false);
    level.shuffle();
    level.isFrozen = false;
    setRenderKey((k) => k + 1);
  }

  return (
    <View className="flex-1 bg-zinc-900">
      <LevelRenderer
        key={`${level.id}-${renderKey}`}
        width={width}
        height={height}
        level={level}
        onTileClick={tileClick}
      />

      <Pressable
        onPress={() => router.replace('/')}
        className="absolute left-4 top-12 h-10 w-10 items-center justify-center rounded-full bg-black/40"
      >
        <Text className="text-lg text-white">‹</Text>
      </Pressable>

      <View className="absolute right-4 top-12 rounded-xl bg-black/40 px-3 py-1.5">
        <Text className="font-mono text-white">{moves}</Text>
      </View>

      {showWin && (
        <View className="absolute inset-0 items-center justify-center bg-slate-900/60">
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400 }}
            className="mx-8 w-72 rounded-2xl border border-slate-600/30 bg-slate-800 p-8"
          >
            <Text className="mb-2 text-center text-2xl font-light text-slate-100">
              Level Complete
            </Text>
            <Text className="mb-6 text-center text-sm text-slate-400">Well done</Text>
            <Pressable
              onPress={handleNext}
              className="mb-3 rounded-xl border border-slate-500/30 bg-slate-700/60 py-3.5 active:opacity-80"
            >
              <Text className="text-center font-light tracking-wide text-slate-100">Continue</Text>
            </Pressable>
            <Pressable onPress={handlePlayAgain} className="py-2 active:opacity-70">
              <Text className="text-center text-sm font-light text-slate-400">Play Again</Text>
            </Pressable>
          </MotiView>
        </View>
      )}
    </View>
  );
}
