import { Star, Lock } from 'lucide-react';

interface LevelButtonProps {
  level: number;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  onClick: () => void;
}

export default function LevelButton({
  level,
  unlocked,
  completed,
  stars,
  onClick,
}: LevelButtonProps) {
  const inner = [
    'relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition-all duration-300',
    unlocked && !completed
      ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500 shadow-lg hover:shadow-xl group-active:scale-95'
      : '',
    completed
      ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 border-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:border-emerald-500 shadow-lg hover:shadow-xl group-active:scale-95'
      : '',
    !unlocked ? 'bg-zinc-800 border-zinc-700' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-testid={`level-${level}`}
      onClick={unlocked ? onClick : undefined}
      className={`group relative flex aspect-square select-none flex-col items-center justify-center transition-all duration-300 ${
        unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
      }`}
    >
      <div className={inner}>
        {unlocked && (
          <div className="absolute inset-0 opacity-10">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '8px 8px',
              }}
            />
          </div>
        )}

        {!unlocked && <Lock size={20} className="mb-1 text-zinc-600" />}

        {completed && stars > 0 && (
          <div className="mb-1 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                size={8}
                className={i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-emerald-400'}
              />
            ))}
          </div>
        )}

        <div
          className={`text-sm font-bold tracking-wide ${unlocked ? 'text-white' : 'text-zinc-600'}`}
        >
          {level}
        </div>
      </div>
    </div>
  );
}
