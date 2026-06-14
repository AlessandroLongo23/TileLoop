import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX, Smartphone, Music, X } from 'lucide-react';
import { useGameSettings, useGameStats, setGameSettings } from '../hooks/stores';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-slate-600 peer-checked:after:translate-x-full" />
    </label>
  );
}

export default function GameSettings({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const settings = useGameSettings();
  const stats = useGameStats();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-testid="settings-modal"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-4 mb-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-700 p-6">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <h3 className="mb-4 text-lg font-medium text-white">Audio</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.soundEnabled ? (
                        <Volume2 size={20} className="text-slate-400" />
                      ) : (
                        <VolumeX size={20} className="text-slate-400" />
                      )}
                      <span className="text-slate-300">Sound Effects</span>
                    </div>
                    <Toggle
                      label="Sound Effects"
                      checked={settings.soundEnabled}
                      onChange={(v) => setGameSettings({ soundEnabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.musicEnabled ? (
                        <Music size={20} className="text-slate-400" />
                      ) : (
                        <VolumeX size={20} className="text-slate-400" />
                      )}
                      <span className="text-slate-300">Background Music</span>
                    </div>
                    <Toggle
                      label="Background Music"
                      checked={settings.musicEnabled}
                      onChange={(v) => setGameSettings({ musicEnabled: v })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-white">Gameplay</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Auto-Save Progress</span>
                    <Toggle
                      label="Auto-Save Progress"
                      checked={settings.autoSave}
                      onChange={(v) => setGameSettings({ autoSave: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className="text-slate-400" />
                      <span className="text-slate-300">Vibration</span>
                    </div>
                    <Toggle
                      label="Vibration"
                      checked={settings.vibrationEnabled}
                      onChange={(v) => setGameSettings({ vibrationEnabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Animations</span>
                    <Toggle
                      label="Animations"
                      checked={settings.showAnimations}
                      onChange={(v) => setGameSettings({ showAnimations: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Difficulty</span>
                    <select
                      value={settings.difficulty}
                      onChange={(e) =>
                        setGameSettings({ difficulty: e.target.value as typeof settings.difficulty })
                      }
                      className="min-w-20 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="normal">Normal</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-white">Statistics</h3>
                <div className="space-y-2 rounded-xl bg-zinc-800/50 p-4">
                  <Stat label="Total Play Time" value={formatTime(stats.totalPlayTime)} />
                  <Stat label="Levels Completed" value={String(stats.totalLevelsCompleted)} />
                  <Stat label="Total Moves" value={stats.totalMoves.toLocaleString()} />
                  <Stat label="First Played" value={formatDate(stats.firstPlayDate)} />
                  <Stat label="Last Played" value={formatDate(stats.lastPlayDate)} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
