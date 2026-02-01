import type { Request, Response } from 'express';
import { UserRepository } from '../models/User.js';
import { GameRepository } from '../models/Game.js';
import type { LeaderboardUser } from '@webgo/shared';

const userRepo = new UserRepository();
const gameRepo = new GameRepository();

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await userRepo.getLeaderboard(limit, offset);
    const total = await userRepo.getTotalCount();

    // Add rank to each user
    const usersWithRank: LeaderboardUser[] = users.map((user, index) => ({
      ...user,
      rank: offset + index + 1,
    }));

    res.json({ users: usersWithRank, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get leaderboard';
    res.status(500).json({ error: message });
  }
}

export async function getGameHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const filter = (req.query.filter as 'all' | 'wins' | 'losses') || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await gameRepo.getGameHistoryWithRatings(userId, filter, limit, offset);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get game history';
    res.status(500).json({ error: message });
  }
}

export async function getMyGameHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const filter = (req.query.filter as 'all' | 'wins' | 'losses') || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await gameRepo.getGameHistoryWithRatings(req.user.userId, filter, limit, offset);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get game history';
    res.status(500).json({ error: message });
  }
}
