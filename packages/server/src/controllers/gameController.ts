import type { Request, Response } from 'express';
import { config } from '../config/index.js';
import { GameService } from '../services/game/index.js';
import { GameRepository } from '../models/Game.js';
import { UserRepository } from '../models/User.js';
import { GameEngine } from '../services/game/GameEngine.js';

const gameRepo = new GameRepository();
const userRepo = new UserRepository();
const gameService = new GameService(gameRepo);

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

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resign';
    res.status(500).json({ error: message });
  }
}
