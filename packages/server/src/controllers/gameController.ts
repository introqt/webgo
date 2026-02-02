import type { Request, Response } from 'express';
import { config } from '../config/index.js';
import { GameService } from '../services/game/index.js';
import { GameRepository } from '../models/Game.js';
import { UserRepository } from '../models/User.js';
import { GameEngine } from '../services/game/GameEngine.js';
import { BotService } from '../services/bot/BotService.js';
import { type BotDifficulty } from '@webgo/shared';
import { AnalyzerService } from '../services/analyzer/AnalyzerService.js';
import { GameAnalysisRepository } from '../models/GameAnalysis.js';

const gameRepo = new GameRepository();
const userRepo = new UserRepository();
const analysisRepo = new GameAnalysisRepository();
const gameService = new GameService(gameRepo);
const botService = new BotService(userRepo, gameRepo, gameService);
const analyzerService = new AnalyzerService(gameRepo, analysisRepo);

export async function createGame(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { boardSize, color, handicap, komi, ruleSet } = req.body;

    const game = await gameService.createGame({
      boardSize,
      creatorId: req.user.userId,
      creatorColor: color,
      handicap,
      komi,
      ruleSet,
    });

    // Generate invitation URL
    const baseUrl = config.cors.origin;
    const invitationUrl = `${baseUrl}/join/${game.invitationCode}`;

    res.status(201).json({
      game: {
        ...game,
        gameState: GameEngine.serializeGameState(game.gameState),
      },
      invitationCode: game.invitationCode,
      invitationUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create game';
    res.status(400).json({ error: message });
  }
}

export async function getGame(req: Request, res: Response): Promise<void> {
  try {
    const { gameId } = req.params;
    const testWin = req.query.test_win as string | undefined;

    // Handle test_win param (development only)
    if (testWin && process.env.NODE_ENV !== 'production') {
      if (testWin !== 'black' && testWin !== 'white') {
        res.status(400).json({ error: 'test_win must be "black" or "white"' });
        return;
      }

      const result = await gameService.forceWinner(gameId, testWin);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Fetch the updated game
      const updatedGame = await gameService.getGame(gameId);
      if (!updatedGame) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const blackPlayer = updatedGame.blackPlayerId
        ? await userRepo.getPublicInfo(updatedGame.blackPlayerId)
        : null;
      const whitePlayer = updatedGame.whitePlayerId
        ? await userRepo.getPublicInfo(updatedGame.whitePlayerId)
        : null;

      res.json({
        ...updatedGame,
        gameState: GameEngine.serializeGameState(updatedGame.gameState),
        blackPlayer,
        whitePlayer,
        testWinApplied: true,
      });
      return;
    }

    const game = await gameService.getGame(gameId);

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Get player info
    const blackPlayer = game.blackPlayerId
      ? await userRepo.getPublicInfo(game.blackPlayerId)
      : null;
    const whitePlayer = game.whitePlayerId
      ? await userRepo.getPublicInfo(game.whitePlayerId)
      : null;

    res.json({
      ...game,
      gameState: GameEngine.serializeGameState(game.gameState),
      blackPlayer,
      whitePlayer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get game';
    res.status(500).json({ error: message });
  }
}

export async function getGameByCode(req: Request, res: Response): Promise<void> {
  try {
    const { invitationCode } = req.params;
    const game = await gameService.getGameByInvitationCode(invitationCode);

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Get player info
    const blackPlayer = game.blackPlayerId
      ? await userRepo.getPublicInfo(game.blackPlayerId)
      : null;
    const whitePlayer = game.whitePlayerId
      ? await userRepo.getPublicInfo(game.whitePlayerId)
      : null;

    res.json({
      ...game,
      gameState: GameEngine.serializeGameState(game.gameState),
      blackPlayer,
      whitePlayer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get game';
    res.status(500).json({ error: message });
  }
}

export async function joinGame(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { invitationCode } = req.params;
    const game = await gameService.joinGame(invitationCode, req.user.userId);

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Determine player's color
    const color = game.blackPlayerId === req.user.userId ? 'black' : 'white';

    // Get player info
    const blackPlayer = game.blackPlayerId
      ? await userRepo.getPublicInfo(game.blackPlayerId)
      : null;
    const whitePlayer = game.whitePlayerId
      ? await userRepo.getPublicInfo(game.whitePlayerId)
      : null;

    res.json({
      game: {
        ...game,
        gameState: GameEngine.serializeGameState(game.gameState),
        blackPlayer,
        whitePlayer,
      },
      color,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join game';
    res.status(400).json({ error: message });
  }
}

export async function myGames(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const summaries = await gameRepo.getGameSummaries(req.user.userId);
    res.json({ games: summaries, total: summaries.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get games';
    res.status(500).json({ error: message });
  }
}

export async function resign(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { gameId } = req.params;
    const result = await gameService.resign(gameId, req.user.userId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Trigger analysis
    analyzerService.analyzeCompletedGame(gameId).catch(console.error);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resign';
    res.status(500).json({ error: message });
  }
}

export async function createVsBot(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { boardSize, difficulty, color, handicap, komi, ruleSet } = req.body;

    // Find bot user
    const botUser = await botService.getBotByDifficulty(difficulty);
    if (!botUser) {
      res.status(400).json({ error: 'Invalid difficulty' });
      return;
    }

    // Create game with human as creator
    const game = await gameService.createGame({
      boardSize,
      creatorId: req.user.userId,
      creatorColor: color, // 'black' or 'white' or undefined (random)
      handicap,
      komi,
      ruleSet,
    });

    // Determine which slot is empty and assign bot
    if (!game.blackPlayerId) {
      game.blackPlayerId = botUser.id;
    } else if (!game.whitePlayerId) {
      game.whitePlayerId = botUser.id;
    }

    game.status = 'active'; // Start game immediately
    game.updatedAt = new Date();
    await gameRepo.update(game);

    // Trigger bot if it's their turn
    botService.handlePossibleBotTurn(game.id).catch(console.error);

    res.status(201).json({
      game: {
        ...game,
        gameState: GameEngine.serializeGameState(game.gameState),
      },
      botPlayer: {
        id: botUser.id,
        username: botUser.username,
        rating: botUser.rating,
        isBot: true,
        botDifficulty: difficulty,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create game';
    res.status(400).json({ error: message });
  }
}

export async function getAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { gameId, playerId } = req.params;
    const analysis = await analyzerService.getGameAnalysis(gameId, playerId);

    if (!analysis) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    res.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get analysis';
    res.status(500).json({ error: message });
  }
}
