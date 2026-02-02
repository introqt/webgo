
import { BoardSize, Move, Position } from '@webgo/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PatternMove {
  x: number;
  y: number;
}

interface JosekiPattern {
  moves: PatternMove[];
  description: string;
  quality: 'excellent' | 'good' | 'questionable' | 'blunder';
}

type OpeningBook = Record<string, Record<string, JosekiPattern>>;

export class OpeningBookMatcher {
  private static patterns: OpeningBook | null = null;

  private static loadPatterns() {
    if (!this.patterns) {
      try {
        const dataPath = path.join(__dirname, '../../data/joseki-patterns.json');
        const content = fs.readFileSync(dataPath, 'utf-8');
        this.patterns = JSON.parse(content);
      } catch (error) {
        console.error('Failed to load joseki patterns:', error);
        this.patterns = {};
      }
    }
    return this.patterns;
  }

  /**
   * Evaluate a move based on opening book
   */
  static evaluateMove(
    position: Position,
    boardSize: BoardSize,
    moveNumber: number
  ): { quality: string; reason: string } | null {
    // Only check opening book for first 20 moves
    if (moveNumber > 20) return null;

    const book = this.loadPatterns();
    if (!book) return null;

    const sizeKey = boardSize.toString();
    const patterns = book[sizeKey];
    if (!patterns) return null;

    // Check if move matches any pattern
    for (const [name, pattern] of Object.entries(patterns)) {
      if (this.matchesPattern(position, pattern)) {
        return {
          quality: pattern.quality,
          reason: pattern.description,
        };
      }
    }

    // Generic opening principles if no exact pattern match
    // 1. Corners are best in opening
    if (this.isCorner(position, boardSize)) {
      return {
        quality: 'good',
        reason: 'Occupying corner',
      };
    }

    // 2. Sides are second best
    if (this.isSide(position, boardSize)) {
        // Only if corners are taken? 
        // Simple heuristic for now
        return {
            quality: 'good',
            reason: 'Side extension',
        };
    }

    // 3. Center (Tengen) on 9x9 is excellent, but otherwise usually questionable early on (except specific strategies)
    if (boardSize === 9 && position.x === 4 && position.y === 4 && moveNumber === 1) {
        return {
            quality: 'excellent',
            reason: 'Tengen (Center)',
        };
    }

    return null;
  }

  private static matchesPattern(pos: Position, pattern: JosekiPattern): boolean {
    return pattern.moves.some(m => m.x === pos.x && m.y === pos.y);
  }

  private static isCorner(pos: Position, size: BoardSize): boolean {
    // Within 4 lines of corner?
    // Simply check 3-3, 3-4, 4-4, 4-3 points
    // Or just "Corner area"
    if (size === 19) {
        // 4x4 box in corner
        const cornerDist = 4;
        const xDist = Math.min(pos.x, size - 1 - pos.x);
        const yDist = Math.min(pos.y, size - 1 - pos.y);
        return xDist < cornerDist && yDist < cornerDist;
    }
    if (size === 13 || size === 9) {
        const cornerDist = 3;
        const xDist = Math.min(pos.x, size - 1 - pos.x);
        const yDist = Math.min(pos.y, size - 1 - pos.y);
        return xDist < cornerDist && yDist < cornerDist;
    }
    return false;
  }

  private static isSide(pos: Position, size: BoardSize): boolean {
      const xDist = Math.min(pos.x, size - 1 - pos.x);
      const yDist = Math.min(pos.y, size - 1 - pos.y);
      // One coord is near edge (3rd/4th line), the other is not (middle)
      const isEdgeX = xDist >= 2 && xDist <= 3; // 3rd/4th line
      const isEdgeY = yDist >= 2 && yDist <= 3;
      
      const isMiddleX = xDist > 3;
      const isMiddleY = yDist > 3;
      
      return (isEdgeX && isMiddleY) || (isEdgeY && isMiddleX);
  }
}
