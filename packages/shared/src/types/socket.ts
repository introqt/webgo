import type { Position, StoneColor, SerializedGame, SerializedGameState } from './game.js';
import type { UserPublic } from './user.js';
import type { MoveQualityEvaluation } from './analysis.js';

// Client to Server Events
export interface ClientToServerEvents {
  // Connection
  join_game: (data: { gameId: string }) => void;
  leave_game: (data: { gameId: string }) => void;

  // Game actions
  make_move: (data: { gameId: string; x: number; y: number }) => void;
  pass_turn: (data: { gameId: string }) => void;
  resign: (data: { gameId: string }) => void;

  // Scoring phase
  mark_dead_stones: (data: { gameId: string; positions: Position[] }) => void;
  accept_score: (data: { gameId: string }) => void;
  reject_score: (data: { gameId: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Connection
  game_joined: (data: GameJoinedEvent) => void;
  player_joined: (data: PlayerJoinedEvent) => void;
  player_left: (data: PlayerLeftEvent) => void;

  // Game state
  game_state: (data: GameStateEvent) => void;
  move_made: (data: MoveMadeEvent) => void;
  turn_passed: (data: TurnPassedEvent) => void;

  // Game end
  game_ended: (data: GameEndedEvent) => void;

  // Scoring
  scoring_started: (data: ScoringStartedEvent) => void;
  dead_stones_marked: (data: DeadStonesMarkedEvent) => void;
  score_accepted: (data: ScoreAcceptedEvent) => void;

  // Errors
  error: (data: SocketError) => void;
  invalid_move: (data: InvalidMoveEvent) => void;
  move_evaluated: (data: MoveQualityEvaluation) => void;
}

// Event payloads
export interface GameJoinedEvent {
  game: SerializedGame;
  yourColor: StoneColor | null;
}

export interface PlayerJoinedEvent {
  player: UserPublic;
  color: StoneColor;
}

export interface PlayerLeftEvent {
  playerId: string;
  color: StoneColor;
}

export interface GameStateEvent {
  gameState: SerializedGameState;
  status: string;
}

export interface MoveMadeEvent {
  move: {
    color: StoneColor;
    position: Position;
    moveNumber: number;
  };
  capturedStones: Position[];
  gameState: SerializedGameState;
}

export interface TurnPassedEvent {
  color: StoneColor;
  consecutivePasses: number;
  gameState: SerializedGameState;
}

export interface GameEndedEvent {
  winner: StoneColor | 'draw';
  reason: 'resignation' | 'score' | 'timeout';
  finalScore: {
    black: number;
    white: number;
  };
  blackPlayer: UserPublic | null;
  whitePlayer: UserPublic | null;
  ratingChanges: {
    black: { change: number; newRating: number; oldRating: number } | null;
    white: { change: number; newRating: number; oldRating: number } | null;
  } | null;
}

export interface ScoringStartedEvent {
  gameState: SerializedGameState;
}

export interface DeadStonesMarkedEvent {
  positions: Position[];
  markedBy: string;
}

export interface ScoreAcceptedEvent {
  acceptedBy: string;
  bothAccepted: boolean;
}

export interface InvalidMoveEvent {
  reason: 'occupied' | 'ko' | 'suicide' | 'not_your_turn' | 'game_not_active';
  message: string;
}

export interface SocketError {
  code: string;
  message: string;
}
