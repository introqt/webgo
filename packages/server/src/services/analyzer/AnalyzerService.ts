
import { GameRepository } from '../../models/Game.js';
import { GameAnalysisRepository, GameAnalysisResult } from '../../models/GameAnalysis.js';
import { AnalysisEngine } from './AnalysisEngine.js';

export class AnalyzerService {
  constructor(
    private gameRepo: GameRepository,
    private analysisRepo: GameAnalysisRepository
  ) {}

  /**
   * Analyze a completed game for metrics on both sides
   */
  async analyzeCompletedGame(gameId: string): Promise<void> {
    const game = await this.gameRepo.findById(gameId);
    if (!game) return;

    // Analyze Black Player
    if (game.blackPlayerId) {
      const result = AnalysisEngine.analyzeGame(
        gameId,
        'black',
        game.blackPlayerId,
        game.gameState.moveHistory,
        game.boardSize
      );
      await this.analysisRepo.saveAnalysis(result);
    }

    // Analyze White Player
    if (game.whitePlayerId) {
      const result = AnalysisEngine.analyzeGame(
        gameId,
        'white',
        game.whitePlayerId,
        game.gameState.moveHistory,
        game.boardSize
      );
      await this.analysisRepo.saveAnalysis(result);
    }
  }

  /**
   * Get analysis for a specific game and player
   */
  async getGameAnalysis(
    gameId: string,
    playerId: string
  ): Promise<GameAnalysisResult | null> {
    return this.analysisRepo.getAnalysis(gameId, playerId);
  }
}
