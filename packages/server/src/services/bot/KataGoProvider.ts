import type { BoardState, Position } from '@webgo/shared';
import type { ExternalBotProvider, ExternalBotConfig } from './ExternalBotProvider.js';
import { parseGTPCoordinate } from './ExternalBotProvider.js';

/**
 * KataGo API provider for strong AI moves
 *
 * Supports multiple KataGo API services:
 * - KataGo Analysis API (https://katagotraining.org/api/)
 * - Self-hosted KataGo with analysis server
 * - Other compatible APIs
 */
export class KataGoProvider implements ExternalBotProvider {
  name = 'KataGo';
  private apiUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: ExternalBotConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 10000;
  }

  async selectMove(board: BoardState): Promise<Position | null> {
    try {
      const requestBody = this.buildRequest(board);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`KataGo API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as KataGoAnalysisResponse;
      return this.parseResponse(data, board.size);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('KataGo API request timed out');
      } else {
        console.error('KataGo API error:', error);
      }
      return null;
    }
  }

  private buildRequest(board: BoardState): KataGoAnalysisRequest {
    // Build the board position as a 2D array
    const boardArray: number[][] = [];
    for (let y = 0; y < board.size; y++) {
      const row: number[] = [];
      for (let x = 0; x < board.size; x++) {
        const key = `${x},${y}`;
        const stone = board.stones.get(key);
        if (stone === 'black') {
          row.push(1);
        } else if (stone === 'white') {
          row.push(2);
        } else {
          row.push(0);
        }
      }
      boardArray.push(row);
    }

    // Build moves list from history if available
    const moves: [string, number[]][] = [];

    return {
      id: `webgo-${Date.now()}`,
      initialStones: this.getStonesFromBoard(board),
      moves,
      rules: 'chinese',
      komi: 7.5,
      boardXSize: board.size,
      boardYSize: board.size,
      analyzeTurns: [0],
      maxVisits: 100, // Adjust based on desired strength
      includePolicy: false,
      includeOwnership: false,
      priority: 0,
    };
  }

  private getStonesFromBoard(board: BoardState): [string, number[]][] {
    const stones: [string, number[]][] = [];

    for (const [key, color] of board.stones) {
      const [x, y] = key.split(',').map(Number);
      stones.push([color === 'black' ? 'B' : 'W', [x, y]]);
    }

    return stones;
  }

  private parseResponse(data: KataGoAnalysisResponse, boardSize: number): Position | null {
    // Handle different KataGo API response formats

    // Format 1: Direct move field
    if (data.move) {
      return parseGTPCoordinate(data.move, boardSize);
    }

    // Format 2: Analysis endpoint with moveInfos
    if (data.moveInfos && data.moveInfos.length > 0) {
      const bestMove = data.moveInfos[0];
      if (bestMove.move === 'pass') {
        return null;
      }
      // moveInfos use coordinate format like "D4"
      return parseGTPCoordinate(bestMove.move, boardSize);
    }

    // Format 3: Turninfo array (batch analysis)
    if (data.turnInfos && data.turnInfos.length > 0) {
      const turnInfo = data.turnInfos[0];
      if (turnInfo.moveInfos && turnInfo.moveInfos.length > 0) {
        const bestMove = turnInfo.moveInfos[0];
        if (bestMove.move === 'pass') {
          return null;
        }
        return parseGTPCoordinate(bestMove.move, boardSize);
      }
    }

    console.warn('KataGo: Unexpected response format', data);
    return null;
  }
}

// KataGo Analysis API types
interface KataGoAnalysisRequest {
  id: string;
  initialStones: [string, number[]][];
  moves: [string, number[]][];
  rules: string;
  komi: number;
  boardXSize: number;
  boardYSize: number;
  analyzeTurns: number[];
  maxVisits: number;
  includePolicy: boolean;
  includeOwnership: boolean;
  priority: number;
}

interface KataGoMoveInfo {
  move: string;
  visits: number;
  winrate: number;
  scoreLead: number;
  scoreStdev: number;
  order: number;
  pv?: string[];
}

interface KataGoTurnInfo {
  turnNumber: number;
  moveInfos: KataGoMoveInfo[];
}

interface KataGoAnalysisResponse {
  id?: string;
  move?: string;
  moveInfos?: KataGoMoveInfo[];
  turnInfos?: KataGoTurnInfo[];
  rootInfo?: {
    winrate: number;
    scoreLead: number;
    visits: number;
  };
}
