import type { Game, GameSummary, BoardSize, RuleSet, StoneColor, Position, Move } from './game.js';
import type { User, UserPublic, UserStats } from './user.js';

export type { BoardSize, StoneColor };

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

// Leaderboard API
export interface LeaderboardUser {
  id: string;
  username: string;
  rating: number;
  rank: number;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  total: number;
}

// Game History API
export interface GameHistoryResponse {
  games: GameHistoryItem[];
  total: number;
}

export interface GameHistoryItem {
  id: string;
  boardSize: BoardSize;
  opponent: UserPublic;
  userColor: StoneColor;
  result: 'win' | 'loss' | 'draw';
  winner: StoneColor | 'draw' | null;
  winReason: 'resignation' | 'score' | 'timeout' | null;
  finalScore: { black: number; white: number } | null;
  ratingChange: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  playedAt: Date;
}
