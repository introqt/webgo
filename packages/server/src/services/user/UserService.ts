import type { UserPublic, UserStats } from '@webgo/shared';
import { UserRepository } from '../../models/User.js';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUser(userId: string): Promise<UserPublic | null> {
    return this.userRepo.getPublicInfo(userId);
  }

  async getUserStats(userId: string): Promise<UserStats> {
    return this.userRepo.getStats(userId);
  }

  async getUserByUsername(username: string): Promise<UserPublic | null> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      rating: user.rating,
    };
  }
}
