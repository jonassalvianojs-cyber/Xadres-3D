import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChessScene } from './game/ChessScene';
import { ChessGameEngine } from './game/chessEngine';
import { soundManager } from './game/audio';
import {
  Square,
  PieceType,
  PieceColor,
  GameMode,
  AIDifficulty,
  PlayerColor,
  BoardThemeId,
  CameraPreset,
  CapturedPieces,
  GameStatus,
  MoveRecord,
  AiThinkingState,
} from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { ChessHUD } from './components/ChessHUD';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { MoveHistoryDrawer } from './components/MoveHistoryDrawer';
import { PauseModal } from './components/PauseModal';

type GameScreen = 'title' | 'playing';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const engineRef = useRef<ChessGameEngine>(new ChessGameEngine());

  // Game configuration & screen state
  const [screen, setScreen] = useState<GameScreen>('title');
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerSide, setPlayerSide] = useState<PlayerColor>('w');
  const [theme, setTheme] = useState<BoardThemeId>('classic_wood');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play session state
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    isStalemate: false,
    isThreefoldRepetition: false,
    isInsufficientMaterial: false,
    winner: null,
    turn: 'w',
  });
  const [captured, setCaptured] = useState<CapturedPieces>({ w: [], b: [] });
  const [materialDiff, setMaterialDiff] = useState<number>(0);
  const [history, setHistory] = useState<MoveRecord[]>([]);

  // Promotion handling
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Timers
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(10);
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);

  // UI state
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [aiThinkingState, setAiThinkingState] = useState<AiThinkingState | null>(null);
  const [showAiThoughts, setShowAiThoughts] = useState<boolean>(true);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new ChessScene(canvasMountRef.current, theme);
    sceneRef.current = scene;

    // Initial board setup
    scene.syncBoard(engineRef.current.getBoard());
    scene.syncCapturedPieces(engineRef.current.getCapturedPieces());

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Sync turn, status & captured counts
  const updateBoardState = useCallback(() => {
    const engine = engineRef.current;
    const status = engine.getStatus();
    const capturedPieces = engine.getCapturedPieces();
    setGameStatus(status);
    setTurn(status.turn);
    setCaptured(capturedPieces);
    setMaterialDiff(engine.getMaterialScore().diff);
    setHistory(engine.getHistory());

    if (sceneRef.current) {
      sceneRef.current.syncCapturedPieces(capturedPieces);
      if (status.isCheck) {
        soundManager.playCheck();
        // Find king square of player in check
        const board = engine.getBoard();
        let kingSq: Square | null = null;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.type === 'k' && p.color === status.turn) {
              kingSq = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
              break;
            }
          }
        }
        sceneRef.current.setCheckSquare(kingSq);
      } else {
        sceneRef.current.setCheckSquare(null);
      }
    }

    if (status.isCheckmate || status.isDraw) {
      setShowGameOverModal(true);
    }
  }, []);

  // Execute a verified move
  const executeMove = useCallback((from: Square, to: Square, promoPiece: PieceType = 'q') => {
    const engine = engineRef.current;
    const movingPiece = engine.getPieceAt(from);
    const targetPiece = engine.getPieceAt(to);

    const isCapture = !!targetPiece || (movingPiece?.type === 'p' && from[0] !== to[0]);

    const moveResult = engine.makeMove(from, to, promoPiece);
    if (!moveResult) return false;

    // Audio feedback
    if (isCapture) {
      soundManager.playCapture();
    } else {
      soundManager.playMove();
    }

    // Three.js scene sync & arc animation
    if (sceneRef.current) {
      sceneRef.current.syncBoard(engine.getBoard(), {
        from,
        to,
        captured: targetPiece?.type,
      });
      sceneRef.current.setLastMove(from, to);
      sceneRef.current.setSelectedSquare(null, []);
      sceneRef.current.setContemplatingSquare(null);
    }

    setSelectedSquare(null);
    setLegalMoves([]);
    setHintMove(null);

    updateBoardState();
    return true;
  }, [updateBoardState]);

  // AI Turn trigger with visible thinking process & tactical deliberation
  useEffect(() => {
    if (screen !== 'playing' || isPaused) return;
    if (gameStatus.isCheckmate || gameStatus.isDraw) return;
    if (mode !== 'ai' || turn === playerSide) return;

    let isCancelled = false;
    setIsAiThinking(true);
    setAiThinkingState({
      isThinking: true,
      depth: 1,
      maxDepth: difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1,
      nodesCount: 0,
      candidateMove: '...',
      evaluation: engineRef.current.getPositionEvaluation(),
      tacticalThought: 'Examinando opções estratégicas no tabuleiro...',
      progress: 5,
    });

    engineRef.current
      .computeBestMoveWithThinking(
        difficulty,
        (progress) => {
          if (isCancelled) return;
          setAiThinkingState({
            isThinking: true,
            depth: progress.depth,
            maxDepth: progress.maxDepth,
            nodesCount: progress.nodesCount,
            candidateMove: progress.candidateMove,
            evaluation: progress.evaluation,
            tacticalThought: progress.tacticalThought,
            progress: progress.progress,
          });

          if (sceneRef.current && progress.candidateSquare) {
            sceneRef.current.setContemplatingSquare(progress.candidateSquare);
          }
        },
        () => isCancelled
      )
      .then(({ bestMove }) => {
        if (isCancelled) return;
        if (sceneRef.current) {
          sceneRef.current.setContemplatingSquare(null);
        }
        setIsAiThinking(false);
        setAiThinkingState(null);

        if (bestMove && engineRef.current.getTurn() === turn) {
          executeMove(
            bestMove.from as Square,
            bestMove.to as Square,
            (bestMove.promotion as PieceType) || 'q'
          );
        }
      })
      .catch(() => {
        if (!isCancelled) {
          if (sceneRef.current) sceneRef.current.setContemplatingSquare(null);
          setIsAiThinking(false);
          setAiThinkingState(null);
        }
      });

    return () => {
      isCancelled = true;
      setIsAiThinking(false);
      setAiThinkingState(null);
      if (sceneRef.current) sceneRef.current.setContemplatingSquare(null);
    };
  }, [
    screen,
    isPaused,
    mode,
    turn,
    playerSide,
    difficulty,
    gameStatus.isCheckmate,
    gameStatus.isDraw,
    executeMove,
  ]);

  // Sync interactive hover turn in 3D scene & Esc Pause key
  useEffect(() => {
    if (sceneRef.current) {
      const canHumanMove =
        screen === 'playing' &&
        !isPaused &&
        !gameStatus.isCheckmate &&
        !gameStatus.isDraw &&
        (mode === 'pvp' || turn === playerSide);
      sceneRef.current.setInteractiveTurn(canHumanMove ? turn : null);
    }
  }, [screen, isPaused, mode, turn, playerSide, gameStatus]);

  useEffect(() => {
    if (screen !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showHistoryModal) {
          setShowHistoryModal(false);
        } else if (!showGameOverModal && !pendingPromotion) {
          setIsPaused((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, showHistoryModal, showGameOverModal, pendingPromotion]);

  // Square Click interaction
  const handleSquareClick = useCallback((sq: Square) => {
    if (screen !== 'playing' || isPaused) return;
    if (gameStatus.isCheckmate || gameStatus.isDraw) return;
    if (mode === 'ai' && turn !== playerSide) return; // Ignore click during AI turn

    const engine = engineRef.current;
    const piece = engine.getPieceAt(sq);

    // If already has a selected square
    if (selectedSquare) {
      // Check if clicking the same square -> deselect
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setLegalMoves([]);
        if (sceneRef.current) sceneRef.current.setSelectedSquare(null, []);
        soundManager.playClick();
        return;
      }

      // Check if clicked square is a valid legal destination
      if (legalMoves.includes(sq)) {
        const movingPiece = engine.getPieceAt(selectedSquare);
        // Check for pawn promotion
        const isPawn = movingPiece?.type === 'p';
        const isPromotionRank = (movingPiece?.color === 'w' && sq[1] === '8') || (movingPiece?.color === 'b' && sq[1] === '1');

        if (isPawn && isPromotionRank) {
          // Open promotion dialog
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }

        executeMove(selectedSquare, sq);
        return;
      }

      // If clicked another friendly piece, re-select it
      if (piece && piece.color === turn) {
        soundManager.playClick();
        setSelectedSquare(sq);
        const moves = engine.getLegalMovesFrom(sq).map((m) => m.to as Square);
        setLegalMoves(moves);
        if (sceneRef.current) sceneRef.current.setSelectedSquare(sq, moves);
        return;
      }

      // Clicked empty illegal square -> clear selection
      setSelectedSquare(null);
      setLegalMoves([]);
      if (sceneRef.current) sceneRef.current.setSelectedSquare(null, []);
      return;
    }

    // No piece currently selected: select if it's player's piece
    if (piece && piece.color === turn) {
      soundManager.playClick();
      setSelectedSquare(sq);
      const moves = engine.getLegalMovesFrom(sq).map((m) => m.to as Square);
      setLegalMoves(moves);
      if (sceneRef.current) sceneRef.current.setSelectedSquare(sq, moves);
    }
  }, [screen, isPaused, gameStatus, mode, turn, playerSide, selectedSquare, legalMoves, executeMove]);

  // Bind scene click callback
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.onSquareClick = handleSquareClick;
    }
  }, [handleSquareClick]);

  // Clock countdown timer
  useEffect(() => {
    if (screen !== 'playing' || isPaused) return;
    if (timeLimitMinutes === 0) return;
    if (gameStatus.isCheckmate || gameStatus.isDraw) return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameStatus((s) => ({ ...s, isCheckmate: true, winner: 'b' }));
            setShowGameOverModal(true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameStatus((s) => ({ ...s, isCheckmate: true, winner: 'w' }));
            setShowGameOverModal(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, isPaused, timeLimitMinutes, turn, gameStatus]);

  // Start new game
  const handleStartGame = (config: {
    mode: GameMode;
    difficulty: AIDifficulty;
    playerColor: PlayerColor;
    timeMinutes: number;
    theme: BoardThemeId;
  }) => {
    setMode(config.mode);
    setDifficulty(config.difficulty);
    setPlayerSide(config.playerColor);
    setTimeLimitMinutes(config.timeMinutes);
    setWhiteTime(config.timeMinutes * 60);
    setBlackTime(config.timeMinutes * 60);
    setTheme(config.theme);

    engineRef.current.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    setHintMove(null);
    setShowGameOverModal(false);
    setIsPaused(false);
    setIsAiThinking(false);
    setAiThinkingState(null);

    if (sceneRef.current) {
      sceneRef.current.setTitleMode(false);
      sceneRef.current.setTheme(config.theme);
      sceneRef.current.syncBoard(engineRef.current.getBoard());
      sceneRef.current.syncCapturedPieces(engineRef.current.getCapturedPieces());
      sceneRef.current.setLastMove(null, null);
      sceneRef.current.setSelectedSquare(null, []);
      sceneRef.current.setCheckSquare(null);
      // Align camera to player's color perspective
      sceneRef.current.setCameraPreset(config.mode === 'ai' && config.playerColor === 'b' ? 'black' : 'white');
    }

    updateBoardState();
    setScreen('playing');
  };

  const handleReturnToTitle = () => {
    setScreen('title');
    setShowGameOverModal(false);
    setShowHistoryModal(false);
    setIsPaused(false);
    setIsAiThinking(false);
    setAiThinkingState(null);
    if (sceneRef.current) {
      sceneRef.current.setTitleMode(true);
      sceneRef.current.setSelectedSquare(null, []);
      sceneRef.current.setCheckSquare(null);
      sceneRef.current.setContemplatingSquare(null);
    }
  };

  const handleRematch = () => {
    handleStartGame({
      mode,
      difficulty,
      playerColor: playerSide,
      timeMinutes: timeLimitMinutes,
      theme,
    });
  };

  const handleUndo = () => {
    const engine = engineRef.current;
    if (engine.getHistory().length === 0) return;

    if (mode === 'ai') {
      if (engine.getTurn() === playerSide && engine.getHistory().length >= 2) {
        // Undo both AI move and Player move
        engine.undoMove();
        engine.undoMove();
      } else {
        engine.undoMove();
      }
    } else {
      engine.undoMove();
    }

    setIsAiThinking(false);
    setAiThinkingState(null);

    if (sceneRef.current) {
      sceneRef.current.syncBoard(engine.getBoard());
      sceneRef.current.setContemplatingSquare(null);
      const hist = engine.getHistory();
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        sceneRef.current.setLastMove(last.from, last.to);
      } else {
        sceneRef.current.setLastMove(null, null);
      }
      sceneRef.current.setSelectedSquare(null, []);
    }

    setSelectedSquare(null);
    setLegalMoves([]);
    setHintMove(null);
    updateBoardState();
  };

  const handleHint = () => {
    if (isAiThinking || (mode === 'ai' && turn !== playerSide)) return;
    const bestMove = engineRef.current.computeBestMove('hard');
    if (bestMove) {
      setHintMove(`${bestMove.from.toUpperCase()} → ${bestMove.to.toUpperCase()} (${bestMove.san})`);
      if (sceneRef.current) {
        sceneRef.current.setSelectedSquare(bestMove.from as Square, [bestMove.to as Square]);
      }
    }
  };

  const handleThemeChange = (newTheme: BoardThemeId) => {
    setTheme(newTheme);
    if (sceneRef.current) {
      sceneRef.current.setTheme(newTheme);
    }
  };

  const handleToggleSound = () => {
    const newState = soundManager.toggleMute();
    setSoundEnabled(!newState);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans">
      {/* 3D Canvas Mounting Container (Isolated per Three.js directives) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Screen: Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* Screen: Playing HUD */}
      {screen === 'playing' && (
        <ChessHUD
          turn={turn}
          isCheck={gameStatus.isCheck}
          gameMode={mode}
          playerSide={playerSide}
          captured={captured}
          materialDiff={materialDiff}
          whiteTime={whiteTime}
          blackTime={blackTime}
          timeLimitMinutes={timeLimitMinutes}
          currentTheme={theme}
          onThemeSelect={handleThemeChange}
          onCameraPreset={(preset) => sceneRef.current?.setCameraPreset(preset)}
          onUndo={handleUndo}
          canUndo={history.length > 0 && !isAiThinking}
          onHint={handleHint}
          hintMove={hintMove}
          onOpenHistory={() => setShowHistoryModal(true)}
          onPause={() => setIsPaused(true)}
          onReturnToTitle={handleReturnToTitle}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          aiThinking={aiThinkingState}
          showAiThoughts={showAiThoughts}
          onToggleAiThoughts={() => setShowAiThoughts((prev) => !prev)}
          moveCount={history.length}
          hasSelection={!!selectedSquare}
        />
      )}

      {/* Pause Modal */}
      {isPaused && (
        <PauseModal
          onResume={() => setIsPaused(false)}
          onRestart={handleRematch}
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          color={turn}
          onSelect={(piece) => {
            executeMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
          }}
        />
      )}

      {/* Game Over Modal */}
      {showGameOverModal && (
        <GameOverModal
          status={gameStatus}
          userColor={playerSide}
          mode={mode}
          totalMoves={history.length}
          onRematch={handleRematch}
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {/* Move History Drawer */}
      <MoveHistoryDrawer
        history={history}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </div>
  );
}
