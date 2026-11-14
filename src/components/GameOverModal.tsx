import React, { useEffect } from 'react';
import { GameStatus, PieceColor } from '../game/types';
import { soundManager } from '../game/audio';
import { Trophy, RefreshCw, Home, ShieldAlert, Award } from 'lucide-react';

interface GameOverModalProps {
  status: GameStatus;
  userColor: PieceColor;
  mode: 'ai' | 'pvp';
  totalMoves: number;
  onRematch: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  userColor,
  mode,
  totalMoves,
  onRematch,
  onReturnToTitle,
}) => {
  const isWinner = status.winner === userColor;
  const isDraw = status.winner === 'draw' || status.isDraw;

  useEffect(() => {
    if (isDraw) {
      soundManager.playDefeat();
    } else if (mode === 'ai') {
      if (isWinner) soundManager.playVictory();
      else soundManager.playDefeat();
    } else {
      soundManager.playVictory();
    }
  }, [isWinner, isDraw, mode]);

  let title = 'Fim de Jogo';
  let subtitle = '';

  if (status.isCheckmate) {
    if (mode === 'ai') {
      title = isWinner ? 'Vitória Triunfal!' : 'Xeque-Mate!';
      subtitle = isWinner ? 'Você derrotou o adversário com maestria.' : 'O computador venceu a partida por xeque-mate.';
    } else {
      title = `Vitória das ${status.winner === 'w' ? 'Brancas' : 'Pretas'}!`;
      subtitle = 'Partida vencida por xeque-mate no tabuleiro.';
    }
  } else if (status.isStalemate) {
    title = 'Empate por Afogamento';
    subtitle = 'O rei não está em xeque e o jogador não possui lances legais.';
  } else if (status.isInsufficientMaterial) {
    title = 'Empate por Material Insuficiente';
    subtitle = 'Nenhum dos lados possui peças suficientes para aplicar o xeque-mate.';
  } else if (status.isThreefoldRepetition) {
    title = 'Empate por Repetição Tripla';
    subtitle = 'A mesma posição do tabuleiro ocorreu três vezes.';
  } else {
    title = 'Partida Encerrada';
    subtitle = 'Resultado final computado.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 select-none">
      <div className="w-full max-w-md bg-stone-950 border border-amber-500/50 rounded-3xl p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg border border-amber-400/30 bg-gradient-to-b from-stone-900 to-stone-950 text-amber-400">
          {isWinner || (mode === 'pvp' && !isDraw) ? (
            <Trophy size={32} className="text-amber-400" />
          ) : isDraw ? (
            <Award size={32} className="text-stone-300" />
          ) : (
            <ShieldAlert size={32} className="text-red-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold font-serif text-amber-200 mb-2">{title}</h2>
        <p className="text-xs md:text-sm text-stone-300 mb-6 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-2xl bg-stone-900/80 border border-stone-800 text-left">
          <div className="px-2">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Total de Lances</span>
            <span className="text-base font-bold font-mono text-stone-100">{totalMoves}</span>
          </div>
          <div className="px-2 border-l border-stone-800">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">Vencedor</span>
            <span className="text-base font-bold font-serif text-amber-300">
              {status.winner === 'w' ? 'Brancas' : status.winner === 'b' ? 'Pretas' : 'Empate'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onRematch();
            }}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-stone-950 text-sm tracking-wide flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Jogar Novamente</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onReturnToTitle();
            }}
            className="py-3 px-4 rounded-xl font-semibold text-stone-300 hover:text-stone-100 text-sm tracking-wide flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 transition active:scale-95 cursor-pointer"
          >
            <Home size={16} />
            <span>Menu Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
