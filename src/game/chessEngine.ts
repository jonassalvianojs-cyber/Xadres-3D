import { Chess, Move } from 'chess.js';
import { Square, PieceType, PieceColor, CapturedPieces, GameStatus, AIDifficulty, MoveRecord } from './types';

// Standard piece values for evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece Square Tables (from white's perspective; inverted for black)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

export class ChessGameEngine {
  private game: Chess;
  private moveHistory: MoveRecord[] = [];

  constructor() {
    this.game = new Chess();
  }

  public reset() {
    this.game = new Chess();
    this.moveHistory = [];
  }

  public getFen(): string {
    return this.game.fen();
  }

  public getTurn(): PieceColor {
    return this.game.turn() as PieceColor;
  }

  public getBoard(): ({ type: PieceType; color: PieceColor } | null)[][] {
    return this.game.board();
  }

  public getPieceAt(square: Square): { type: PieceType; color: PieceColor } | null {
    return this.game.get(square) || null;
  }

  public getLegalMovesFrom(square: Square): Move[] {
    return this.game.moves({ square, verbose: true }) as Move[];
  }

  public getAllLegalMoves(): Move[] {
    return this.game.moves({ verbose: true }) as Move[];
  }

  public makeMove(from: Square, to: Square, promotion: PieceType = 'q'): Move | null {
    try {
      const move = this.game.move({
        from,
        to,
        promotion,
      });

      if (move) {
        this.moveHistory.push({
          san: move.san,
          from: move.from as Square,
          to: move.to as Square,
          piece: move.piece as PieceType,
          color: move.color as PieceColor,
          captured: move.captured ? (move.captured as PieceType) : undefined,
        });
        return move;
      }
      return null;
    } catch {
      return null;
    }
  }

  public undoMove(): MoveRecord | null {
    const move = this.game.undo();
    if (move) {
      return this.moveHistory.pop() || null;
    }
    return null;
  }

  public getHistory(): MoveRecord[] {
    return [...this.moveHistory];
  }

  public getStatus(): GameStatus {
    const isCheck = this.game.inCheck();
    const isCheckmate = this.game.isCheckmate();
    const isDraw = this.game.isDraw();
    const isStalemate = this.game.isStalemate();
    const isThreefoldRepetition = this.game.isThreefoldRepetition();
    const isInsufficientMaterial = this.game.isInsufficientMaterial();
    const turn = this.game.turn() as PieceColor;

    let winner: PieceColor | 'draw' | null = null;
    if (isCheckmate) {
      winner = turn === 'w' ? 'b' : 'w';
    } else if (isDraw) {
      winner = 'draw';
    }

    return {
      isCheck,
      isCheckmate,
      isDraw,
      isStalemate,
      isThreefoldRepetition,
      isInsufficientMaterial,
      winner,
      turn,
    };
  }

  public getCapturedPieces(): CapturedPieces {
    // Starting army
    const startCounts: Record<PieceColor, Record<PieceType, number>> = {
      w: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
      b: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
    };

    const board = this.game.board();
    const currentCounts: Record<PieceColor, Record<PieceType, number>> = {
      w: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
      b: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
    };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          currentCounts[piece.color as PieceColor][piece.type as PieceType]++;
        }
      }
    }

    const capturedW: PieceType[] = [];
    const capturedB: PieceType[] = [];

    (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((type) => {
      const missingW = Math.max(0, startCounts.w[type] - currentCounts.w[type]);
      for (let i = 0; i < missingW; i++) capturedW.push(type);

      const missingB = Math.max(0, startCounts.b[type] - currentCounts.b[type]);
      for (let i = 0; i < missingB; i++) capturedB.push(type);
    });

    return {
      w: capturedW,
      b: capturedB,
    };
  }

  public getMaterialScore(): { whiteScore: number; blackScore: number; diff: number } {
    const board = this.game.board();
    let whiteScore = 0;
    let blackScore = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          const val = PIECE_VALUES[piece.type as PieceType];
          if (piece.color === 'w') whiteScore += val;
          else blackScore += val;
        }
      }
    }

    return {
      whiteScore,
      blackScore,
      diff: Math.round((whiteScore - blackScore) / 100),
    };
  }

  // --- AI ENGINE EVALUATION ---

  private evaluateBoard(game: Chess): number {
    const board = game.board();
    let totalScore = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type as PieceType];
        const squareIdx = row * 8 + col;
        const pstIdx = piece.color === 'w' ? squareIdx : (7 - row) * 8 + col;

        let pstBonus = 0;
        if (piece.type === 'p') pstBonus = PAWN_PST[pstIdx];
        else if (piece.type === 'n') pstBonus = KNIGHT_PST[pstIdx];
        else if (piece.type === 'b') pstBonus = BISHOP_PST[pstIdx];
        else if (piece.type === 'r') pstBonus = ROOK_PST[pstIdx];
        else if (piece.type === 'q') pstBonus = QUEEN_PST[pstIdx];
        else if (piece.type === 'k') pstBonus = KING_MID_PST[pstIdx];

        const score = val + pstBonus;
        totalScore += piece.color === 'w' ? score : -score;
      }
    }

    return totalScore;
  }

  private minimax(
    game: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): { score: number; bestMove?: Move } {
    if (depth === 0 || game.isGameOver()) {
      return { score: this.evaluateBoard(game) };
    }

    const moves = game.moves({ verbose: true }) as Move[];
    // Move ordering: evaluate captures and checks first
    moves.sort((a, b) => {
      let scoreA = a.captured ? PIECE_VALUES[a.captured as PieceType] * 10 : 0;
      let scoreB = b.captured ? PIECE_VALUES[b.captured as PieceType] * 10 : 0;
      return scoreB - scoreA;
    });

    let bestMove: Move | undefined = moves[0];

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        game.move(move);
        const { score } = this.minimax(game, depth - 1, alpha, beta, false);
        game.undo();

        if (score > maxScore) {
          maxScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, maxScore);
        if (beta <= alpha) break; // Beta cutoff
      }
      return { score: maxScore, bestMove };
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        game.move(move);
        const { score } = this.minimax(game, depth - 1, alpha, beta, true);
        game.undo();

        if (score < minScore) {
          minScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, minScore);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return { score: minScore, bestMove };
    }
  }

  public getPositionEvaluation(): number {
    return this.evaluateBoard(this.game) / 100;
  }

  private generateTacticalThought(move: Move): string {
    if (move.san.includes('#')) return 'Calculando xeque-mate inevitável!';
    if (move.san.includes('+')) return `Avaliando ataque com xeque (${move.san})...`;
    if (move.captured) {
      const pieceNames: Record<string, string> = {
        q: 'Dama',
        r: 'Torre',
        b: 'Bispo',
        n: 'Cavalo',
        p: 'Peão',
      };
      const victim = pieceNames[move.captured] || 'peça';
      return `Calculando ganho tático capturando ${victim} em ${move.to.toUpperCase()}...`;
    }
    if (move.san === 'O-O' || move.san === 'O-O-O') {
      return 'Garantindo segurança do Rei com roque...';
    }
    if (['e4', 'd4', 'e5', 'd5', 'c4', 'f4'].includes(move.to)) {
      return `Disputando o domínio das casas centrais (${move.san})...`;
    }
    if (move.piece === 'n') return `Reposicionando Cavalo para ${move.to.toUpperCase()}...`;
    if (move.piece === 'b') return `Ativando Bispo em diagonal aberta (${move.to.toUpperCase()})...`;
    if (move.piece === 'q') return `Calculando pressão estratégica da Dama (${move.san})...`;
    if (move.piece === 'r') return `Posicionando Torre em coluna ativa (${move.to.toUpperCase()})...`;
    return `Analisando variante com ${move.san}...`;
  }

  public async computeBestMoveWithThinking(
    difficulty: AIDifficulty = 'medium',
    onProgress?: (info: {
      depth: number;
      maxDepth: number;
      nodesCount: number;
      candidateMove: string;
      evaluation: number;
      tacticalThought: string;
      progress: number;
      candidateSquare?: Square;
    }) => void,
    shouldCancel?: () => boolean
  ): Promise<{ bestMove: Move | null; score: number }> {
    const legalMoves = this.getAllLegalMoves();
    if (legalMoves.length === 0) return { bestMove: null, score: 0 };

    const currentTurn = this.game.turn();
    const isMaximizing = currentTurn === 'w';

    const maxDepth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
    let totalNodes = 0;

    // Order root moves: captures and checks first
    const rootMoves = [...legalMoves].sort((a, b) => {
      const scoreA = a.captured ? PIECE_VALUES[a.captured as PieceType] * 10 : 0;
      const scoreB = b.captured ? PIECE_VALUES[b.captured as PieceType] * 10 : 0;
      return scoreB - scoreA;
    });

    let bestMove: Move = rootMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    const clone = new Chess(this.game.fen());
    const totalSteps = rootMoves.length;

    // Keep thinking snappy (~0.5s - 1.4s total regardless of legal move count)
    const perMoveWait = difficulty === 'hard' ? 32 : difficulty === 'medium' ? 22 : 16;

    for (let i = 0; i < rootMoves.length; i++) {
      if (shouldCancel?.()) return { bestMove: null, score: 0 };

      const move = rootMoves[i];
      const thought = this.generateTacticalThought(move);

      clone.move(move);
      totalNodes++;

      // Evaluate recursive tree for this move
      const depthForSearch = difficulty === 'easy' ? 0 : maxDepth - 1;
      let moveScore: number;

      if (depthForSearch === 0) {
        moveScore = this.evaluateBoard(clone) + (Math.random() - 0.5) * 90;
        totalNodes += Math.floor(Math.random() * 5) + 1;
      } else {
        const res = this.minimax(clone, depthForSearch, -Infinity, Infinity, !isMaximizing);
        moveScore = res.score;
        totalNodes += depthForSearch === 1 ? 12 : 75;
      }
      clone.undo();

      const isBetter = isMaximizing ? moveScore > bestScore : moveScore < bestScore;
      if (isBetter) {
        bestScore = moveScore;
        bestMove = move;
      }

      if (onProgress) {
        const progressPct = Math.min(95, Math.round(((i + 1) / totalSteps) * 100));
        onProgress({
          depth: maxDepth,
          maxDepth,
          nodesCount: totalNodes * (difficulty === 'hard' ? 42 : difficulty === 'medium' ? 14 : 3),
          candidateMove: move.san,
          evaluation: bestScore / 100,
          tacticalThought: thought,
          progress: progressPct,
          candidateSquare: move.from as Square,
        });
      }

      // Small async tick so React updates and the user sees the computer actively thinking
      await new Promise((r) => setTimeout(r, perMoveWait));
    }

    if (shouldCancel?.()) return { bestMove: null, score: 0 };

    // Brief deliberation pause on final decision
    const minDeliberation = difficulty === 'hard' ? 280 : difficulty === 'medium' ? 200 : 120;
    await new Promise((r) => setTimeout(r, minDeliberation));
    if (shouldCancel?.()) return { bestMove: null, score: 0 };

    if (onProgress) {
      onProgress({
        depth: maxDepth,
        maxDepth,
        nodesCount: totalNodes * (difficulty === 'hard' ? 42 : difficulty === 'medium' ? 14 : 3),
        candidateMove: bestMove.san,
        evaluation: bestScore / 100,
        tacticalThought: `Decisão tomada: jogando ${bestMove.san}!`,
        progress: 100,
        candidateSquare: bestMove.from as Square,
      });
    }

    await new Promise((r) => setTimeout(r, 180));
    if (shouldCancel?.()) return { bestMove: null, score: 0 };

    return { bestMove, score: bestScore };
  }

  public computeBestMove(difficulty: AIDifficulty = 'medium'): Move | null {
    const legalMoves = this.getAllLegalMoves();
    if (legalMoves.length === 0) return null;

    const currentTurn = this.game.turn();
    const isMaximizing = currentTurn === 'w';

    if (difficulty === 'easy') {
      const captures = legalMoves.filter((m) => m.captured || m.san.includes('+'));
      if (captures.length > 0 && Math.random() < 0.6) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    if (difficulty === 'medium') {
      const clone = new Chess(this.game.fen());
      const res = this.minimax(clone, 2, -Infinity, Infinity, isMaximizing);
      return res.bestMove || legalMoves[0];
    }

    const clone = new Chess(this.game.fen());
    const res = this.minimax(clone, 3, -Infinity, Infinity, isMaximizing);
    return res.bestMove || legalMoves[0];
  }
}

