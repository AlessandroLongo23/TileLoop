import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ArrowRight, Clock, Target } from 'lucide-react';

interface WinModalProps {
  celebrationStage: number;
  gameMode?: string;
  timer?: number;
  moves?: number;
  handleNextLevel: () => void;
  handlePlayAgain: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const backOut = [0.34, 1.56, 0.64, 1] as const;
const quintOut = [0.22, 1, 0.36, 1] as const;

export default function WinModal({
  celebrationStage,
  gameMode = '',
  timer = 0,
  moves = 0,
  handleNextLevel,
  handlePlayAgain,
}: WinModalProps) {
  const showTime = gameMode === 'campaign' || gameMode === 'timeattack';
  const showMoves = gameMode === 'campaign' || gameMode === 'precision';
  const showStats = showTime || showMoves;

  return (
    <AnimatePresence>
      {celebrationStage >= 2 && (
        <motion.div
          data-testid="win-modal"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <motion.div
            className="relative mx-4 max-w-xs rounded-2xl border border-slate-600/30 bg-slate-800/95 shadow-2xl backdrop-blur-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: backOut }}
          >
            <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />

            <div className="p-8 text-center">
              {celebrationStage >= 3 && (
                <motion.div
                  className="mb-6 flex justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2, ease: backOut }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-slate-400/20 blur-lg" />
                    <div className="relative rounded-full border border-slate-500/50 bg-slate-700/80 p-3">
                      <CheckCircle2 size={32} className="text-slate-200" />
                    </div>
                  </div>
                </motion.div>
              )}

              {celebrationStage >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: quintOut }}
                >
                  <h2 className="mb-2 text-2xl font-light tracking-wide text-slate-100">
                    Level Complete
                  </h2>
                  <p className="mb-6 text-sm font-light tracking-wide text-slate-400">Well done</p>
                </motion.div>
              )}

              {celebrationStage >= 4 && showStats && (
                <motion.div
                  className="mb-8 flex justify-center gap-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: quintOut }}
                >
                  {showTime && (
                    <div className="flex flex-col items-center">
                      <div className="mb-1 flex items-center gap-1.5 rounded-lg border border-slate-600/30 bg-slate-700/40 px-3 py-1.5">
                        <Clock size={14} className="text-slate-300" />
                        <span className="font-mono text-sm text-slate-200">{formatTime(timer)}</span>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-slate-500">Time</span>
                    </div>
                  )}
                  {showMoves && (
                    <div className="flex flex-col items-center">
                      <div className="mb-1 flex items-center gap-1.5 rounded-lg border border-slate-600/30 bg-slate-700/40 px-3 py-1.5">
                        <Target size={14} className="text-slate-300" />
                        <span className="font-mono text-sm text-slate-200">{moves}</span>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-slate-500">Moves</span>
                    </div>
                  )}
                </motion.div>
              )}

              {celebrationStage >= 5 && (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: quintOut }}
                >
                  <button
                    data-testid="next-level"
                    onClick={handleNextLevel}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-500/30 bg-slate-700/60 px-6 py-3.5 font-light text-slate-100 transition-all duration-300 hover:border-slate-400/40 hover:bg-slate-600/60"
                  >
                    <span className="tracking-wide">Continue</span>
                    <ArrowRight size={16} className="text-slate-300" />
                  </button>
                  <button
                    onClick={handlePlayAgain}
                    className="w-full px-6 py-2 text-sm font-light tracking-wide text-slate-400 transition-all duration-300 hover:text-slate-300"
                  >
                    Play Again
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
