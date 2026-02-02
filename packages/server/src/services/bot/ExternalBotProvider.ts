import type { BoardState, Position } from '@webgo/shared';

/**
 * Interface for external bot providers (e.g., KataGo, Leela Zero)
 */
export interface ExternalBotProvider {
  name: string;
  selectMove(board: BoardState): Promise<Position | null>;
}

/**
 * Configuration for external bot providers
 */
export interface ExternalBotConfig {
  enabled: boolean;
  provider: 'katago' | 'leelazero' | 'custom';
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Convert board state to SGF format for API communication
 */
export function boardToSGF(board: BoardState): string {
  const size = board.size;
  let sgf = `(;GM[1]FF[4]SZ[${size}]`;

  // Add current stones
  const blackStones: string[] = [];
  const whiteStones: string[] = [];

  for (const [key, color] of board.stones) {
    const [x, y] = key.split(',').map(Number);
    const sgfCoord = String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
    if (color === 'black') {
      blackStones.push(sgfCoord);
    } else {
      whiteStones.push(sgfCoord);
    }
  }

  if (blackStones.length > 0) {
    sgf += `AB${blackStones.map(s => `[${s}]`).join('')}`;
  }
  if (whiteStones.length > 0) {
    sgf += `AW${whiteStones.map(s => `[${s}]`).join('')}`;
  }

  sgf += ')';
  return sgf;
}

/**
 * Convert board state to GTP-style moves list
 */
export function boardToMovesList(board: BoardState): string[] {
  // For APIs that prefer a list of moves rather than SGF
  const moves: string[] = [];

  for (const [key, color] of board.stones) {
    const [x, y] = key.split(',').map(Number);
    const col = String.fromCharCode(65 + (x >= 8 ? x + 1 : x)); // Skip 'I' in GTP
    const row = board.size - y;
    moves.push(`${color === 'black' ? 'B' : 'W'} ${col}${row}`);
  }

  return moves;
}

/**
 * Parse GTP coordinate to Position
 */
export function parseGTPCoordinate(coord: string, boardSize: number): Position | null {
  if (!coord || coord.toLowerCase() === 'pass' || coord.toLowerCase() === 'resign') {
    return null;
  }

  // GTP uses A-T (skipping I) for columns, 1-19 for rows
  const col = coord.charAt(0).toUpperCase();
  const row = parseInt(coord.slice(1), 10);

  if (isNaN(row)) return null;

  // Convert column letter to x coordinate (skip 'I')
  let x = col.charCodeAt(0) - 65;
  if (x > 7) x--; // Adjust for skipped 'I'

  // Convert row to y coordinate (GTP rows are 1-indexed from bottom)
  const y = boardSize - row;

  if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) {
    return null;
  }

  return { x, y };
}
