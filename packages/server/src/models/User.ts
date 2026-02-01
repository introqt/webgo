import { query } from '../config/database.js';
import type { User, UserPublic, UserStats } from '@webgo/shared';

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  rating: number;
  created_at: Date;
}

export class UserRepository {
  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (username, email, password_hash, rating)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.username, user.email, user.passwordHash, user.rating || 1500]
    );

    return this.mapRowToUser(rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ? this.mapRowToUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] ? this.mapRowToUser(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return rows[0] ? this.mapRowToUser(rows[0]) : null;
  }

  async getPublicInfo(id: string): Promise<UserPublic | null> {
    const { rows } = await query<UserRow>(
      'SELECT id, username, rating FROM users WHERE id = $1',
      [id]
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      username: rows[0].username,
      rating: rows[0].rating,
    };
  }

  async getStats(userId: string): Promise<UserStats> {
    const { rows } = await query<{
      total_games: string;
      wins: string;
      losses: string;
      draws: string;
      rating: number;
    }>(
      `SELECT
        COUNT(g.id) as total_games,
        COUNT(CASE WHEN (g.black_player_id = $1 AND g.winner = 'black') OR (g.white_player_id = $1 AND g.winner = 'white') THEN 1 END) as wins,
        COUNT(CASE WHEN (g.black_player_id = $1 AND g.winner = 'white') OR (g.white_player_id = $1 AND g.winner = 'black') THEN 1 END) as losses,
        COUNT(CASE WHEN g.winner = 'draw' THEN 1 END) as draws,
        u.rating
      FROM users u
      LEFT JOIN games g ON (g.black_player_id = u.id OR g.white_player_id = u.id) AND g.status = 'finished'
      WHERE u.id = $1
      GROUP BY u.id, u.rating`,
      [userId]
    );

    if (!rows[0]) {
      return { totalGames: 0, wins: 0, losses: 0, draws: 0, rating: 1500, winRate: 0 };
    }

    const totalGames = parseInt(rows[0].total_games, 10);
    const wins = parseInt(rows[0].wins, 10);

    return {
      totalGames,
      wins,
      losses: parseInt(rows[0].losses, 10),
      draws: parseInt(rows[0].draws, 10),
      rating: rows[0].rating,
      winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    };
  }

  async updateRating(userId: string, rating: number): Promise<void> {
    await query('UPDATE users SET rating = $1 WHERE id = $2', [rating, userId]);
  }

  async getLeaderboard(limit = 20, offset = 0): Promise<UserPublic[]> {
    const { rows } = await query<{ id: string; username: string; rating: number }>(
      `SELECT id, username, rating FROM users
       ORDER BY rating DESC, username ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      rating: row.rating,
    }));
  }

  async getTotalCount(): Promise<number> {
    const { rows } = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    return parseInt(rows[0].count, 10);
  }

  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      rating: row.rating,
      createdAt: row.created_at,
    };
  }
}
