import type {
  BoardSize,
  BoardState,
  GameState,
  Position,
  StoneColor,
  Move,
  SerializedBoardState,
  SerializedGameState,
  RuleSet,
} from '@webgo/shared';

export type MoveResult =
  | { valid: true; capturedStones: Position[]; newState: BoardState }
  | { valid: false; reason: 'occupied' | 'ko' | 'suicide' | 'out_of_bounds' };

export class GameEngine {
  /**
   * Create a new empty board state
   */
  static createBoardState(size: BoardSize): BoardState {
    return {
      size,
      stones: new Map(),
      captures: { black: 0, white: 0 },
      currentTurn: 'black',
      previousBoardState: null,
      lastMove: null,
      consecutivePasses: 0,
    };
  }

  /**
   * Create a new game state
   */
  static createGameState(size: BoardSize): GameState {
    return {
      board: this.createBoardState(size),
      moveHistory: [],
      deadStones: [],
      territory: { black: [], white: [] },
    };
  }

  /**
   * Convert position to string key for Map
   */
  static positionToKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * Convert string key back to Position
   */
  static keyToPosition(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  /**
   * Check if position is within board bounds
   */
  static isValidPosition(pos: Position, size: BoardSize): boolean {
    return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
  }

  /**
   * Get adjacent positions (up, down, left, right)
   */
  static getAdjacentPositions(pos: Position, size: BoardSize): Position[] {
    const adjacent: Position[] = [
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
    ];
    return adjacent.filter((p) => this.isValidPosition(p, size));
  }

  /**
   * Find all stones in a group (connected stones of same color)
   */
  static findGroup(
    stones: Map<string, StoneColor>,
    startPos: Position,
    size: BoardSize
  ): Position[] {
    const startKey = this.positionToKey(startPos);
    const color = stones.get(startKey);
    if (!color) return [];

    const group: Position[] = [];
    const visited = new Set<string>();
    const queue: Position[] = [startPos];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = this.positionToKey(pos);

      if (visited.has(key)) continue;
      if (stones.get(key) !== color) continue;

      visited.add(key);
      group.push(pos);

      const adjacent = this.getAdjacentPositions(pos, size);
      for (const adj of adjacent) {
        const adjKey = this.positionToKey(adj);
        if (!visited.has(adjKey) && stones.get(adjKey) === color) {
          queue.push(adj);
        }
      }
    }

    return group;
  }

  /**
   * Count liberties for a group
   */
  static countLiberties(
    stones: Map<string, StoneColor>,
    group: Position[],
    size: BoardSize
  ): number {
    const liberties = new Set<string>();

    for (const pos of group) {
      const adjacent = this.getAdjacentPositions(pos, size);
      for (const adj of adjacent) {
        const key = this.positionToKey(adj);
        if (!stones.has(key)) {
          liberties.add(key);
        }
      }
    }

    return liberties.size;
  }

  /**
   * Find groups with zero liberties (to be captured)
   */
  static findCapturedGroups(
    stones: Map<string, StoneColor>,
    color: StoneColor,
    size: BoardSize
  ): Position[][] {
    const visited = new Set<string>();
    const capturedGroups: Position[][] = [];

    for (const [key, stoneColor] of stones) {
      if (stoneColor !== color || visited.has(key)) continue;

      const pos = this.keyToPosition(key);
      const group = this.findGroup(stones, pos, size);
      group.forEach((p) => visited.add(this.positionToKey(p)));

      const liberties = this.countLiberties(stones, group, size);
      if (liberties === 0) {
        capturedGroups.push(group);
      }
    }

    return capturedGroups;
  }

  /**
   * Serialize board state to string for ko detection
   */
  static serializeBoardForKo(stones: Map<string, StoneColor>): string {
    const entries = Array.from(stones.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    return JSON.stringify(entries);
  }

  /**
   * Validate and execute a move
   */
  static makeMove(board: BoardState, pos: Position, color: StoneColor): MoveResult {
    const { size, stones } = board;

    // Check bounds
    if (!this.isValidPosition(pos, size)) {
      return { valid: false, reason: 'out_of_bounds' };
    }

    // Check if position is occupied
    const key = this.positionToKey(pos);
    if (stones.has(key)) {
      return { valid: false, reason: 'occupied' };
    }

    // Create a copy of stones to test the move
    const newStones = new Map(stones);
    newStones.set(key, color);

    // Check for captures (opponent stones first)
    const opponentColor: StoneColor = color === 'black' ? 'white' : 'black';
    const capturedGroups = this.findCapturedGroups(newStones, opponentColor, size);
    const capturedStones: Position[] = [];

    for (const group of capturedGroups) {
      for (const p of group) {
        capturedStones.push(p);
        newStones.delete(this.positionToKey(p));
      }
    }

    // Check for suicide (placing stone with no liberties and no captures)
    if (capturedStones.length === 0) {
      const ownGroup = this.findGroup(newStones, pos, size);
      const ownLiberties = this.countLiberties(newStones, ownGroup, size);
      if (ownLiberties === 0) {
        return { valid: false, reason: 'suicide' };
      }
    }

    // Check for ko (board position repeats)
    const newBoardString = this.serializeBoardForKo(newStones);
    if (board.previousBoardState === newBoardString) {
      return { valid: false, reason: 'ko' };
    }

    // Move is valid, create new board state
    const currentBoardString = this.serializeBoardForKo(stones);
    const newCaptures = { ...board.captures };
    if (color === 'black') {
      newCaptures.black += capturedStones.length;
    } else {
      newCaptures.white += capturedStones.length;
    }

    const newState: BoardState = {
      size,
      stones: newStones,
      captures: newCaptures,
      currentTurn: opponentColor,
      previousBoardState: currentBoardString,
      lastMove: pos,
      consecutivePasses: 0,
    };

    return { valid: true, capturedStones, newState };
  }

  /**
   * Execute a pass move
   */
  static pass(board: BoardState): BoardState {
    const opponentColor: StoneColor = board.currentTurn === 'black' ? 'white' : 'black';
    return {
      ...board,
      currentTurn: opponentColor,
      lastMove: null,
      consecutivePasses: board.consecutivePasses + 1,
    };
  }

  /**
   * Check if game should end (two consecutive passes)
   */
  static shouldEndGame(board: BoardState): boolean {
    return board.consecutivePasses >= 2;
  }

  /**
   * Calculate territory using flood-fill
   * Returns territory for empty regions surrounded by one color
   */
  static calculateTerritory(
    stones: Map<string, StoneColor>,
    size: BoardSize,
    deadStones: Position[] = []
  ): { black: Position[]; white: Position[] } {
    // Create a modified stones map without dead stones
    const activeStones = new Map(stones);
    for (const pos of deadStones) {
      activeStones.delete(this.positionToKey(pos));
    }

    const territory = { black: [] as Position[], white: [] as Position[] };
    const visited = new Set<string>();

    // Flood-fill from each empty position
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const pos = { x, y };
        const key = this.positionToKey(pos);

        if (visited.has(key) || activeStones.has(key)) continue;

        // Flood-fill to find connected empty region
        const region: Position[] = [];
        const colors = new Set<StoneColor>();
        const queue: Position[] = [pos];
        const regionVisited = new Set<string>();

        while (queue.length > 0) {
          const current = queue.shift()!;
          const currentKey = this.positionToKey(current);

          if (regionVisited.has(currentKey)) continue;
          regionVisited.add(currentKey);

          const stoneColor = activeStones.get(currentKey);
          if (stoneColor) {
            colors.add(stoneColor);
            continue;
          }

          region.push(current);
          visited.add(currentKey);

          const adjacent = this.getAdjacentPositions(current, size);
          for (const adj of adjacent) {
            const adjKey = this.positionToKey(adj);
            if (!regionVisited.has(adjKey)) {
              queue.push(adj);
            }
          }
        }

        // Assign territory if surrounded by one color only
        if (colors.size === 1) {
          const color = Array.from(colors)[0];
          territory[color].push(...region);
        }
      }
    }

    return territory;
  }

  /**
   * Calculate final score (Chinese rules)
   * Score = territory + own stones on board + captured opponent stones (as komi adjustment)
   */
  static calculateScore(
    stones: Map<string, StoneColor>,
    size: BoardSize,
    captures: { black: number; white: number },
    deadStones: Position[],
    komi: number,
    ruleSet: RuleSet
  ): { black: number; white: number } {
    const territory = this.calculateTerritory(stones, size, deadStones);

    // Count dead stones by color
    const deadByColor = { black: 0, white: 0 };
    for (const pos of deadStones) {
      const color = stones.get(this.positionToKey(pos));
      if (color) {
        deadByColor[color]++;
      }
    }

    // Count live stones on board
    const liveStones = { black: 0, white: 0 };
    for (const [key, color] of stones) {
      const pos = this.keyToPosition(key);
      const isDead = deadStones.some((d) => d.x === pos.x && d.y === pos.y);
      if (!isDead) {
        liveStones[color]++;
      }
    }

    if (ruleSet === 'chinese') {
      // Chinese rules: territory + stones on board
      return {
        black: territory.black.length + liveStones.black,
        white: territory.white.length + liveStones.white + komi,
      };
    } else {
      // Japanese rules: territory + prisoners
      // Prisoners = stones captured + dead stones
      return {
        black: territory.black.length + captures.black + deadByColor.white,
        white: territory.white.length + captures.white + deadByColor.black + komi,
      };
    }
  }

  /**
   * Serialize board state for storage/transmission
   */
  static serializeBoardState(board: BoardState): SerializedBoardState {
    return {
      size: board.size,
      stones: Object.fromEntries(board.stones),
      captures: board.captures,
      currentTurn: board.currentTurn,
      previousBoardState: board.previousBoardState,
      lastMove: board.lastMove,
      consecutivePasses: board.consecutivePasses,
    };
  }

  /**
   * Deserialize board state from storage
   */
  static deserializeBoardState(data: SerializedBoardState): BoardState {
    return {
      size: data.size,
      stones: new Map(Object.entries(data.stones) as [string, StoneColor][]),
      captures: data.captures,
      currentTurn: data.currentTurn,
      previousBoardState: data.previousBoardState,
      lastMove: data.lastMove,
      consecutivePasses: data.consecutivePasses,
    };
  }

  /**
   * Serialize game state
   */
  static serializeGameState(state: GameState): SerializedGameState {
    return {
      board: this.serializeBoardState(state.board),
      moveHistory: state.moveHistory,
      deadStones: state.deadStones,
      territory: state.territory,
    };
  }

  /**
   * Deserialize game state
   */
  static deserializeGameState(data: SerializedGameState): GameState {
    return {
      board: this.deserializeBoardState(data.board),
      moveHistory: data.moveHistory,
      deadStones: data.deadStones,
      territory: data.territory,
    };
  }

  /**
   * Get the opposite color
   */
  static oppositeColor(color: StoneColor): StoneColor {
    return color === 'black' ? 'white' : 'black';
  }

  /**
   * Check if a position is in a list of positions
   */
  static positionInList(pos: Position, list: Position[]): boolean {
    return list.some((p) => p.x === pos.x && p.y === pos.y);
  }

  /**
   * Apply handicap stones to the board
   */
  static applyHandicap(board: BoardState, handicap: number): BoardState {
    if (handicap < 2 || handicap > 9) return board;

    const newStones = new Map(board.stones);
    const handicapPositions = this.getHandicapPositions(board.size, handicap);

    for (const pos of handicapPositions) {
      newStones.set(this.positionToKey(pos), 'black');
    }

    return {
      ...board,
      stones: newStones,
      currentTurn: 'white', // White plays first after handicap
    };
  }

  /**
   * Get standard handicap positions for a board size
   */
  static getHandicapPositions(size: BoardSize, handicap: number): Position[] {
    const positions: Position[] = [];

    // Standard star point positions
    let points: [number, number][];
    if (size === 9) {
      points = [
        [2, 6], [6, 2], [6, 6], [2, 2], // corners
        [4, 4], // center
        [4, 2], [4, 6], [2, 4], [6, 4], // edges
      ];
    } else if (size === 13) {
      points = [
        [3, 9], [9, 3], [9, 9], [3, 3], // corners
        [6, 6], // center
        [6, 3], [6, 9], [3, 6], [9, 6], // edges
      ];
    } else {
      points = [
        [3, 15], [15, 3], [15, 15], [3, 3], // corners
        [9, 9], // center
        [9, 3], [9, 15], [3, 9], [15, 9], // edges
      ];
    }

    for (let i = 0; i < Math.min(handicap, points.length); i++) {
      positions.push({ x: points[i][0], y: points[i][1] });
    }

    return positions;
  }
}
