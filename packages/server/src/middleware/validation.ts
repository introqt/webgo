import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

// Validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createGameSchema = z.object({
  boardSize: z.union([z.literal(9), z.literal(13), z.literal(19)]),
  color: z.enum(['black', 'white']).optional(),
  handicap: z.number().int().min(0).max(9).optional(),
  komi: z.number().min(0).max(100).optional(),
  ruleSet: z.enum(['chinese', 'japanese']).optional(),
});

export const makeMoveSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const markDeadStonesSchema = z.object({
  positions: z.array(z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
  })),
});
