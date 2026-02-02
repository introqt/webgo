import { v4 as uuidv4 } from 'uuid';
import type {
  Game,
  GameState,
  BoardSize,
  StoneColor,
  Position,
  Move,
  GameStatus,
  RuleSet,
  SerializedGameState,
  GameResult,
} from '@webgo/shared';
import { DEFAULT_KOMI, INVITATION_CODE_LENGTH } from '@webgo/shared';
import { GameEngine } from './GameEngine.js';
import { GameRepository } from '../../models/Game.js';
import { UserRepository } from '../../models/User.js';
import { RatingChangeRepository } from '../../models/RatingChange.js';
import { EloService } from '../rating/EloService.js';

export interface CreateGameOptions {
  boardSize: BoardSize;
  creatorId: string;
  creatorColor?: StoneColor;
  handicap?: number;
  komi?: number;
  ruleSet?: RuleSet;
}

export interface MakeMoveResult {
  success: boolean;
  error?: string;
  capturedStones?: Position[];
  gameState?: SerializedGameState;
  gameEnded?: boolean;
  gameResult?: GameResult;
}

export class GameService {
  private userRepo: UserRepository;
  private ratingChangeRepo: RatingChangeRepository;

  constructor(private gameRepo: GameRepository) {
    this.userRepo = new UserRepository();
    this.ratingChangeRepo = new RatingChangeRepository();
  }

  /**
   * Generate a unique invitation code
   */
  private generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
    let code = '';
    for (let i = 0; i < INVITATION_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new game
   */
  async createGame(options: CreateGameOptions): Promise<Game> {
    const {
      boardSize,
      creatorId,
      creatorColor,
      handicap = 0,
      ruleSet = 'chinese',
    } = options;

    // Determine komi (default based on rule set, or 0.5 with handicap)
    let komi = options.komi ?? DEFAULT_KOMI[ruleSet];
    if (handicap > 0) {
      komi = 0.5; // With handicap, komi is typically 0.5
    }

    // Randomly assign color if not specified
    const actualCreatorColor = creatorColor ?? (Math.random() < 0.5 ? 'black' : 'white');

    // Create initial game state
    let gameState = GameEngine.createGameState(boardSize);

    // Apply handicap if specified
    if (handicap > 0) {
      gameState.board = GameEngine.applyHandicap(gameState.board, handicap);
    }

    // Generate invitation code
    let invitationCode = this.generateInvitationCode();

    // Ensure uniqueness
    while (await this.gameRepo.findByInvitationCode(invitationCode)) {
      invitationCode = this.generateInvitationCode();
    }

    const game: Game = {
      id: uuidv4(),
      boardSize,
      blackPlayerId: actualCreatorColor === 'black' ? creatorId : null,
      whitePlayerId: actualCreatorColor === 'white' ? creatorId : null,
      gameState,
      status: 'waiting',
      handicap,
      komi,
      ruleSet,
      invitationCode,
      winner: null,
      winReason: null,
      finalScore: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    await this.gameRepo.create(game);
    return game;
  }

  /**
   * Join a game by invitation code
   */
  async joinGame(invitationCode: string, playerId: string): Promise<Game | null> {
    const game = await this.gameRepo.findByInvitationCode(invitationCode);
    if (!game) return null;

    if (game.status !== 'waiting') {
      throw new Error('Game is not waiting for players');
    }

    // Check if player is already in the game
    if (game.blackPlayerId === playerId || game.whitePlayerId === playerId) {
      return game; // Already joined
    }

    // Assign to empty slot
    if (!game.blackPlayerId) {
      game.blackPlayerId = playerId;
    } else if (!game.whitePlayerId) {
      game.whitePlayerId = playerId;
    } else {
      throw new Error('Game is full');
    }

    // Start game if both players present
    if (game.blackPlayerId && game.whitePlayerId) {
      game.status = 'active';
    }

    game.updatedAt = new Date();
    await this.gameRepo.update(game);
    return game;
  }

  /**
   * Get a game by ID
   */
  async getGame(gameId: string): Promise<Game | null> {
    return this.gameRepo.findById(gameId);
  }

  /**
   * Get a game by invitation code
   */
  async getGameByInvitationCode(code: string): Promise<Game | null> {
    return this.gameRepo.findByInvitationCode(code);
  }

  /**
   * Retry wrapper for operations with optimistic locking
   */
  private async withRetry<T>(
    operation: () => Promise<{ success: boolean; error?: string } & T>,
    maxAttempts = 3
  ): Promise<{ success: boolean; error?: string } & T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await operation();
      
      if (result.success || result.error !== 'Concurrent modification detected') {
        return result;
      }
      
      if (attempt < maxAttempts) {
        // Wait briefly before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt - 1)));
      }
    }
    
    return {
      success: false,
      error: 'Operation failed after multiple attempts due to concurrent modifications',
    } as { success: boolean; error?: string } & T;
  }

  /**
   * Make a move in the game
   */
  async makeMove(
    gameId: string,
    playerId: string,
    position: Position
  ): Promise<MakeMoveResult> {
    return this.withRetry(async () => {
      const game = await this.gameRepo.findById(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      if (game.status !== 'active') {
        return { success: false, error: 'Game is not active' };
      }

      // Determine player's color
      const playerColor = this.getPlayerColor(game, playerId);
      if (!playerColor) {
        return { success: false, error: 'Player not in game' };
      }

      // Check if it's the player's turn
      if (game.gameState.board.currentTurn !== playerColor) {
        return { success: false, error: 'Not your turn' };
      }

      // Attempt the move
      const result = GameEngine.makeMove(game.gameState.board, position, playerColor);
      if (!result.valid) {
        return { success: false, error: result.reason };
      }

      // Update game state
      game.gameState.board = result.newState;

      // Record the move
      const move: Move = {
        gameId,
        playerId,
        moveNumber: game.gameState.moveHistory.length + 1,
        color: playerColor,
        position,
        capturedStones: result.capturedStones,
        isPass: false,
        createdAt: new Date(),
      };
      game.gameState.moveHistory.push(move);
      game.updatedAt = new Date();

      const updated = await this.gameRepo.update(game);
      if (!updated) {
        return { success: false, error: 'Concurrent modification detected' };
      }

      await this.gameRepo.saveMove(move);

      return {
        success: true,
        capturedStones: result.capturedStones,
        gameState: GameEngine.serializeGameState(game.gameState),
      };
    });
  }

  /**
   * Pass turn
   */
  async passTurn(gameId: string, playerId: string): Promise<MakeMoveResult> {
    return this.withRetry(async () => {
      const game = await this.gameRepo.findById(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      if (game.status !== 'active') {
        return { success: false, error: 'Game is not active' };
      }

      const playerColor = this.getPlayerColor(game, playerId);
      if (!playerColor) {
        return { success: false, error: 'Player not in game' };
      }

      if (game.gameState.board.currentTurn !== playerColor) {
        return { success: false, error: 'Not your turn' };
      }

      // Execute pass
      game.gameState.board = GameEngine.pass(game.gameState.board);

      // Record the pass
      const move: Move = {
        gameId,
        playerId,
        moveNumber: game.gameState.moveHistory.length + 1,
        color: playerColor,
        position: null,
        capturedStones: [],
        isPass: true,
        createdAt: new Date(),
      };
      game.gameState.moveHistory.push(move);
      game.updatedAt = new Date();

      // Check for game end (two consecutive passes)
      let gameEnded = false;
      let gameResult: GameResult | undefined;

      if (GameEngine.shouldEndGame(game.gameState.board)) {
        game.status = 'scoring';
        // Calculate preliminary territory
        game.gameState.territory = GameEngine.calculateTerritory(
          game.gameState.board.stones,
          game.gameState.board.size,
          []
        );
      }

      const updated = await this.gameRepo.update(game);
      if (!updated) {
        return { success: false, error: 'Concurrent modification detected' };
      }

      await this.gameRepo.saveMove(move);

      return {
        success: true,
        capturedStones: [],
        gameState: GameEngine.serializeGameState(game.gameState),
        gameEnded,
        gameResult,
      };
    });
  }

  /**
   * Resign from game
   */
  async resign(gameId: string, playerId: string): Promise<MakeMoveResult> {
    const game = await this.gameRepo.findById(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const playerColor = this.getPlayerColor(game, playerId);
    if (!playerColor) {
      return { success: false, error: 'Player not in game' };
    }

    // Handle waiting games: soft delete instead of resign
    if (game.status === 'waiting') {
      const deleted = await this.gameRepo.softDelete(gameId);
      if (!deleted) {
        return { success: false, error: 'Failed to leave game' };
      }
      return {
        success: true,
        gameState: GameEngine.serializeGameState(game.gameState),
      };
    }

    // Original resign logic for active/scoring games
    if (game.status !== 'active' && game.status !== 'scoring') {
      return { success: false, error: 'Cannot resign from this game' };
    }

    // End the game
    game.status = 'finished';
    game.winner = GameEngine.oppositeColor(playerColor);
    game.winReason = 'resignation';
    game.finalScore = { black: 0, white: 0 };
    game.updatedAt = new Date();

    await this.gameRepo.update(game);

    // Update ratings
    const winnerId = game.winner === 'black' ? game.blackPlayerId : game.whitePlayerId;
    const loserId = playerId;
    if (winnerId && loserId) {
      await this.updateRatingsAfterGame(game.id, winnerId, loserId, false);
    }

    return {
      success: true,
      gameState: GameEngine.serializeGameState(game.gameState),
      gameEnded: true,
      gameResult: {
        winner: game.winner,
        reason: 'resignation',
        finalScore: game.finalScore,
      },
    };
  }

  /**
   * Mark dead stones during scoring phase
   */
  async markDeadStones(
    gameId: string,
    playerId: string,
    positions: Position[]
  ): Promise<MakeMoveResult> {
    const game = await this.gameRepo.findById(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'scoring') {
      return { success: false, error: 'Game is not in scoring phase' };
    }

    const playerColor = this.getPlayerColor(game, playerId);
    if (!playerColor) {
      return { success: false, error: 'Player not in game' };
    }

    // Toggle dead stone marking
    for (const pos of positions) {
      // Validate position is within bounds
      if (pos.x < 0 || pos.x >= game.boardSize || pos.y < 0 || pos.y >= game.boardSize) {
        return {
          success: false,
          error: `Invalid position (${pos.x}, ${pos.y}): out of bounds for ${game.boardSize}x${game.boardSize} board`,
        };
      }

      // Validate position contains a stone
      const key = `${pos.x},${pos.y}`;
      if (!game.gameState.board.stones.has(key)) {
        return {
          success: false,
          error: `Invalid position (${pos.x}, ${pos.y}): no stone at this position`,
        };
      }

      const isMarked = GameEngine.positionInList(pos, game.gameState.deadStones);
      if (isMarked) {
        game.gameState.deadStones = game.gameState.deadStones.filter(
          (p) => p.x !== pos.x || p.y !== pos.y
        );
      } else {
        game.gameState.deadStones.push(pos);
      }
    }

    // Recalculate territory
    game.gameState.territory = GameEngine.calculateTerritory(
      game.gameState.board.stones,
      game.gameState.board.size,
      game.gameState.deadStones
    );

    game.updatedAt = new Date();
    await this.gameRepo.update(game);

    return {
      success: true,
      gameState: GameEngine.serializeGameState(game.gameState),
    };
  }

  /**
   * Accept the current score (both players must accept to end)
   */
  async acceptScore(
    gameId: string,
    playerId: string
  ): Promise<MakeMoveResult & { bothAccepted?: boolean }> {
    const game = await this.gameRepo.findById(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'scoring') {
      return { success: false, error: 'Game is not in scoring phase' };
    }

    // In a full implementation, we'd track who has accepted
    // For MVP, we'll just finalize when this is called
    const score = GameEngine.calculateScore(
      game.gameState.board.stones,
      game.gameState.board.size,
      game.gameState.board.captures,
      game.gameState.deadStones,
      game.komi,
      game.ruleSet
    );

    game.status = 'finished';
    game.finalScore = score;

    if (score.black > score.white) {
      game.winner = 'black';
    } else if (score.white > score.black) {
      game.winner = 'white';
    } else {
      game.winner = 'draw';
    }
    game.winReason = 'score';
    game.updatedAt = new Date();

    await this.gameRepo.update(game);

    // Update ratings
    if (game.blackPlayerId && game.whitePlayerId) {
      if (game.winner === 'draw') {
        await this.updateRatingsAfterGame(game.id, game.blackPlayerId, game.whitePlayerId, true);
      } else {
        const winnerId = game.winner === 'black' ? game.blackPlayerId : game.whitePlayerId;
        const loserId = game.winner === 'black' ? game.whitePlayerId : game.blackPlayerId;
        await this.updateRatingsAfterGame(game.id, winnerId, loserId, false);
      }
    }

    return {
      success: true,
      gameState: GameEngine.serializeGameState(game.gameState),
      gameEnded: true,
      bothAccepted: true,
      gameResult: {
        winner: game.winner,
        reason: 'score',
        finalScore: game.finalScore,
      },
    };
  }

  /**
   * Get user's games
   */
  async getUserGames(userId: string): Promise<Game[]> {
    return this.gameRepo.findByUserId(userId);
  }

  /**
   * Helper to get a player's color in a game
   */
  private getPlayerColor(game: Game, playerId: string): StoneColor | null {
    if (game.blackPlayerId === playerId) return 'black';
    if (game.whitePlayerId === playerId) return 'white';
    return null;
  }

  /**
   * Update ratings after a game ends
   * @param gameId - The game ID
   * @param player1Id - Winner ID (or first player for draw)
   * @param player2Id - Loser ID (or second player for draw)
   * @param isDraw - Whether the game was a draw
   */
  private async updateRatingsAfterGame(
    gameId: string,
    player1Id: string,
    player2Id: string,
    isDraw: boolean
  ): Promise<void> {
    const player1 = await this.userRepo.findById(player1Id);
    const player2 = await this.userRepo.findById(player2Id);

    if (!player1 || !player2) return;

    if (isDraw) {
      const result = EloService.calculateDrawResult(player1.rating, player2.rating);

      // Update player 1 rating
      await this.userRepo.updateRating(player1Id, result.player1.newRating);
      await this.ratingChangeRepo.create({
        gameId,
        userId: player1Id,
        ratingBefore: player1.rating,
        ratingAfter: result.player1.newRating,
        ratingChange: result.player1.ratingChange,
      });

      // Update player 2 rating
      await this.userRepo.updateRating(player2Id, result.player2.newRating);
      await this.ratingChangeRepo.create({
        gameId,
        userId: player2Id,
        ratingBefore: player2.rating,
        ratingAfter: result.player2.newRating,
        ratingChange: result.player2.ratingChange,
      });
    } else {
      // player1 is winner, player2 is loser
      const result = EloService.calculateGameResult(player1.rating, player2.rating);

      // Update winner rating
      await this.userRepo.updateRating(player1Id, result.winner.newRating);
      await this.ratingChangeRepo.create({
        gameId,
        userId: player1Id,
        ratingBefore: player1.rating,
        ratingAfter: result.winner.newRating,
        ratingChange: result.winner.ratingChange,
      });

      // Update loser rating
      await this.userRepo.updateRating(player2Id, result.loser.newRating);
      await this.ratingChangeRepo.create({
        gameId,
        userId: player2Id,
        ratingBefore: player2.rating,
        ratingAfter: result.loser.newRating,
        ratingChange: result.loser.ratingChange,
      });
    }
  }

  /**
   * Force a winner for testing purposes (development only)
   */
  async forceWinner(gameId: string, winnerColor: StoneColor): Promise<MakeMoveResult> {
    const game = await this.gameRepo.findById(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'active' && game.status !== 'scoring') {
      return { success: false, error: 'Game is not active' };
    }

    // End the game with forced winner
    game.status = 'finished';
    game.winner = winnerColor;
    game.winReason = 'score';
    game.finalScore = winnerColor === 'black' ? { black: 100, white: 0 } : { black: 0, white: 100 };
    game.updatedAt = new Date();

    await this.gameRepo.update(game);

    // Update ratings
    if (game.blackPlayerId && game.whitePlayerId) {
      const winnerId = winnerColor === 'black' ? game.blackPlayerId : game.whitePlayerId;
      const loserId = winnerColor === 'black' ? game.whitePlayerId : game.blackPlayerId;
      await this.updateRatingsAfterGame(game.id, winnerId, loserId, false);
    }

    return {
      success: true,
      gameState: GameEngine.serializeGameState(game.gameState),
      gameEnded: true,
      gameResult: {
        winner: game.winner,
        reason: 'score',
        finalScore: game.finalScore,
      },
    };
  }
}
