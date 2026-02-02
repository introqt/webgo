
import { pool } from '../config/database.js';
import { MoveQualityEvaluation } from '@webgo/shared';

export class MoveEvaluationRepository {
  async saveEvaluation(gameId: string, evaluation: MoveQualityEvaluation): Promise<void> {
    const { moveNumber, quality, score, reason, details } = evaluation;

    await pool.query(
      `INSERT INTO move_evaluations 
       (game_id, move_number, quality, score, evaluation_reason, is_blunder, is_missed_capture, suggested_position, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (game_id, move_number) DO UPDATE
       SET quality = $3, score = $4, evaluation_reason = $5, is_blunder = $6, is_missed_capture = $7, suggested_position = $8`,
      [
        gameId,
        moveNumber,
        quality,
        score,
        reason,
        quality === 'blunder',
        details?.missedCapture || false,
        null, // suggested_position (future work)
      ]
    );
  }

  async getEvaluations(gameId: string): Promise<MoveQualityEvaluation[]> {
    const { rows } = await pool.query(
      `SELECT move_number, quality, score, evaluation_reason, is_blunder, is_missed_capture
       FROM move_evaluations
       WHERE game_id = $1
       ORDER BY move_number ASC`,
      [gameId]
    );

    return rows.map((row) => ({
      moveNumber: row.move_number,
      quality: row.quality as any,
      score: row.score,
      reason: row.evaluation_reason,
      details: {
        missedCapture: row.is_missed_capture,
        // Reconstruct other details if needed, or store more JSON
      },
    }));
  }
}
