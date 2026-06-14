import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

/** Tap-to-start splash screen. */
export default function Splash() {
  const navigate = useNavigate();
  const [showLogo, setShowLogo] = useState(false);
  const [showTapPrompt, setShowTapPrompt] = useState(false);
  const [canNavigate, setCanNavigate] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowLogo(true), 400);
    const t2 = setTimeout(() => {
      setShowTapPrompt(true);
      setCanNavigate(true);
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleTap = () => {
    if (canNavigate) navigate('/menu');
  };

  return (
    <div
      data-testid="splash"
      onClick={handleTap}
      className="fixed inset-0 flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-zinc-950"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900 opacity-80" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8">
        <div className="flex flex-1 items-center justify-center">
          {showLogo && (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-6xl font-bold tracking-wider text-white md:text-8xl"
            >
              LOOP
            </motion.h1>
          )}
        </div>
        <motion.div
          className="pb-16 md:pb-24"
          animate={{ opacity: showTapPrompt ? [0.6, 1, 0.6] : 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <p className="text-lg font-light tracking-wide text-slate-300 md:text-xl">
            tap anywhere to start
          </p>
        </motion.div>
      </div>
    </div>
  );
}
