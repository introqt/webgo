import { query } from '../config/database.js';

interface ScoreAcceptanceRow {
  game_id: string;
  player_id: string;
  accepted_at: Date;
}

export interface ScoreAcceptance {
  gameId: string;
  playerId: string;
  acceptedAt: Date;
}

export class ScoreAcceptanceRepository {
  async addAcceptance(gameId: string, playerId: string): Promise<void> {
    await query(
      `INSERT INTO score_acceptances (game_id, player_id)
       VALUES ($1, $2)
       ON CONFLICT (game_id, player_id) DO NOTHING`,
      [gameId, playerId]
    );
  }

  async getAcceptances(gameId: string): Promise<ScoreAcceptance[]> {
    const { rows } = await query<ScoreAcceptanceRow>(
      'SELECT * FROM score_acceptances WHERE game_id = $1',
      [gameId]
    );
    return rows.map((row) => ({
      gameId: row.game_id,
      playerId: row.player_id,
      acceptedAt: row.accepted_at,
    }));
  }

  async clearAcceptances(gameId: string): Promise<void> {
    await query('DELETE FROM score_acceptances WHERE game_id = $1', [gameId]);
  }

  async bothPlayersAccepted(gameId: string, blackPlayerId: string, whitePlayerId: string): Promise<boolean> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM score_acceptances
       WHERE game_id = $1 AND player_id IN ($2, $3)`,
      [gameId, blackPlayerId, whitePlayerId]
    );
    return parseInt(rows[0].count, 10) === 2;
  }
}
