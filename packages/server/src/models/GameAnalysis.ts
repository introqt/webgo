
import { pool } from '../config/database.js';

export interface GameAnalysisResult {
  gameId: string;
  playerId: string;
  totalMoves: number;
  averageMoveTimeMs: number;
  stonesCaptured: number;
  stonesLost: number;
  captureOpportunitiesMissed: number;
  blunders: number;
  missedCaptures: number;
  badAtariEscapes: number;
  endgameEfficiency: number;
  openingQuality: string | null;
}

export class GameAnalysisRepository {
  async saveAnalysis(analysis: GameAnalysisResult): Promise<void> {
    const {
      gameId,
      playerId,
      totalMoves,
      averageMoveTimeMs,
      stonesCaptured,
      stonesLost,
      captureOpportunitiesMissed,
      blunders,
      missedCaptures,
      badAtariEscapes,
      endgameEfficiency,
      openingQuality,
    } = analysis;

    await pool.query(
      `INSERT INTO game_analyses 
        (game_id, player_id, total_moves, average_move_time_ms, stones_captured, stones_lost, 
         capture_opportunities_missed, blunders, missed_captures, bad_atari_escapes, 
         endgame_efficiency, opening_quality, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (game_id, player_id) DO UPDATE SET
         total_moves = $3,
         average_move_time_ms = $4,
         stones_captured = $5,
         stones_lost = $6,
         capture_opportunities_missed = $7,
         blunders = $8,
         missed_captures = $9,
         bad_atari_escapes = $10,
         endgame_efficiency = $11,
         opening_quality = $12`,
      [
        gameId,
        playerId,
        totalMoves,
        averageMoveTimeMs,
        stonesCaptured,
        stonesLost,
        captureOpportunitiesMissed,
        blunders,
        missedCaptures,
        badAtariEscapes,
        endgameEfficiency,
        openingQuality,
      ]
    );
  }

  async getAnalysis(gameId: string, playerId: string): Promise<GameAnalysisResult | null> {
    const { rows } = await pool.query(
      `SELECT * FROM game_analyses WHERE game_id = $1 AND player_id = $2`,
      [gameId, playerId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      gameId: row.game_id,
      playerId: row.player_id,
      totalMoves: row.total_moves,
      averageMoveTimeMs: row.average_move_time_ms,
      stonesCaptured: row.stones_captured,
      stonesLost: row.stones_lost,
      captureOpportunitiesMissed: row.capture_opportunities_missed,
      blunders: row.blunders,
      missedCaptures: row.missed_captures,
      badAtariEscapes: row.bad_atari_escapes,
      endgameEfficiency: parseFloat(row.endgame_efficiency),
      openingQuality: row.opening_quality,
    };
  }
}
