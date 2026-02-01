export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  rating: number;
  createdAt: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  rating: number;
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
