import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserPublic } from '@webgo/shared';
import { config } from '../../config/index.js';
import { UserRepository } from '../../models/User.js';

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ user: UserPublic; token: string }> {
    // Check if user already exists
    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    const existingUsername = await this.userRepo.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userRepo.create({
      username,
      email,
      passwordHash,
      rating: 1500,
      isBot: false,
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        rating: user.rating,
      },
      token,
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: UserPublic; token: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        rating: user.rating,
      },
      token,
    };
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch {
      throw new Error('Invalid token');
    }
  }

  private generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }
}
