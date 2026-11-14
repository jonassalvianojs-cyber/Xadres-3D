export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export type Square = 
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

export type GameMode = 'ai' | 'pvp';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerColor = 'w' | 'b';
export type CameraPreset = 'white' | 'black' | 'top' | 'free';

export type BoardThemeId = 'classic_wood' | 'marble_royal' | 'obsidian_gold' | 'cyber_neon';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  lightSquareColor: string;
  darkSquareColor: string;
  borderWoodColor: string;
  whitePieceColor: string;
  whitePieceRoughness: number;
  whitePieceMetalness: number;
  blackPieceColor: string;
  blackPieceRoughness: number;
  blackPieceMetalness: number;
  environmentBg: string;
}

export interface GameSettings {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  playerSide: PlayerColor;
  timeLimitMinutes: number; // 0 for unlimited, or 3, 5, 10
  theme: BoardThemeId;
  soundEnabled: boolean;
  autoRotateTurn: boolean;
}

export interface CapturedPieces {
  w: PieceType[]; // white captured pieces (captured by black)
  b: PieceType[]; // black captured pieces (captured by white)
}

export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
}

export interface GameStatus {
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  isThreefoldRepetition: boolean;
  isInsufficientMaterial: boolean;
  winner: PieceColor | 'draw' | null;
  turn: PieceColor;
}

export interface AiThinkingState {
  isThinking: boolean;
  depth: number;
  maxDepth: number;
  nodesCount: number;
  candidateMove: string;
  evaluation: number; // in pawns e.g. +0.35, -1.20
  tacticalThought: string;
  progress: number; // 0 to 100
}

