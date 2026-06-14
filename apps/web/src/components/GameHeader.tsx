import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Palette, ArrowLeft, Clock, Target } from 'lucide-react';
import GameSettings from './GameSettings';
import AppearanceModal from './AppearanceModal';

interface GameHeaderProps {
  showLevelInfo?: boolean;
  showBackButton?: boolean;
  showStats?: boolean;
  gameMode?: string;
  levelId?: string;
  timer?: number;
  moves?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatLevelDisplay(mode: string, id: string): string {
  if (mode === 'campaign') return id.replaceAll('-', ' - ');
  if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') return `Level ${id}`;
  return id;
}

function getModeDisplayName(mode: string): string {
  switch (mode) {
    case 'timeattack':
      return 'Time Attack';
    case 'precision':
      return 'Precision';
    case 'zen':
      return 'Zen';
    case 'campaign':
      return 'Campaign';
    default:
      return mode;
  }
}

const roundBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-black/40 hover:text-white active:scale-95';

export default function GameHeader({
  showLevelInfo = false,
  showBackButton = false,
  showStats = false,
  gameMode = '',
  levelId = '',
  timer = 0,
  moves = 0,
}: GameHeaderProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  const goBack = () => navigate(gameMode === 'campaign' ? '/campaign' : '/menu');

  return (
    <>
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-40">
        <div className="flex items-start justify-between p-4 pt-6">
          <div className="pointer-events-auto flex gap-3">
            {showBackButton && (
              <button onClick={goBack} aria-label="Back" className={roundBtn}>
                <ArrowLeft size={18} />
              </button>
            )}
            {gameMode !== '' && (
              <button
                onClick={() => setShowAppearance(true)}
                aria-label="Appearance"
                className={roundBtn}
              >
                <Palette size={18} />
              </button>
            )}
          </div>

          {showLevelInfo && (
            <div className="pointer-events-none flex w-40 flex-col items-center gap-4 rounded-2xl border border-white/20 bg-black/30 py-2 shadow-xl backdrop-blur-lg">
              <div className="flex flex-col gap-2">
                <div className="text-center text-xs font-semibold uppercase tracking-widest text-white/90">
                  {getModeDisplayName(gameMode)}
                </div>
                <div className="text-center text-xl font-bold tracking-wide text-white">
                  {formatLevelDisplay(gameMode, levelId)}
                </div>
              </div>
              {showStats && gameMode !== 'zen' && (
                <div className="flex justify-center gap-2">
                  {(gameMode === 'timeattack' || gameMode === 'campaign') && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/30 px-2.5 py-1.5">
                      <Clock size={10} className="text-white/80" />
                      <span className="font-mono text-xs font-medium text-white">
                        {formatTime(timer)}
                      </span>
                    </div>
                  )}
                  {(gameMode === 'precision' || gameMode === 'campaign') && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/30 px-2.5 py-1.5">
                      <Target size={10} className="text-white/80" />
                      <span className="font-mono text-xs font-medium text-white" data-testid="moves">
                        {moves}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pointer-events-auto flex gap-3">
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className={roundBtn}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <AppearanceModal isOpen={showAppearance} onClose={() => setShowAppearance(false)} />
    </>
  );
}
