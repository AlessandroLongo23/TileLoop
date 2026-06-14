import { AnimatePresence, motion } from 'motion/react';
import { Palette, Triangle, Square, Hexagon, X } from 'lucide-react';
import { tilesets } from '@tileloop/core';
import { useAppearance, setShapeTileset, type ShapeKey } from '../hooks/stores';

const shapes: { id: ShapeKey; name: string; Icon: typeof Triangle }[] = [
  { id: 'triangle', name: 'Triangle', Icon: Triangle },
  { id: 'square', name: 'Square', Icon: Square },
  { id: 'hexagon', name: 'Hexagon', Icon: Hexagon },
];

export default function AppearanceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const appearance = useAppearance();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-testid="appearance-modal"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-4 mb-4 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-zinc-700 bg-zinc-900 p-6">
              <div className="flex items-center gap-3">
                <Palette size={24} className="text-slate-400" />
                <h2 className="text-xl font-semibold text-white">Appearance</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close appearance"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors duration-200 hover:bg-zinc-700 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-8 p-6">
              <div className="space-y-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Shape Tilesets</h3>
                {shapes.map(({ id, name, Icon }) => (
                  <div key={id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-white" />
                      <h4 className="text-md font-medium text-white">{name}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {tilesets.map((tileset) => {
                        const isSelected = appearance.shapeStyles[id].tileset === tileset;
                        return (
                          <button
                            key={tileset}
                            data-testid={`tileset-${id}-${tileset}`}
                            onClick={() => setShapeTileset(id, tileset)}
                            className={`rounded-lg border p-3 transition-all duration-200 ${
                              isSelected
                                ? 'border-slate-500 bg-slate-600 text-white'
                                : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700'
                            }`}
                          >
                            <div className="text-sm font-medium capitalize">{tileset}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
