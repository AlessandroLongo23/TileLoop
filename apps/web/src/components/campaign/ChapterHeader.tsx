import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

interface ChapterHeaderProps {
  currentChapter: number;
  totalChapters: number;
  chapterUnlocked: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ChapterHeader({
  currentChapter,
  totalChapters,
  chapterUnlocked,
  onPrevious,
  onNext,
}: ChapterHeaderProps) {
  const canGoPrevious = currentChapter > 1;
  const canGoNext = currentChapter < totalChapters;

  const navBtn = (enabled: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
      enabled
        ? 'border border-slate-600 bg-slate-700 text-white shadow-lg hover:bg-slate-600 active:scale-95'
        : 'cursor-not-allowed text-slate-600 opacity-30'
    }`;

  return (
    <div className="mx-auto mb-8 flex w-full max-w-sm items-center justify-between">
      <button
        onClick={canGoPrevious ? onPrevious : undefined}
        disabled={!canGoPrevious}
        aria-label="Previous chapter"
        className={navBtn(canGoPrevious)}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex flex-col items-center">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/60">
          Campaign
        </div>
        <div className="flex items-center gap-2">
          {!chapterUnlocked && <Lock size={16} className="text-slate-500" />}
          <h2
            className={`text-2xl font-bold tracking-wide ${
              chapterUnlocked ? 'text-white' : 'text-slate-500'
            }`}
          >
            Chapter {currentChapter}
          </h2>
        </div>
      </div>

      <button
        onClick={canGoNext ? onNext : undefined}
        disabled={!canGoNext}
        aria-label="Next chapter"
        className={navBtn(canGoNext)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
