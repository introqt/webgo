import type { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth/index.js';
import { UserRepository } from '../models/User.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const userRepo = new UserRepository();
const authService = new AuthService(userRepo);

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = authService.verifyToken(token);
    } catch {
      // Invalid token, but continue without user
    }
  }

  next();
}
