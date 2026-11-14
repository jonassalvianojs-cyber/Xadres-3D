import React, { useState, useEffect } from 'react';
import {
  PieceColor,
  CapturedPieces,
  CameraPreset,
  BoardThemeId,
  GameMode,
  PieceType,
  AiThinkingState,
} from '../game/types';
import { BOARD_THEMES } from '../game/materials';
import { soundManager } from '../game/audio';
import {
  RotateCcw,
  Lightbulb,
  Camera,
  Palette,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  History,
  Home,
  User,
  Bot,
  AlertCircle,
  Cpu,
  Brain,
  Pause,
} from 'lucide-react';

interface ChessHUDProps {
  turn: PieceColor;
  isCheck: boolean;
  gameMode: GameMode;
  playerSide: PieceColor;
  captured: CapturedPieces;
  materialDiff: number;
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
  timeLimitMinutes: number;
  currentTheme: BoardThemeId;
  onThemeSelect: (theme: BoardThemeId) => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onUndo: () => void;
  canUndo: boolean;
  onHint: () => void;
  hintMove: string | null;
  onOpenHistory: () => void;
  onPause: () => void;
  onReturnToTitle: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  aiThinking: AiThinkingState | null;
  showAiThoughts: boolean;
  onToggleAiThoughts: () => void;
  moveCount: number;
  hasSelection: boolean;
}

const PIECE_SYMBOLS: Record<PieceType, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

export const ChessHUD: React.FC<ChessHUDProps> = ({
  turn,
  isCheck,
  gameMode,
  playerSide,
  captured,
  materialDiff,
  whiteTime,
  blackTime,
  timeLimitMinutes,
  currentTheme,
  onThemeSelect,
  onCameraPreset,
  onUndo,
  canUndo,
  onHint,
  hintMove,
  onOpenHistory,
  onPause,
  onReturnToTitle,
  soundEnabled,
  onToggleSound,
  aiThinking,
  showAiThoughts,
  onToggleAiThoughts,
  moveCount,
  hasSelection,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCameraPicker, setShowCameraPicker] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isWhiteAi = gameMode === 'ai' && playerSide === 'b';
  const isBlackAi = gameMode === 'ai' && playerSide === 'w';

  const isWhiteThinking = isWhiteAi && aiThinking?.isThinking && turn === 'w';
  const isBlackThinking = isBlackAi && aiThinking?.isThinking && turn === 'b';

  const formatTime = (seconds: number) => {
    if (timeLimitMinutes === 0) return '∞';
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.floor(Math.max(0, seconds) % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none">
      {/* --- TOP CLUSTERS: PLAYER CARDS & STATUS (Unobstructive perimeter) --- */}
      <div>
        <div className="flex items-start justify-between w-full max-w-6xl mx-auto gap-3">
          {/* White Player Card */}
          <div
            className={`pointer-events-auto relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition shadow-lg ${
              isWhiteThinking
                ? 'bg-stone-900/95 border-cyan-400/90 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
                : turn === 'w'
                ? 'bg-stone-900/90 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-stone-950/75 border-stone-800/80 opacity-80'
            }`}
          >
            <div className="relative">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-md transition ${
                  isWhiteThinking
                    ? 'bg-cyan-500 text-stone-950'
                    : 'bg-stone-100 text-stone-950'
                }`}
              >
                {isWhiteAi ? (
                  isWhiteThinking ? <Brain size={20} /> : <Bot size={20} />
                ) : (
                  <User size={20} />
                )}
              </div>
              {turn === 'w' && (
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-stone-900 ${
                    isWhiteThinking ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-200">
                  {isWhiteAi ? 'Computador (Brancas)' : 'Brancas'}
                </span>
                {materialDiff > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    +{materialDiff}
                  </span>
                )}
              </div>

              {/* Status / Captured Pieces Rack */}
              {isWhiteThinking ? (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 h-4">
                  <Cpu size={12} className="text-cyan-400" />
                  <span>P:{aiThinking.depth} · {aiThinking.nodesCount.toLocaleString('pt-BR')} nós</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-xs text-stone-400 h-4">
                  {captured.b.slice(0, 10).map((p, idx) => (
                    <span key={idx} className="text-stone-300 scale-90 inline-block font-serif">
                      {PIECE_SYMBOLS[p]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Clock Timer */}
            <div
              className={`font-mono tabular-nums text-base md:text-lg font-bold pl-2 border-l border-stone-800 ${
                isWhiteThinking ? 'text-cyan-300' : turn === 'w' ? 'text-amber-300' : 'text-stone-400'
              }`}
            >
              {formatTime(whiteTime)}
            </div>

            {/* Bottom calculation progress line on thinking card */}
            {isWhiteThinking && (
              <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-cyan-400/80 rounded-full transition-all duration-100" style={{ width: `${aiThinking.progress}%` }} />
            )}
          </div>

          {/* Center Check Alert / Turn Notice */}
          <div className="flex flex-col items-center">
            {isCheck && (
              <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-300 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <AlertCircle size={14} className="text-red-400" />
                <span>XEQUE!</span>
              </div>
            )}
            {hintMove && (
              <div className="mt-1 px-3 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-[11px] font-mono shadow">
                Dica: lance sugerido {hintMove}
              </div>
            )}
            {!isCheck && !hintMove && !aiThinking?.isThinking && moveCount < 2 && (
              <div className="hidden md:flex px-3 py-1 rounded-full bg-stone-950/85 border border-amber-500/35 text-amber-200/90 text-[11px] font-medium shadow">
                {hasSelection
                  ? 'Clique na casa destacada para mover'
                  : `Vez das ${turn === 'w' ? 'Brancas' : 'Pretas'} · Clique em uma peça no tabuleiro`}
              </div>
            )}
          </div>

          {/* Black Player Card */}
          <div
            className={`pointer-events-auto relative flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition shadow-lg ${
              isBlackThinking
                ? 'bg-stone-900/95 border-cyan-400/90 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
                : turn === 'b'
                ? 'bg-stone-900/90 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-stone-950/75 border-stone-800/80 opacity-80'
            }`}
          >
            {/* Clock Timer */}
            <div
              className={`font-mono tabular-nums text-base md:text-lg font-bold pr-2 border-r border-stone-800 ${
                isBlackThinking ? 'text-cyan-300' : turn === 'b' ? 'text-amber-300' : 'text-stone-400'
              }`}
            >
              {formatTime(blackTime)}
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                {materialDiff < 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    +{Math.abs(materialDiff)}
                  </span>
                )}
                <span className="text-xs font-semibold text-stone-200">
                  {isBlackAi ? 'Computador (Pretas)' : 'Pretas'}
                </span>
              </div>

              {/* Status / Captured Pieces Rack */}
              {isBlackThinking ? (
                <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono text-cyan-300 h-4">
                  <span>P:{aiThinking.depth} · {aiThinking.nodesCount.toLocaleString('pt-BR')} nós</span>
                  <Cpu size={12} className="text-cyan-400" />
                </div>
              ) : (
                <div className="flex items-center justify-end gap-0.5 text-xs text-stone-400 h-4">
                  {captured.w.slice(0, 10).map((p, idx) => (
                    <span key={idx} className="text-stone-300 scale-90 inline-block font-serif">
                      {PIECE_SYMBOLS[p]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold shadow-md transition ${
                  isBlackThinking
                    ? 'bg-cyan-500 text-stone-950 border-cyan-400'
                    : 'bg-stone-950 border-stone-700 text-stone-200'
                }`}
              >
                {isBlackAi ? (
                  isBlackThinking ? <Brain size={20} /> : <Bot size={20} />
                ) : (
                  <User size={20} />
                )}
              </div>
              {turn === 'b' && (
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-stone-900 ${
                    isBlackThinking ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                />
              )}
            </div>

            {/* Bottom calculation progress line on thinking card */}
            {isBlackThinking && (
              <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-cyan-400/80 rounded-full transition-all duration-100" style={{ width: `${aiThinking.progress}%` }} />
            )}
          </div>
        </div>

        {/* Live Thought Bubble / Calculation Centerpiece */}
        {showAiThoughts && aiThinking?.isThinking && (
          <div className="pointer-events-auto mt-2.5 max-w-lg mx-auto px-4 py-2.5 rounded-2xl bg-stone-950/90 border border-cyan-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-none transition-all">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300/90 mb-1">
              <div className="flex items-center gap-1.5">
                <Brain size={14} className="text-cyan-400" />
                <span className="font-semibold uppercase tracking-wider">Computador pensando</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-[10px]">
                  {aiThinking.candidateMove}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>{aiThinking.nodesCount.toLocaleString('pt-BR')} posições</span>
                <span className="text-amber-300 font-bold">
                  {aiThinking.evaluation > 0 ? `+${aiThinking.evaluation.toFixed(2)}` : aiThinking.evaluation.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-200 truncate font-sans">
              {aiThinking.tacticalThought}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-stone-900 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-150"
                style={{ width: `${aiThinking.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Zero Viewport Occlusion) --- */}
      <div className="pointer-events-auto mx-auto flex flex-col items-center">
        {/* Collapse Toggle Tab */}
        <button
          onClick={() => {
            soundManager.playClick();
            setDockCollapsed(!dockCollapsed);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 border-t border-x border-stone-700 text-xs font-medium transition cursor-pointer shadow-md"
        >
          {dockCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{dockCollapsed ? 'Mostrar Controles (H)' : 'Ocultar (H)'}</span>
        </button>

        {/* Dock Bar */}
        {!dockCollapsed && (
          <div className="relative flex flex-wrap items-center justify-center gap-1.5 md:gap-2 p-2 rounded-2xl bg-stone-950/90 border border-stone-700/80 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-none max-w-[94vw]">
            {/* Camera Views Dropdown/Pills */}
            <div className="relative">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowCameraPicker(!showCameraPicker);
                  setShowThemePicker(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 text-xs font-medium border border-stone-700/50 transition cursor-pointer"
                title="Câmera 3D"
              >
                <Camera size={15} className="text-amber-400" />
                <span className="hidden sm:inline">Câmera</span>
              </button>

              {showCameraPicker && (
                <div className="absolute bottom-full mb-2 left-0 w-40 p-1.5 rounded-xl bg-stone-950 border border-stone-700 shadow-xl flex flex-col gap-1 z-50">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onCameraPreset('white');
                      setShowCameraPicker(false);
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg text-xs text-stone-200 hover:bg-stone-800 transition"
                  >
                    Perspectiva Brancas
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onCameraPreset('black');
                      setShowCameraPicker(false);
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg text-xs text-stone-200 hover:bg-stone-800 transition"
                  >
                    Perspectiva Pretas
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onCameraPreset('top');
                      setShowCameraPicker(false);
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg text-xs text-stone-200 hover:bg-stone-800 transition"
                  >
                    Vista Superior (2D)
                  </button>
                </div>
              )}
            </div>

            {/* Undo Move Button */}
            <button
              onClick={() => {
                if (canUndo) {
                  soundManager.playClick();
                  onUndo();
                }
              }}
              disabled={!canUndo}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                canUndo
                  ? 'bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-stone-700/50 cursor-pointer'
                  : 'bg-stone-950/40 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
              title="Desfazer Lance"
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Desfazer</span>
            </button>

            {/* Hint Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onHint();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-amber-300 text-xs font-medium border border-stone-700/50 transition cursor-pointer"
              title="Obter Dica Estratégica"
            >
              <Lightbulb size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Dica</span>
            </button>

            {/* History Drawer Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 text-xs font-medium border border-stone-700/50 transition cursor-pointer"
              title="Histórico de Lances"
            >
              <History size={15} className="text-stone-400" />
              <span className="hidden sm:inline">Lances</span>
            </button>

            {/* AI Thought Stream Toggle */}
            {gameMode === 'ai' && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onToggleAiThoughts();
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  showAiThoughts
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-stone-900/80 text-stone-400 border-stone-700/50 hover:text-stone-200 hover:bg-stone-800'
                }`}
                title={showAiThoughts ? 'Ocultar fluxo de pensamentos da IA' : 'Ver fluxo de pensamentos da IA'}
              >
                <Brain size={15} className={showAiThoughts ? 'text-cyan-400' : 'text-stone-400'} />
                <span className="hidden sm:inline">Pensamentos</span>
              </button>
            )}

            {/* Theme Picker */}
            <div className="relative">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowThemePicker(!showThemePicker);
                  setShowCameraPicker(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 text-xs font-medium border border-stone-700/50 transition cursor-pointer"
                title="Trocar Estilo do Tabuleiro"
              >
                <Palette size={15} className="text-purple-400" />
                <span className="hidden sm:inline">Temas</span>
              </button>

              {showThemePicker && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-1.5 rounded-xl bg-stone-950 border border-stone-700 shadow-xl flex flex-col gap-1 z-50">
                  {Object.values(BOARD_THEMES).map((th) => (
                    <button
                      key={th.id}
                      onClick={() => {
                        soundManager.playClick();
                        onThemeSelect(th.id);
                        setShowThemePicker(false);
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                        currentTheme === th.id
                          ? 'bg-amber-500/20 text-amber-200 font-semibold'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <span>{th.name}</span>
                      <span
                        className="w-3 h-3 rounded-full border border-stone-600 inline-block"
                        style={{ backgroundColor: th.lightSquareColor }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                soundManager.playClick();
                onToggleSound();
              }}
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700/50 transition cursor-pointer"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
            >
              {soundEnabled ? <Volume2 size={15} className="text-amber-400" /> : <VolumeX size={15} className="text-stone-500" />}
            </button>

            {/* Pause */}
            <button
              onClick={() => {
                soundManager.playClick();
                onPause();
              }}
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/50 transition cursor-pointer"
              title="Pausar (Esc)"
            >
              <Pause size={15} />
            </button>

            {/* Return to Title */}
            <button
              onClick={() => {
                soundManager.playClick();
                onReturnToTitle();
              }}
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-red-400 border border-stone-700/50 transition cursor-pointer"
              title="Voltar ao Menu Principal"
            >
              <Home size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
