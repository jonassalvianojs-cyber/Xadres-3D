import React from 'react';
import { PieceType, PieceColor } from '../game/types';
import { soundManager } from '../game/audio';

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (piece: PieceType) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect }) => {
  const options: { type: PieceType; label: string; symbol: string }[] = [
    { type: 'q', label: 'Rainha', symbol: '♛' },
    { type: 'r', label: 'Torre', symbol: '♜' },
    { type: 'b', label: 'Bispo', symbol: '♝' },
    { type: 'n', label: 'Cavalo', symbol: '♞' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-none p-4">
      <div className="w-full max-w-sm bg-stone-950 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center">
        <h3 className="text-lg font-bold text-amber-300 font-serif mb-1">
          Promoção de Peão
        </h3>
        <p className="text-xs text-stone-400 mb-5">
          Escolha a peça para a qual seu peão será promovido:
        </p>

        <div className="grid grid-cols-4 gap-3">
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                soundManager.playPromote();
                onSelect(opt.type);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-400 hover:bg-stone-800 text-stone-100 transition transform hover:-translate-y-1 shadow-lg cursor-pointer"
            >
              <span className="text-3xl mb-1 font-serif text-amber-200">
                {opt.symbol}
              </span>
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
