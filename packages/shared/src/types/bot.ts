
import { Position } from './game.js';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface MoveCandidate {
  position: Position;
  score: number;
  type: 'capture' | 'save' | 'territory' | 'strategic' | 'random';
}
