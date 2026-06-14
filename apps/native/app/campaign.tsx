import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CHAPTERS_COUNT,
  LEVELS_PER_CHAPTER,
  isChapterUnlocked,
  isLevelUnlocked,
  getLevelProgress,
  startGameSession,
} from '@tileloop/core';
import { useCampaignProgress } from '../src/hooks/stores';

export default function Campaign() {
  const router = useRouter();
  useCampaignProgress();
  const [chapter, setChapter] = useState(1);
  const unlocked = isChapterUnlocked(chapter);
  const levels = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => i + 1);

  const openLevel = (level: number) => {
    startGameSession('campaign', chapter, level);
    router.push('/play');
  };

  return (
    <View className="flex-1 bg-zinc-950 px-8 pt-16">
      <Pressable
        onPress={() => router.replace('/')}
        className="absolute left-4 top-12 h-10 w-10 items-center justify-center rounded-full bg-black/40"
      >
        <Text className="text-lg text-white">‹</Text>
      </Pressable>

      <View className="mb-8 flex-row items-center justify-between">
        <Pressable
          disabled={chapter <= 1}
          onPress={() => setChapter((c) => Math.max(1, c - 1))}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-700"
        >
          <Text className="text-white">‹</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-white">Chapter {chapter}</Text>
        <Pressable
          disabled={chapter >= CHAPTERS_COUNT}
          onPress={() => setChapter((c) => Math.min(CHAPTERS_COUNT, c + 1))}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-700"
        >
          <Text className="text-white">›</Text>
        </Pressable>
      </View>

      {unlocked ? (
        <View className="flex-row flex-wrap justify-between">
          {levels.map((level) => {
            const progress = getLevelProgress(chapter, level);
            const open = isLevelUnlocked(chapter, level);
            const done = progress?.completed ?? false;
            return (
              <Pressable
                key={level}
                testID={`level-${level}`}
                disabled={!open}
                onPress={() => openLevel(level)}
                className={`mb-4 aspect-square w-[30%] items-center justify-center rounded-xl border-2 ${
                  done
                    ? 'border-emerald-600 bg-emerald-700'
                    : open
                      ? 'border-slate-600 bg-slate-700'
                      : 'border-zinc-700 bg-zinc-800 opacity-40'
                }`}
              >
                <Text className={`text-sm font-bold ${open ? 'text-white' : 'text-zinc-600'}`}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-8">
          <Text className="mb-2 text-center text-lg text-slate-400">Chapter Locked</Text>
          <Text className="text-center text-sm text-slate-500">
            Complete the previous chapter to unlock
          </Text>
        </View>
      )}
    </View>
  );
}
