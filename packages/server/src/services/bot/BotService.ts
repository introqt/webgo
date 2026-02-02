
import { BotDifficulty, User } from '@webgo/shared';
import { UserRepository } from '../../models/User.js';
import { GameRepository } from '../../models/Game.js';
import { GameService } from '../game/GameService.js';
import { BotEngine } from './BotEngine.js';
import { GameEngine } from '../game/GameEngine.js';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/database.js';
import bcrypt from 'bcryptjs';
import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@webgo/shared';
import type { ScoreAcceptanceRepository } from '../../models/ScoreAcceptance.js';
import type { RatingChangeRepository } from '../../models/RatingChange.js';
import type { AnalyzerService } from '../analyzer/AnalyzerService.js';

export class BotService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

  constructor(
    private userRepo: UserRepository,
    private gameRepo: GameRepository,
    private gameService: GameService
  ) {}

  /**
   * Set the Socket.io server instance for broadcasting bot moves
   */
  setSocketServer(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.io = io;
  }

  /**
   * Create bot users if they don't exist
   */
  async createBotUsers(): Promise<void> {
    const bots: { difficulty: BotDifficulty; username: string; rating: number }[] = [
      { difficulty: 'easy', username: 'Bot-Easy', rating: 900 },
      { difficulty: 'medium', username: 'Bot-Medium', rating: 1400 },
      { difficulty: 'hard', username: 'Bot-Hard', rating: 1900 },
    ];

    for (const bot of bots) {
      const existing = await this.userRepo.findByUsername(bot.username);
      if (!existing) {
        // Create bot user
        // We need to bypass normal registration validation or hash a dummy password
        const passwordHash = await bcrypt.hash('bot-secret-password', 10);
        
        // Manual insert since UserRepo might not expose raw create with isBot
        // Or if UserRepo.create supports it. 
        // Let's try raw SQL to be safe as we added new columns that existing Repo might not support yet
        await pool.query(
          `INSERT INTO users (id, username, email, password_hash, rating, is_bot, bot_difficulty, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            uuidv4(),
            bot.username,
            `${bot.username.toLowerCase()}@bot.webgo`,
            passwordHash,
            bot.rating,
            true,
            bot.difficulty
          ]
        );
        console.log(`Created bot user: ${bot.username}`);
      }
    }
  }

  /**
   * Get a bot user by difficulty
   */
  async getBotByDifficulty(difficulty: BotDifficulty): Promise<User | null> {
      // We might need to extend UserRepo to find by bot difficulty, or just query by username convention
      const username = `Bot-${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
      return this.userRepo.findByUsername(username);
  }

  /**
   * Check if the current turn is a bot's turn and make a move if so
   */
  async handlePossibleBotTurn(gameId: string): Promise<void> {
    const game = await this.gameRepo.findById(gameId);
    if (!game || game.status !== 'active') return;

    const currentTurnColor = game.gameState.board.currentTurn;
    const playerId = currentTurnColor === 'black' ? game.blackPlayerId : game.whitePlayerId;

    if (!playerId) return;

    const player = await this.userRepo.findById(playerId);
    if (!player || !player.isBot || !player.botDifficulty) return;

    // It is a bot's turn
    console.log(`Bot doing move for game ${gameId} (Difficulty: ${player.botDifficulty})`);

    // Simulate thinking time
    const delay = this.getDelayForDifficulty(player.botDifficulty);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Select move - use async method which supports external APIs for hard mode
    const movePos = await BotEngine.selectMoveAsync(game.gameState.board, player.botDifficulty);

    if (movePos) {
      const result = await this.gameService.makeMove(gameId, playerId, movePos);

      if (result.success && this.io) {
        // Fetch updated game state
        const updatedGame = await this.gameRepo.findById(gameId);
        if (updatedGame) {
          // Broadcast bot move to all clients in the room
          this.io.to(gameId).emit('move_made', {
            move: {
              color: currentTurnColor,
              position: { x: movePos.x, y: movePos.y },
              moveNumber: updatedGame.gameState.moveHistory.length,
            },
            capturedStones: result.capturedStones || [],
            gameState: GameEngine.serializeGameState(updatedGame.gameState),
          });
        }
      }
    } else {
      // Pass if no valid moves (should be rare/endgame)
      const result = await this.gameService.passTurn(gameId, playerId);

      if (result.success && this.io) {
        const updatedGame = await this.gameRepo.findById(gameId);
        if (updatedGame) {
          this.io.to(gameId).emit('turn_passed', {
            color: currentTurnColor,
            consecutivePasses: updatedGame.gameState.board.consecutivePasses,
            gameState: GameEngine.serializeGameState(updatedGame.gameState),
          });

          // Check if scoring phase started
          if (updatedGame.status === 'scoring') {
            this.io.to(gameId).emit('scoring_started', {
              gameState: GameEngine.serializeGameState(updatedGame.gameState),
            });
          }
        }
      }
    }
  }

  private getDelayForDifficulty(difficulty: BotDifficulty): number {
    const min = 500;
    const max = 2500;
    // Maybe faster for hard bot? Or slower "thinking"?
    // Randomize within range
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Handle bot auto-acceptance of score during scoring phase
   * Called when a human accepts score in a bot game
   */
  async handleBotScoreAcceptance(
    gameId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    scoreRepo: ScoreAcceptanceRepository,
    gameService: GameService,
    userRepo: UserRepository,
    ratingRepo: RatingChangeRepository,
    analyzerService: AnalyzerService
  ): Promise<void> {
    const game = await this.gameRepo.findById(gameId);
    if (!game || game.status !== 'scoring') return;

    // Check if either player is a bot
    const blackPlayer = game.blackPlayerId ? await this.userRepo.findById(game.blackPlayerId) : null;
    const whitePlayer = game.whitePlayerId ? await this.userRepo.findById(game.whitePlayerId) : null;

    const botPlayer = blackPlayer?.isBot ? blackPlayer : whitePlayer?.isBot ? whitePlayer : null;
    if (!botPlayer) return;

    // Add a small delay to simulate thinking
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Bot accepts the score
    await scoreRepo.addAcceptance(gameId, botPlayer.id);
    console.log(`Bot ${botPlayer.username} auto-accepted score for game ${gameId}`);

    // Check if both players have now accepted
    const bothAccepted = await scoreRepo.bothPlayersAccepted(
      gameId,
      game.blackPlayerId || '',
      game.whitePlayerId || ''
    );

    // Notify about bot acceptance
    io.to(gameId).emit('score_accepted', {
      acceptedBy: botPlayer.id,
      bothAccepted,
    });

    if (bothAccepted) {
      const result = await gameService.acceptScore(gameId, botPlayer.id);

      if (result.success && result.gameResult) {
        // Fetch player info and rating changes
        const blackPlayerInfo = game.blackPlayerId ? await userRepo.getPublicInfo(game.blackPlayerId) : null;
        const whitePlayerInfo = game.whitePlayerId ? await userRepo.getPublicInfo(game.whitePlayerId) : null;
        const ratingChanges = await ratingRepo.findByGameId(gameId);

        io.to(gameId).emit('game_ended', {
          winner: result.gameResult.winner,
          reason: 'score',
          finalScore: result.gameResult.finalScore,
          blackPlayer: blackPlayerInfo,
          whitePlayer: whitePlayerInfo,
          ratingChanges: {
            black: ratingChanges.find(r => r.userId === game.blackPlayerId)
              ? {
                  change: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingChange,
                  newRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingAfter,
                  oldRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingBefore,
                }
              : null,
            white: ratingChanges.find(r => r.userId === game.whitePlayerId)
              ? {
                  change: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingChange,
                  newRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingAfter,
                  oldRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingBefore,
                }
              : null,
          },
        });

        // Analyze completed game
        analyzerService.analyzeCompletedGame(gameId).catch((err) =>
          console.error('Analysis failed for game', gameId, err)
        );

        // Clean up
        await scoreRepo.clearAcceptances(gameId);
      }
    }
  }
}
