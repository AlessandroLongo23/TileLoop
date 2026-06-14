import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Clock, Target, Leaf } from 'lucide-react';
import {
  getCurrentCampaignProgress,
  getCurrentModeProgress,
  startGameSession,
} from '@tileloop/core';
import GameHeader from '../components/GameHeader';

const modeButton =
  'group relative w-full overflow-hidden rounded-xl border border-slate-600/30 bg-slate-800/60 px-8 py-4 text-lg font-light tracking-wide text-slate-100 backdrop-blur-sm transition-all duration-300 hover:border-slate-500/40 hover:bg-slate-700/60 active:scale-[0.98]';

export default function Menu() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  const campaign = getCurrentCampaignProgress();
  const zen = getCurrentModeProgress('zen');
  const timeAttack = getCurrentModeProgress('timeattack');
  const precision = getCurrentModeProgress('precision');

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  const start = (mode: 'zen' | 'timeattack' | 'precision') => {
    startGameSession(mode);
    navigate('/play');
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <GameHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-16">
        {show && (
          <motion.div
            className="mb-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="mb-4 text-center text-5xl font-light tracking-[0.3em] text-slate-100 md:text-6xl">
              LOOP
            </h1>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-400/60 to-transparent" />
          </motion.div>
        )}

        {show && (
          <motion.div
            className="w-full max-w-sm space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <button onClick={() => navigate('/campaign')} className={modeButton} data-testid="mode-campaign">
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                  <BookOpen size={16} className="-mb-[2px] text-blue-400" />
                  <span className="text-lg">Campaign</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-400">
                    Chapter {campaign.currentChapter} • Level {campaign.currentLevel}
                  </span>
                  <div className="h-1 w-24 rounded-full bg-slate-600/40">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                      style={{ width: `${(campaign.totalCompleted / campaign.totalLevels) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>

            <button onClick={() => start('timeattack')} className={modeButton} data-testid="mode-timeattack">
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                  <Clock size={16} className="-mb-[2px] text-amber-400" />
                  <span className="text-lg">Time Attack</span>
                </div>
                <span className="text-xs font-semibold text-amber-400">Level {timeAttack.currentLevel}</span>
              </div>
            </button>

            <button onClick={() => start('precision')} className={modeButton} data-testid="mode-precision">
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                  <Target size={16} className="-mb-[2px] text-indigo-400" />
                  <span className="text-lg">Precision</span>
                </div>
                <span className="text-xs font-semibold text-indigo-400">Level {precision.currentLevel}</span>
              </div>
            </button>

            <button onClick={() => start('zen')} className={modeButton} data-testid="mode-zen">
              <div className="relative flex flex-col items-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                  <Leaf size={16} className="text-emerald-400" />
                  <span className="text-lg">Zen</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">Level {zen.currentLevel}</span>
              </div>
            </button>
          </motion.div>
        )}

        {show && (
          <motion.div
            className="mt-20 text-sm font-light tracking-wide text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Connect the loops
          </motion.div>
        )}
      </main>
    </div>
  );
}
