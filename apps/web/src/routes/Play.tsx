import GameHeader from '../components/GameHeader';

// Placeholder — the full play loop is built in a later task.
export default function Play() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-zinc-900 text-slate-200">
      <GameHeader showBackButton />
      <h1 className="text-2xl font-light tracking-wide" data-testid="play-heading">
        Play
      </h1>
    </div>
  );
}
