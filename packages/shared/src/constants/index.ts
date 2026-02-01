import type { BoardSize, RuleSet } from '../types/game.js';

export const BOARD_SIZES: BoardSize[] = [9, 13, 19];

export const DEFAULT_KOMI: Record<RuleSet, number> = {
  chinese: 7.5,
  japanese: 6.5,
};

export const STAR_POINTS: Record<BoardSize, [number, number][]> = {
  9: [
    [2, 2], [6, 2],
    [4, 4],
    [2, 6], [6, 6],
  ],
  13: [
    [3, 3], [9, 3],
    [6, 6],
    [3, 9], [9, 9],
  ],
  19: [
    [3, 3], [9, 3], [15, 3],
    [3, 9], [9, 9], [15, 9],
    [3, 15], [9, 15], [15, 15],
  ],
};

export const DEFAULT_RATING = 1500;

export const INVITATION_CODE_LENGTH = 8;

export const JWT_EXPIRATION = '7d';

export const GAME_STATUSES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  SCORING: 'scoring',
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
} as const;

export const RULE_SETS = {
  CHINESE: 'chinese',
  JAPANESE: 'japanese',
} as const;

export const COLORS = {
  BLACK: 'black',
  WHITE: 'white',
} as const;

export const WIN_REASONS = {
  RESIGNATION: 'resignation',
  SCORE: 'score',
  TIMEOUT: 'timeout',
} as const;

export const SOCKET_EVENTS = {
  // Client to server
  JOIN_GAME: 'join_game',
  LEAVE_GAME: 'leave_game',
  MAKE_MOVE: 'make_move',
  PASS_TURN: 'pass_turn',
  RESIGN: 'resign',
  MARK_DEAD_STONES: 'mark_dead_stones',
  ACCEPT_SCORE: 'accept_score',
  REJECT_SCORE: 'reject_score',

  // Server to client
  GAME_JOINED: 'game_joined',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STATE: 'game_state',
  MOVE_MADE: 'move_made',
  TURN_PASSED: 'turn_passed',
  GAME_ENDED: 'game_ended',
  SCORING_STARTED: 'scoring_started',
  DEAD_STONES_MARKED: 'dead_stones_marked',
  SCORE_ACCEPTED: 'score_accepted',
  ERROR: 'error',
  INVALID_MOVE: 'invalid_move',
} as const;
