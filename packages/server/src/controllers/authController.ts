import type { Request, Response } from 'express';
import { AuthService } from '../services/auth/index.js';
import { UserService } from '../services/user/index.js';
import { UserRepository } from '../models/User.js';

const userRepo = new UserRepository();
const authService = new AuthService(userRepo);
const userService = new UserService(userRepo);

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register(username, email, password);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await userService.getUser(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stats = await userService.getUserStats(req.user.userId);
    res.json({ user, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    res.status(500).json({ error: message });
  }
}
