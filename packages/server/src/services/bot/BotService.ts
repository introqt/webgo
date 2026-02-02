
import { BotDifficulty, User } from '@webgo/shared';
import { UserRepository } from '../../models/User.js';
import { GameRepository } from '../../models/Game.js';
import { GameService } from '../game/GameService.js';
import { BotEngine } from './BotEngine.js';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/database.js';
import bcrypt from 'bcryptjs';

export class BotService {
  constructor(
    private userRepo: UserRepository,
    private gameRepo: GameRepository,
    private gameService: GameService
  ) {}

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

    // Select move
    const movePos = BotEngine.selectMove(game.gameState.board, player.botDifficulty);

    if (movePos) {
      await this.gameService.makeMove(gameId, playerId, movePos);
    } else {
      // Pass if no valid moves (should be rare/endgame)
      await this.gameService.passTurn(gameId, playerId);
    }
  }

  private getDelayForDifficulty(difficulty: BotDifficulty): number {
    const min = 500;
    const max = 2500;
    // Maybe faster for hard bot? Or slower "thinking"?
    // Randomize within range
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
