import GameHeader from '../components/GameHeader';

// Placeholder — full campaign grid is built in a later task.
export default function Campaign() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-slate-200">
      <GameHeader showBackButton />
      <h1 className="text-2xl font-light tracking-wide" data-testid="campaign-heading">
        Campaign
      </h1>
    </div>
  );
}
