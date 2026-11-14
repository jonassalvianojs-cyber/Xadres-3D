import React from 'react';
import { soundManager } from '../game/audio';
import { Play, RefreshCw, Home, Pause } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none">
      <div className="w-full max-w-sm bg-stone-950 border border-amber-500/45 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center border border-amber-400/30 bg-stone-900 text-amber-400">
          <Pause size={24} />
        </div>

        <h2 className="text-xl font-bold font-serif text-amber-200 mb-1">Jogo Pausado</h2>
        <p className="text-xs text-stone-400 mb-6">
          O relógio da partida está temporariamente pausado.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              soundManager.playClick();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl font-semibold text-stone-950 text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>Continuar Partida (Esc)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onRestart();
            }}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-stone-200 text-sm flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 transition cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Reiniciar Partida</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onReturnToTitle();
            }}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-stone-400 hover:text-stone-200 text-sm flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-900 border border-stone-800 transition cursor-pointer"
          >
            <Home size={15} />
            <span>Menu Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
