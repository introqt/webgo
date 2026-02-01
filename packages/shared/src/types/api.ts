import type { Game, GameSummary, BoardSize, RuleSet, StoneColor, Position, Move } from './game.js';
import type { User, UserPublic, UserStats } from './user.js';

// Auth API
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

// Game API
export interface CreateGameRequest {
  boardSize: BoardSize;
  color?: StoneColor; // preferred color, random if not specified
  handicap?: number;
  komi?: number;
  ruleSet?: RuleSet;
}

export interface CreateGameResponse {
  game: Game;
  invitationCode: string;
  invitationUrl: string;
}

export interface JoinGameRequest {
  invitationCode?: string;
}

export interface JoinGameResponse {
  game: Game;
  color: StoneColor;
}

export interface GameListResponse {
  games: GameSummary[];
  total: number;
}

// API Error
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Generic API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// User API
export interface GetUserResponse {
  user: UserPublic;
  stats: UserStats;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
