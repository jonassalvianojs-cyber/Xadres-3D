import React, { useState } from 'react';
import { MoveRecord } from '../game/types';
import { soundManager } from '../game/audio';
import { X, Copy, Check } from 'lucide-react';

interface MoveHistoryDrawerProps {
  history: MoveRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const MoveHistoryDrawer: React.FC<MoveHistoryDrawerProps> = ({ history, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Group moves into pairs (White & Black)
  const movePairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }

  const exportNotation = () => {
    soundManager.playClick();
    const text = movePairs
      .map((p) => `${p.num}. ${p.white || ''} ${p.black || ''}`.trim())
      .join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/50 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-sm h-full max-h-[580px] bg-stone-950 border border-stone-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <h3 className="text-base font-bold font-serif text-amber-300">Histórico de Lances</h3>
            <span className="text-xs text-stone-400">Total: {history.length} lances</span>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Moves List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1 pr-1 font-mono text-xs">
          {movePairs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-xs">
              Nenhum lance efetuado ainda.
            </div>
          ) : (
            movePairs.map((pair) => (
              <div
                key={pair.num}
                className="grid grid-cols-6 py-1.5 px-2 rounded-lg hover:bg-stone-900/60 transition text-stone-300"
              >
                <span className="col-span-1 text-stone-500">{pair.num}.</span>
                <span className="col-span-2 text-stone-100 font-semibold">{pair.white}</span>
                <span className="col-span-3 text-stone-300">{pair.black || ''}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={exportNotation}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-700/60 transition disabled:opacity-50"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar PGN'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
