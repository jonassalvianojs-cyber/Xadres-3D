import React, { useEffect } from 'react';
import { GameMode, AIDifficulty, PlayerColor, BoardThemeId } from '../game/types';
import { soundManager } from '../game/audio';
import { Users, Crown, Volume2, VolumeX, Play } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (config: {
    mode: GameMode;
    difficulty: AIDifficulty;
    playerColor: PlayerColor;
    timeMinutes: number;
    theme: BoardThemeId;
  }) => void;
  currentTheme: BoardThemeId;
  onThemeChange: (theme: BoardThemeId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  currentTheme,
  soundEnabled,
  onToggleSound,
}) => {
  const [mode, setMode] = React.useState<GameMode>('ai');
  const [difficulty, setDifficulty] = React.useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = React.useState<PlayerColor>('w');
  const [timeMinutes, setTimeMinutes] = React.useState<number>(10);

  // Keyboard shortcut: Enter or Space starts game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundManager.playClick();
        onStartGame({
          mode,
          difficulty,
          playerColor,
          timeMinutes,
          theme: currentTheme,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, difficulty, playerColor, timeMinutes, currentTheme, onStartGame]);

  const handleStart = () => {
    soundManager.playClick();
    onStartGame({
      mode,
      difficulty,
      playerColor,
      timeMinutes,
      theme: currentTheme,
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between pointer-events-none p-4 md:p-8 select-none">
      {/* Top Header: Branding + Title Lockup leaving center 3D board completely unobstructed */}
      <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-[11px] md:text-xs uppercase tracking-widest text-amber-200/85 font-mono">
              Edição Real 3D · Staunton
            </span>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSound();
            }}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-stone-700/60 transition shadow-lg text-sm cursor-pointer"
            title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-400" /> : <VolumeX size={16} className="text-stone-400" />}
            <span className="hidden sm:inline text-xs">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
          </button>
        </div>

        {/* Bespoke inline SVG Title Lockup */}
        <div className="text-center">
          <svg viewBox="0 0 420 74" className="w-64 md:w-80 max-w-full mx-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="48"
              textAnchor="middle"
              fill="url(#goldGradient)"
              fontFamily="Cinzel, Georgia, serif"
              fontSize="46"
              fontWeight="900"
              letterSpacing="8"
            >
              XADREZ 3D
            </text>
            <line x1="60" y1="62" x2="165" y2="62" stroke="#d4af37" strokeWidth="1.5" strokeOpacity="0.6" />
            <circle cx="210" cy="62" r="3" fill="#fef08a" />
            <line x1="255" y1="62" x2="360" y2="62" stroke="#d4af37" strokeWidth="1.5" strokeOpacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Center Negative Space: 3D Chessboard & all 32 pieces are 100% visible and rotating! */}
      <div className="flex-1" />

      {/* Bottom Compact Setup & Start Dock */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-3">
        <div className="pointer-events-auto w-full bg-stone-950/90 border border-amber-600/35 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Mode */}
            <div className={mode === 'ai' ? 'md:col-span-4' : 'md:col-span-6'}>
              <label className="text-[10px] uppercase tracking-wider text-amber-300/80 font-medium block mb-1.5">
                Modo de Jogo
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setMode('ai');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    mode === 'ai'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-stone-900/70 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Crown size={14} />
                  <span>vs IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setMode('pvp');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    mode === 'pvp'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-stone-900/70 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Users size={14} />
                  <span>2 Jogadores</span>
                </button>
              </div>
            </div>

            {/* AI Difficulty */}
            {mode === 'ai' && (
              <div className="md:col-span-4">
                <label className="text-[10px] uppercase tracking-wider text-amber-300/80 font-medium block mb-1.5">
                  Dificuldade da IA
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'easy', label: 'Fácil' },
                    { id: 'medium', label: 'Médio' },
                    { id: 'hard', label: 'Mestre' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setDifficulty(item.id as AIDifficulty);
                      }}
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        difficulty === item.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-stone-900/70 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color & Time */}
            <div className={mode === 'ai' ? 'md:col-span-4' : 'md:col-span-6'}>
              <div className="grid grid-cols-2 gap-1.5">
                {mode === 'ai' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-amber-300/80 font-medium block mb-1.5">
                      Sua Cor
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPlayerColor('w');
                        }}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
                          playerColor === 'w'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-stone-900/70 border-stone-800 text-stone-400'
                        }`}
                        title="Jogar com Brancas"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-100 border border-stone-400" />
                        <span>Brancas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPlayerColor('b');
                        }}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
                          playerColor === 'b'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-stone-900/70 border-stone-800 text-stone-400'
                        }`}
                        title="Jogar com Pretas"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-950 border border-stone-600" />
                        <span>Pretas</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className={mode === 'pvp' ? 'col-span-2' : ''}>
                  <label className="text-[10px] uppercase tracking-wider text-amber-300/80 font-medium block mb-1.5">
                    Tempo
                  </label>
                  <select
                    value={timeMinutes}
                    onChange={(e) => {
                      soundManager.playClick();
                      setTimeMinutes(Number(e.target.value));
                    }}
                    className="w-full py-2 px-2.5 rounded-xl bg-stone-900/90 border border-stone-700 text-xs text-stone-200 font-medium outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value={0}>Ilimitado</option>
                    <option value={3}>3 minutos</option>
                    <option value={5}>5 minutos</option>
                    <option value={10}>10 minutos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Start CTA */}
          <button
            type="button"
            onClick={handleStart}
            className="w-full mt-3 py-3 px-6 rounded-xl font-semibold text-stone-950 text-sm md:text-base tracking-wide flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] transition transform active:scale-[0.99] cursor-pointer"
          >
            <Play size={18} fill="currentColor" />
            <span>Começar Partida</span>
          </button>
        </div>

        {/* Single flat control-hint line */}
        <p className="text-[11px] text-stone-400/90 font-mono tracking-wider text-center drop-shadow">
          Enter / Espaço Iniciar · Clique na Peça para Mover · Arraste para Girar Câmera · Esc Pausar
        </p>
      </div>
    </div>
  );
};
