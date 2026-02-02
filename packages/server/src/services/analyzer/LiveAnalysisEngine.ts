
import {
  BoardState,
  Move,
  MoveQualityEvaluation,
  StoneColor,
  MoveQuality,
  Position,
  BoardSize,
} from '@webgo/shared';
import { GameEngine } from '../game/GameEngine.js';
import { OpeningBookMatcher } from './OpeningBookMatcher.js';

export class LiveAnalysisEngine {
  /**
   * Evaluate a single move immediately after it's made
   */
  static evaluateMove(
    previousState: BoardState,
    currentState: BoardState,
    move: Move,
    playerColor: StoneColor
  ): MoveQualityEvaluation {
    const start = Date.now();
    let quality: MoveQuality = 'questionable';
    let score = 50;
    let reason = 'Normal move';
    const details: any = {};

    // 1. Opening Book Analysis
    const openingEval = OpeningBookMatcher.evaluateMove(
      move.position!,
      currentState.size,
      move.moveNumber
    );

    if (openingEval) {
      quality = openingEval.quality as MoveQuality;
      reason = openingEval.reason;
      score = quality === 'excellent' ? 95 : 80;
    } else {
      // 2. Tactical Analysis
      
      // Check for captures
      if (move.capturedStones && move.capturedStones.length > 0) {
        if (move.capturedStones.length >= 2) {
            quality = 'excellent';
            score = 90;
            reason = `Captured ${move.capturedStones.length} stones`;
        } else {
            quality = 'good';
            score = 75;
            reason = 'Captured a stone';
        }
        details.capturedStones = move.capturedStones.length;
      } 
      // Check if move saved a group from atari
      else {
          // Did we decrease the number of own groups in atari compared to previous state?
           const atariBefore = this.countGroupsInAtari(previousState, playerColor);
           const atariAfter = this.countGroupsInAtari(currentState, playerColor);
           
           if (atariAfter < atariBefore) {
               quality = 'good';
               score = 80;
               reason = 'Saved stones from capture';
               details.savedGroup = true;
           }
           // Did we place yourself in atari? (Self-atari)
           else {
               const selfGroup = GameEngine.findGroup(currentState.stones, move.position!, currentState.size);
               const liberties = GameEngine.countLiberties(currentState.stones, selfGroup, currentState.size);
               
               if (liberties === 1) {
                   // Only bad if the group is small or large. Generally bad.
                   // Unless it's a sacrifice or ko threat (too complex for this heuristic)
                   // But if captured next turn, it's definitely bad.
                   // Simple heuristic: don't play into atari
                   quality = 'blunder';
                   score = 30;
                   reason = 'Placed stones in atari (danger)';
                   details.createdWeakGroup = true;
               }
               // Check if we missed a capture opportunity
               else {
                   const missedCapture = this.checkForMissedCapture(previousState, playerColor);
                   if (missedCapture) {
                       quality = 'questionable';
                       score = 45;
                       reason = 'Missed capture opportunity';
                       details.missedCapture = true;
                   } else {
                       // Normal move
                       if (score === 50) { // untouched
                           // Improve score slightly for solid moves (3+ liberties)
                           if (liberties >= 3) {
                               score = 60;
                               // If not 'good' already
                           }
                           
                           // If opening and not corner/side, downgrade slightly? 
                           // Handled by OpeningBook returning null -> here.
                           if (move.moveNumber < 20 && !this.isEdge(move.position!, currentState.size)) {
                               reason = 'Center play in opening is unusual';
                               score = 45;
                           }
                       }
                   }
               }
           }
      }
    }

    return {
      moveNumber: move.moveNumber,
      quality,
      score,
      reason,
      details,
    };
  }

  private static countGroupsInAtari(board: BoardState, color: StoneColor): number {
    const visited = new Set<string>();
    let count = 0;
    
    for (const [key, stoneColor] of board.stones) {
        if (stoneColor !== color || visited.has(key)) continue;
        
        const pos = GameEngine.keyToPosition(key);
        const group = GameEngine.findGroup(board.stones, pos, board.size);
        group.forEach(p => visited.add(GameEngine.positionToKey(p)));
        
        if (GameEngine.countLiberties(board.stones, group, board.size) === 1) {
            count++;
        }
    }
    return count;
  }

  private static checkForMissedCapture(board: BoardState, color: StoneColor): boolean {
      // Check if opponent had any groups with 1 liberty that could be captured
      const opponentColor = GameEngine.oppositeColor(color);
      const groupsInAtari = this.getGroupsInAtari(board, opponentColor);
      
      for (const group of groupsInAtari) {
          // Check if the liberty was playable (not suicide, not ko)
          // Simplified: assume yes if it exists
          // Real check: find liberty, try to play there.
          const liberties = this.getLibertiesOfGroup(board, group);
          // If any liberty is valid move?
          // We don't have easy access to valid move chck without full simulation, but let's assume if atari exists, it's capturable usually.
          if (liberties.length > 0) return true;
      }
      return false;
  }

  private static getGroupsInAtari(board: BoardState, color: StoneColor): Position[][] {
      const groups: Position[][] = [];
      const visited = new Set<string>();
      
      for (const [key, stoneColor] of board.stones) {
          if (stoneColor !== color || visited.has(key)) continue;
          
          const pos = GameEngine.keyToPosition(key);
          const group = GameEngine.findGroup(board.stones, pos, board.size);
          group.forEach(p => visited.add(GameEngine.positionToKey(p)));
          
          if (GameEngine.countLiberties(board.stones, group, board.size) === 1) {
              groups.push(group);
          }
      }
      return groups;
  }

  private static getLibertiesOfGroup(board: BoardState, group: Position[]): Position[] {
      const liberties: Position[] = [];
      const visited = new Set<string>();
      
      for (const pos of group) {
          const adjacent = GameEngine.getAdjacentPositions(pos, board.size);
          for (const adj of adjacent) {
              const key = GameEngine.positionToKey(adj);
              if (!board.stones.has(key) && !visited.has(key)) {
                  visited.add(key);
                  liberties.push(adj);
              }
          }
      }
      return liberties;
  }

  private static isEdge(pos: Position, size: BoardSize): boolean {
      return pos.x === 0 || pos.x === size - 1 || pos.y === 0 || pos.y === size - 1 ||
             pos.x === 1 || pos.x === size - 2 || pos.y === 1 || pos.y === size - 2 ||
             pos.x === 2 || pos.x === size - 3 || pos.y === 2 || pos.y === size - 3;
      // 1st, 2nd, 3rd lines are "edge" oriented in opening
  }
}
