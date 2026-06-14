import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CHAPTERS_COUNT,
  LEVELS_PER_CHAPTER,
  isChapterUnlocked,
  isLevelUnlocked,
  getLevelProgress,
  startGameSession,
} from '@tileloop/core';
import { useCampaignProgress } from '../hooks/stores';
import GameHeader from '../components/GameHeader';
import ChapterHeader from '../components/campaign/ChapterHeader';
import LevelButton from '../components/campaign/LevelButton';

export default function Campaign() {
  const navigate = useNavigate();
  useCampaignProgress(); // subscribe so the grid reflects progress changes
  const [currentChapter, setCurrentChapter] = useState(1);

  const chapterUnlocked = isChapterUnlocked(currentChapter);
  const levels = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => i + 1);

  const handleLevelClick = (chapter: number, level: number) => {
    startGameSession('campaign', chapter, level);
    navigate('/play');
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900" />
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <GameHeader showBackButton />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-16 pt-20">
        <ChapterHeader
          currentChapter={currentChapter}
          totalChapters={CHAPTERS_COUNT}
          chapterUnlocked={chapterUnlocked}
          onPrevious={() => setCurrentChapter((c) => Math.max(1, c - 1))}
          onNext={() => setCurrentChapter((c) => Math.min(CHAPTERS_COUNT, c + 1))}
        />

        {chapterUnlocked ? (
          <div className="mx-auto w-full max-w-sm">
            <div className="grid grid-cols-3 gap-4" data-testid="level-grid">
              {levels.map((level) => {
                const progress = getLevelProgress(currentChapter, level);
                return (
                  <LevelButton
                    key={level}
                    level={level}
                    unlocked={isLevelUnlocked(currentChapter, level)}
                    completed={progress?.completed ?? false}
                    stars={progress?.stars ?? 0}
                    onClick={() => handleLevelClick(currentChapter, level)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-sm text-center">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-8 backdrop-blur-md">
              <div className="mb-2 text-lg font-medium text-slate-400">Chapter Locked</div>
              <div className="text-sm text-slate-500">
                Complete the previous chapter to unlock
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-2">
          {Array.from({ length: CHAPTERS_COUNT }, (_, i) => i + 1).map((chapterNum) => {
            const unlocked = isChapterUnlocked(chapterNum);
            const isCurrent = chapterNum === currentChapter;
            return (
              <div
                key={chapterNum}
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  !unlocked
                    ? 'bg-zinc-800'
                    : isCurrent
                      ? 'bg-slate-600'
                      : 'bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
