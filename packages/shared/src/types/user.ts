export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  rating: number;
  createdAt: Date;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface UserPublic {
  id: string;
  username: string;
  rating: number;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  winRate: number;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
