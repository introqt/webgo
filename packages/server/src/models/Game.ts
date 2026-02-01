import { query } from '../config/database.js';
import type {
  Game,
  GameState,
  Move,
  BoardSize,
  StoneColor,
  GameStatus,
  RuleSet,
  SerializedGameState,
  GameSummary,
  GameHistoryItem,
} from '@webgo/shared';
import { GameEngine } from '../services/game/GameEngine.js';

interface GameRow {
  id: string;
  board_size: number;
  black_player_id: string | null;
  white_player_id: string | null;
  game_state: SerializedGameState;
  status: string;
  handicap: number;
  komi: string;
  rule_set: string;
  invitation_code: string;
  winner: string | null;
  win_reason: string | null;
  final_score: { black: number; white: number } | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

interface MoveRow {
  id: string;
  game_id: string;
  player_id: string;
  move_number: number;
  color: string;
  position: { x: number; y: number } | null;
  captured_stones: { x: number; y: number }[];
  is_pass: boolean;
  created_at: Date;
}

export class GameRepository {
  async create(game: Game): Promise<Game> {
    const serializedState = GameEngine.serializeGameState(game.gameState);

    const { rows } = await query<GameRow>(
      `INSERT INTO games (id, board_size, black_player_id, white_player_id, game_state, status, handicap, komi, rule_set, invitation_code, winner, win_reason, final_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        game.id,
        game.boardSize,
        game.blackPlayerId,
        game.whitePlayerId,
        JSON.stringify(serializedState),
        game.status,
        game.handicap,
        game.komi,
        game.ruleSet,
        game.invitationCode,
        game.winner,
        game.winReason,
        game.finalScore ? JSON.stringify(game.finalScore) : null,
      ]
    );

    return this.mapRowToGame(rows[0]);
  }

  async findById(id: string): Promise<Game | null> {
    const { rows } = await query<GameRow>(
      'SELECT * FROM games WHERE id = $1',
      [id]
    );
    return rows[0] ? this.mapRowToGame(rows[0]) : null;
  }

  async findByInvitationCode(code: string): Promise<Game | null> {
    const { rows } = await query<GameRow>(
      'SELECT * FROM games WHERE invitation_code = $1',
      [code]
    );
    return rows[0] ? this.mapRowToGame(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Game[]> {
    const { rows } = await query<GameRow>(
      `SELECT * FROM games
       WHERE black_player_id = $1 OR white_player_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    );
    return rows.map((row) => this.mapRowToGame(row));
  }

  async getGameSummaries(userId: string): Promise<GameSummary[]> {
    const { rows } = await query<GameRow & {
      black_username: string | null;
      black_rating: number | null;
      white_username: string | null;
      white_rating: number | null;
    }>(
      `SELECT g.*,
        bu.username as black_username, bu.rating as black_rating,
        wu.username as white_username, wu.rating as white_rating
       FROM games g
       LEFT JOIN users bu ON g.black_player_id = bu.id
       LEFT JOIN users wu ON g.white_player_id = wu.id
       WHERE g.black_player_id = $1 OR g.white_player_id = $1
       ORDER BY g.updated_at DESC
       LIMIT 50`,
      [userId]
    );

    return rows.map((row) => {
      const gameState = typeof row.game_state === 'string'
        ? JSON.parse(row.game_state)
        : row.game_state;

      return {
        id: row.id,
        boardSize: row.board_size as BoardSize,
        blackPlayer: row.black_player_id ? {
          id: row.black_player_id,
          username: row.black_username || 'Unknown',
          rating: row.black_rating || 1500,
        } : null,
        whitePlayer: row.white_player_id ? {
          id: row.white_player_id,
          username: row.white_username || 'Unknown',
          rating: row.white_rating || 1500,
        } : null,
        status: row.status as GameStatus,
        currentTurn: gameState.board.currentTurn as StoneColor,
        winner: row.winner as StoneColor | 'draw' | null,
        createdAt: row.created_at,
      };
    });
  }

  async update(game: Game): Promise<boolean> {
    const serializedState = GameEngine.serializeGameState(game.gameState);

    const result = await query(
      `UPDATE games SET
        black_player_id = $2,
        white_player_id = $3,
        game_state = $4,
        status = $5,
        winner = $6,
        win_reason = $7,
        final_score = $8,
        version = version + 1,
        updated_at = NOW()
       WHERE id = $1 AND version = $9`,
      [
        game.id,
        game.blackPlayerId,
        game.whitePlayerId,
        JSON.stringify(serializedState),
        game.status,
        game.winner,
        game.winReason,
        game.finalScore ? JSON.stringify(game.finalScore) : null,
        game.version,
      ]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async saveMove(move: Move): Promise<void> {
    await query(
      `INSERT INTO moves (game_id, player_id, move_number, color, position, captured_stones, is_pass)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        move.gameId,
        move.playerId,
        move.moveNumber,
        move.color,
        move.position ? JSON.stringify(move.position) : null,
        JSON.stringify(move.capturedStones),
        move.isPass,
      ]
    );
  }

  async getMoves(gameId: string): Promise<Move[]> {
    const { rows } = await query<MoveRow>(
      'SELECT * FROM moves WHERE game_id = $1 ORDER BY move_number',
      [gameId]
    );
    return rows.map((row) => this.mapRowToMove(row));
  }

  async getGameHistoryWithRatings(
    userId: string,
    filter: 'all' | 'wins' | 'losses' = 'all',
    limit = 10,
    offset = 0
  ): Promise<{ games: GameHistoryItem[]; total: number }> {
    let filterClause = '';
    if (filter === 'wins') {
      filterClause = `AND ((g.black_player_id = $1 AND g.winner = 'black') OR (g.white_player_id = $1 AND g.winner = 'white'))`;
    } else if (filter === 'losses') {
      filterClause = `AND ((g.black_player_id = $1 AND g.winner = 'white') OR (g.white_player_id = $1 AND g.winner = 'black'))`;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM games g
       WHERE (g.black_player_id = $1 OR g.white_player_id = $1)
       AND g.status = 'finished'
       ${filterClause}`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get games with ratings
    const { rows } = await query<{
      id: string;
      board_size: number;
      black_player_id: string | null;
      white_player_id: string | null;
      status: string;
      winner: string | null;
      win_reason: string | null;
      final_score: { black: number; white: number } | null;
      created_at: Date;
      updated_at: Date;
      black_username: string | null;
      black_rating: number | null;
      white_username: string | null;
      white_rating: number | null;
      user_rating_before: number | null;
      user_rating_after: number | null;
      user_rating_change: number | null;
    }>(
      `SELECT g.id, g.board_size, g.black_player_id, g.white_player_id,
              g.status, g.winner, g.win_reason, g.final_score,
              g.created_at, g.updated_at,
              bu.username as black_username, bu.rating as black_rating,
              wu.username as white_username, wu.rating as white_rating,
              rc.rating_before as user_rating_before,
              rc.rating_after as user_rating_after,
              rc.rating_change as user_rating_change
       FROM games g
       LEFT JOIN users bu ON g.black_player_id = bu.id
       LEFT JOIN users wu ON g.white_player_id = wu.id
       LEFT JOIN game_rating_changes rc ON rc.game_id = g.id AND rc.user_id = $1
       WHERE (g.black_player_id = $1 OR g.white_player_id = $1)
       AND g.status = 'finished'
       ${filterClause}
       ORDER BY g.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const games: GameHistoryItem[] = rows.map((row) => {
      const userColor: StoneColor = row.black_player_id === userId ? 'black' : 'white';
      const isWin =
        (userColor === 'black' && row.winner === 'black') ||
        (userColor === 'white' && row.winner === 'white');
      const isLoss =
        (userColor === 'black' && row.winner === 'white') ||
        (userColor === 'white' && row.winner === 'black');

      return {
        id: row.id,
        boardSize: row.board_size as BoardSize,
        opponent: {
          id: userColor === 'black' ? row.white_player_id! : row.black_player_id!,
          username:
            userColor === 'black'
              ? row.white_username || 'Unknown'
              : row.black_username || 'Unknown',
          rating:
            userColor === 'black'
              ? row.white_rating || 1500
              : row.black_rating || 1500,
        },
        userColor,
        result: row.winner === 'draw' ? 'draw' : isWin ? 'win' : 'loss',
        winner: row.winner as StoneColor | 'draw' | null,
        winReason: row.win_reason as 'resignation' | 'score' | 'timeout' | null,
        finalScore: row.final_score,
        ratingChange: row.user_rating_change,
        ratingBefore: row.user_rating_before,
        ratingAfter: row.user_rating_after,
        playedAt: row.updated_at,
      };
    });

    return { games, total };
  }

  private mapRowToGame(row: GameRow): Game {
    const gameState = typeof row.game_state === 'string'
      ? JSON.parse(row.game_state)
      : row.game_state;

    return {
      id: row.id,
      boardSize: row.board_size as BoardSize,
      blackPlayerId: row.black_player_id,
      whitePlayerId: row.white_player_id,
      gameState: GameEngine.deserializeGameState(gameState),
      status: row.status as GameStatus,
      handicap: row.handicap,
      komi: parseFloat(row.komi),
      ruleSet: row.rule_set as RuleSet,
      invitationCode: row.invitation_code,
      winner: row.winner as StoneColor | 'draw' | null,
      winReason: row.win_reason as 'resignation' | 'score' | 'timeout' | null,
      finalScore: row.final_score,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToMove(row: MoveRow): Move {
    return {
      id: row.id,
      gameId: row.game_id,
      playerId: row.player_id,
      moveNumber: row.move_number,
      color: row.color as StoneColor,
      position: row.position,
      capturedStones: row.captured_stones || [],
      isPass: row.is_pass,
      createdAt: row.created_at,
    };
  }
}
