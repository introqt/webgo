
import {
  BoardState,
  BotDifficulty,
  MoveCandidate,
  Position,
  StoneColor,
  BoardSize,
} from '@webgo/shared';
import { GameEngine } from '../game/GameEngine.js';
import type { ExternalBotProvider, ExternalBotConfig } from './ExternalBotProvider.js';
import { KataGoProvider } from './KataGoProvider.js';

// Singleton external provider
let externalProvider: ExternalBotProvider | null = null;

export class BotEngine {
  /**
   * Initialize external bot provider from environment
   */
  static initializeExternalProvider(): void {
    const apiUrl = process.env.EXTERNAL_BOT_API_URL;
    if (!apiUrl) {
      console.log('No external bot API configured, using built-in engine');
      return;
    }

    const config: ExternalBotConfig = {
      enabled: true,
      provider: (process.env.EXTERNAL_BOT_PROVIDER as 'katago' | 'leelazero' | 'custom') || 'katago',
      apiUrl,
      apiKey: process.env.EXTERNAL_BOT_API_KEY,
      timeout: parseInt(process.env.EXTERNAL_BOT_TIMEOUT || '10000', 10),
    };

    switch (config.provider) {
      case 'katago':
        externalProvider = new KataGoProvider(config);
        console.log(`External bot provider initialized: KataGo at ${apiUrl}`);
        break;
      default:
        console.warn(`Unknown external bot provider: ${config.provider}`);
    }
  }

  /**
   * Check if external provider is available
   */
  static hasExternalProvider(): boolean {
    return externalProvider !== null;
  }

  /**
   * Select a move using external API for hard difficulty
   */
  static async selectMoveAsync(
    board: BoardState,
    difficulty: BotDifficulty
  ): Promise<Position | null> {
    // For hard difficulty, try external API first
    if (difficulty === 'hard' && externalProvider) {
      try {
        const externalMove = await externalProvider.selectMove(board);
        if (externalMove) {
          // Validate the move is legal
          const result = GameEngine.makeMove(board, externalMove, board.currentTurn);
          if (result.valid) {
            console.log(`External bot (${externalProvider.name}) selected move: ${externalMove.x},${externalMove.y}`);
            return externalMove;
          }
          console.warn(`External bot returned invalid move, falling back to built-in engine`);
        }
      } catch (error) {
        console.error('External bot error, falling back to built-in engine:', error);
      }
    }

    // Fall back to built-in engine
    return this.selectMove(board, difficulty);
  }

  /**
   * Select a move for the bot based on difficulty (synchronous, built-in engine only)
   */
  static selectMove(
    board: BoardState,
    difficulty: BotDifficulty
  ): Position | null {
    const validMoves = this.getValidMoves(board);
    if (validMoves.length === 0) return null; // Pass

    switch (difficulty) {
      case 'easy':
        return this.selectEasyMove(board, validMoves);
      case 'medium':
        return this.selectMediumMove(board, validMoves);
      case 'hard':
        return this.selectHardMove(board, validMoves);
      default:
        return this.selectRandomMove(validMoves);
    }
  }

  /**
   * Get all valid moves for the current turn
   */
  private static getValidMoves(board: BoardState): Position[] {
    const validMoves: Position[] = [];
    const size = board.size;
    const color = board.currentTurn;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const pos = { x, y };
        const result = GameEngine.makeMove(board, pos, color);
        if (result.valid) {
          validMoves.push(pos);
        }
      }
    }
    return validMoves;
  }

  private static selectRandomMove(validMoves: Position[]): Position {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  /**
   * Easy Bot:
   * - 60% Random
   * - 30% Capture single stones
   * - 10% Save stones in atari
   */
  private static selectEasyMove(
    board: BoardState,
    validMoves: Position[]
  ): Position {
    const rand = Math.random();

    if (rand < 0.6) {
      return this.selectRandomMove(validMoves);
    }

    const color = board.currentTurn;
    
    // Try to capture
    if (rand < 0.9) {
      const captureMoves = this.findCapturingMoves(board, validMoves, color);
      if (captureMoves.length > 0) return this.selectRandomMove(captureMoves);
    }

    // Try to save
    const saveMoves = this.findSavingMoves(board, validMoves, color);
    if (saveMoves.length > 0) return this.selectRandomMove(saveMoves);

    return this.selectRandomMove(validMoves);
  }

  /**
   * Medium Bot:
   * - Priority: Save (100%) -> Capture (80%) -> Extend (50%) -> Random
   */
  private static selectMediumMove(
    board: BoardState,
    validMoves: Position[]
  ): Position {
    const color = board.currentTurn;

    // 1. Save stones in atari (always check)
    const saveMoves = this.findSavingMoves(board, validMoves, color);
    if (saveMoves.length > 0) return this.selectRandomMove(saveMoves);

    // 2. Capture (80% chance)
    if (Math.random() < 0.8) {
      const captureMoves = this.findCapturingMoves(board, validMoves, color);
      if (captureMoves.length > 0) {
        // Prefer capturing larger groups
        captureMoves.sort((a, b) => (b as any).score - (a as any).score);
        return captureMoves[0];
      }
    }

    // 3. Random valid move
    return this.selectRandomMove(validMoves);
  }

  /**
   * Hard Bot:
   * - Weighted scoring
   */
  private static selectHardMove(
    board: BoardState,
    validMoves: Position[]
  ): Position {
    const candidates: MoveCandidate[] = validMoves.map((pos) =>
      this.evaluateMove(board, pos)
    );

    // Add some randomness to top moves to avoid predictable play
    candidates.sort((a, b) => b.score - a.score);
    
    // Pick from top 3 moves
    const topCandidates = candidates.slice(0, 3);
    if (topCandidates.length === 0) return this.selectRandomMove(validMoves);

    const rand = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[rand].position;
  }

  /**
   * Evaluate a single move for Hard bot
   */
  private static evaluateMove(board: BoardState, pos: Position): MoveCandidate {
    const color = board.currentTurn;
    const result = GameEngine.makeMove(board, pos, color);
    
    if (!result.valid) {
        // Should not happen as we pass validMoves, but for type safety
        return { position: pos, score: -1000, type: 'random' };
    }

    let score = 0;
    const { capturedStones, newState } = result;

    // 1. Capture Value
    if (capturedStones.length > 0) {
      score += capturedStones.length * 10;
    }

    // 2. Save Value (check if we reduced atari count)
    // Heuristic: if I had groups in atari, and now I have fewer, that's good.
    const myAtariBefore = this.countGroupsInAtari(board, color);
    const myAtariAfter = this.countGroupsInAtari(newState, color);
    if (myAtariAfter < myAtariBefore) {
        score += (myAtariBefore - myAtariAfter) * 15;
    }

    // 3. Strategic Value (Corners > Sides > Center)
    const size = board.size;
    if (this.isCorner(pos, size)) score += 5;
    else if (this.isSide(pos, size)) score += 2;
    else score += 1;

    // 4. Liberties (freedom)
    // Check liberties of the placed stone's group
    const newGroup = GameEngine.findGroup(newState.stones, pos, size);
    const liberties = GameEngine.countLiberties(newState.stones, newGroup, size);
    score += liberties;

    // 5. Avoid self-atari (if liberties == 1 and no captures made, it's bad)
    if (liberties === 1 && capturedStones.length === 0) {
        score -= 20;
    }

    return {
      position: pos,
      score,
      type: capturedStones.length > 0 ? 'capture' : 'strategic',
    };
  }

  // --- Helpers ---

  private static findCapturingMoves(
    board: BoardState,
    validMoves: Position[],
    color: StoneColor
  ): Position[] {
    const captures: Position[] = [];
    for (const pos of validMoves) {
      const result = GameEngine.makeMove(board, pos, color);
      if (result.valid && result.capturedStones.length > 0) {
        // Append property for sorting in medium bot
        (pos as any).score = result.capturedStones.length; 
        captures.push(pos);
      }
    }
    return captures;
  }

  private static findSavingMoves(
    board: BoardState,
    validMoves: Position[],
    color: StoneColor
  ): Position[] {
    // A move is a saving move if it increases liberties of a group that is in atari
    const groupsInAtari = this.getGroupsInAtari(board, color);
    if (groupsInAtari.length === 0) return [];

    const savingMoves: Position[] = [];
    
    // Optimization: only check moves adjacent to atari groups? 
    // For now, check all valid moves to find which ones help.
    // Actually, only adjacent moves (liberties) help.
    
    // Collect all liberty positions of atari groups
    const distinctLiberties = new Set<string>();
    groupsInAtari.forEach(group => {
         // Find their liberties
         const liberties = this.getLibertiesOfGroup(board, group);
         liberties.forEach(lib => distinctLiberties.add(GameEngine.positionToKey(lib)));
    });

    for (const pos of validMoves) {
        // Check if this move is one of the liberties, or captures adjacent opponent to make space
        // For simplicity, let's simulate.
        // Valid move simulation:
        const result = GameEngine.makeMove(board, pos, color);
        if (result.valid) {
            // Check if atari count decreased
            const atariAfter = this.countGroupsInAtari(result.newState, color);
            if (atariAfter < groupsInAtari.length) {
                savingMoves.push(pos);
            }
        }
    }

    return savingMoves;
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

  private static countGroupsInAtari(board: BoardState, color: StoneColor): number {
      return this.getGroupsInAtari(board, color).length;
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

  private static isCorner(pos: Position, size: BoardSize): boolean {
    return (pos.x === 0 || pos.x === size - 1) && (pos.y === 0 || pos.y === size - 1);
  }

  private static isSide(pos: Position, size: BoardSize): boolean {
    return pos.x === 0 || pos.x === size - 1 || pos.y === 0 || pos.y === size - 1;
  }
}
