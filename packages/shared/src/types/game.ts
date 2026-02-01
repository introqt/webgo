export type BoardSize = 9 | 13 | 19;

export type StoneColor = 'black' | 'white';

export type GameStatus =
  | 'waiting'      // Waiting for opponent to join
  | 'active'       // Game in progress
  | 'scoring'      // Dead stone marking phase
  | 'finished'     // Game completed
  | 'abandoned';   // Game abandoned

export type RuleSet = 'chinese' | 'japanese';

export interface Position {
  x: number;
  y: number;
}

export interface Move {
  id?: string;
  gameId: string;
  playerId: string;
  moveNumber: number;
  color: StoneColor;
  position: Position | null; // null for pass
  capturedStones: Position[];
  isPass: boolean;
  createdAt?: Date;
}

export interface Stone {
  color: StoneColor;
  position: Position;
}

export interface BoardState {
  size: BoardSize;
  stones: Map<string, StoneColor>; // key: "x,y"
  captures: {
    black: number; // stones captured by black
    white: number; // stones captured by white
  };
  currentTurn: StoneColor;
  previousBoardState: string | null; // for ko detection
  lastMove: Position | null;
  consecutivePasses: number;
}

export interface GameState {
  board: BoardState;
  moveHistory: Move[];
  deadStones: Position[]; // marked during scoring phase
  territory: {
    black: Position[];
    white: Position[];
  };
}

export interface Game {
  id: string;
  boardSize: BoardSize;
  blackPlayerId: string | null;
  whitePlayerId: string | null;
  gameState: GameState;
  status: GameStatus;
  handicap: number;
  komi: number;
  ruleSet: RuleSet;
  invitationCode: string;
  winner: StoneColor | 'draw' | null;
  winReason: 'resignation' | 'score' | 'timeout' | null;
  finalScore: {
    black: number;
    white: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSummary {
  id: string;
  boardSize: BoardSize;
  blackPlayer: PlayerInfo | null;
  whitePlayer: PlayerInfo | null;
  status: GameStatus;
  currentTurn: StoneColor;
  winner: StoneColor | 'draw' | null;
  createdAt: Date;
}

export interface PlayerInfo {
  id: string;
  username: string;
  rating: number;
}

export interface GameResult {
  winner: StoneColor | 'draw';
  reason: 'resignation' | 'score' | 'timeout';
  finalScore: {
    black: number;
    white: number;
  };
}

// Serialized versions for JSON storage/transport
export interface SerializedBoardState {
  size: BoardSize;
  stones: Record<string, StoneColor>; // serialized Map
  captures: {
    black: number;
    white: number;
  };
  currentTurn: StoneColor;
  previousBoardState: string | null;
  lastMove: Position | null;
  consecutivePasses: number;
}

export interface SerializedGameState {
  board: SerializedBoardState;
  moveHistory: Move[];
  deadStones: Position[];
  territory: {
    black: Position[];
    white: Position[];
  };
}

// Serialized Game for transport over network
export interface SerializedGame {
  id: string;
  boardSize: BoardSize;
  blackPlayerId: string | null;
  whitePlayerId: string | null;
  gameState: SerializedGameState;
  status: GameStatus;
  handicap: number;
  komi: number;
  ruleSet: RuleSet;
  invitationCode: string;
  winner: StoneColor | 'draw' | null;
  winReason: 'resignation' | 'score' | 'timeout' | null;
  finalScore: {
    black: number;
    white: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
