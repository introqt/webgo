import { query } from '../config/database.js';

export interface RatingChangeRecord {
  id: string;
  gameId: string;
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  createdAt: Date;
}

interface RatingChangeRow {
  id: string;
  game_id: string;
  user_id: string;
  rating_before: number;
  rating_after: number;
  rating_change: number;
  created_at: Date;
}

export class RatingChangeRepository {
  async create(record: Omit<RatingChangeRecord, 'id' | 'createdAt'>): Promise<RatingChangeRecord> {
    const { rows } = await query<RatingChangeRow>(
      `INSERT INTO game_rating_changes (game_id, user_id, rating_before, rating_after, rating_change)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [record.gameId, record.userId, record.ratingBefore, record.ratingAfter, record.ratingChange]
    );

    return this.mapRowToRecord(rows[0]);
  }

  async findByGameId(gameId: string): Promise<RatingChangeRecord[]> {
    const { rows } = await query<RatingChangeRow>(
      'SELECT * FROM game_rating_changes WHERE game_id = $1',
      [gameId]
    );
    return rows.map(row => this.mapRowToRecord(row));
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<RatingChangeRecord[]> {
    const { rows } = await query<RatingChangeRow>(
      `SELECT * FROM game_rating_changes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows.map(row => this.mapRowToRecord(row));
  }

  async findByGameAndUser(gameId: string, userId: string): Promise<RatingChangeRecord | null> {
    const { rows } = await query<RatingChangeRow>(
      'SELECT * FROM game_rating_changes WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    );
    return rows[0] ? this.mapRowToRecord(rows[0]) : null;
  }

  private mapRowToRecord(row: RatingChangeRow): RatingChangeRecord {
    return {
      id: row.id,
      gameId: row.game_id,
      userId: row.user_id,
      ratingBefore: row.rating_before,
      ratingAfter: row.rating_after,
      ratingChange: row.rating_change,
      createdAt: row.created_at,
    };
  }
}
