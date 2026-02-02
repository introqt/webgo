
import { describe, it, expect } from 'vitest';
import { BotEngine } from '../src/services/bot/BotEngine.js';
import { GameEngine } from '../src/services/game/GameEngine.js';
import type { BoardState } from '@webgo/shared';

describe('BotEngine', () => {
  describe('selectMove', () => {
    it('returns a valid move for Easy bot', () => {
      const board = GameEngine.createBoardState(9);
      const move = BotEngine.selectMove(board, 'easy');
      expect(move).toBeDefined();
      if (move) {
        expect(GameEngine.isValidPosition(move, 9)).toBe(true);
      }
    });

    it('Medium bot saves stone in atari', () => {
      // Setup: Black stone at 0,0. White at 0,1. 
      // Liberties of 0,0: only 1,0. (Original corner liberties: 0,1 and 1,0)
      const board = GameEngine.createBoardState(9);
      board.currentTurn = 'black';
      
      board.stones.set('0,0', 'black');
      board.stones.set('0,1', 'white');
      
      // Black is in atari (1 liberty at 1,0)
      const group = GameEngine.findGroup(board.stones, { x: 0, y: 0 }, 9);
      expect(GameEngine.countLiberties(board.stones, group, 9)).toBe(1);

      // Medium bot should prioritize saving
      const move = BotEngine.selectMove(board, 'medium');
      expect(move).toEqual({ x: 1, y: 0 });
    });

    it('Medium bot captures opponent stone', () => {
       // Setup: White stone at 0,0. Black at 0,1.
       // White is in atari, liberty at 1,0.
       // Black to move, can capture at 1,0.
       const board = GameEngine.createBoardState(9);
       board.currentTurn = 'black';
       board.stones.set('0,0', 'white');
       board.stones.set('0,1', 'black');
       
       const move = BotEngine.selectMove(board, 'medium');
       expect(move).toEqual({ x: 1, y: 0 });
    });
    
    it('Hard bot prefers capturing over random', () => {
       const board = GameEngine.createBoardState(9);
       board.currentTurn = 'black';
       board.stones.set('0,0', 'white');
       board.stones.set('0,1', 'black');
       
       const move = BotEngine.selectMove(board, 'hard');
       expect(move).toEqual({ x: 1, y: 0 });
    });

    it('returns null if no valid moves', () => {
        // Full board
        const board = GameEngine.createBoardState(9);
        // Fill board artificially
        for(let x=0; x<9; x++) {
            for(let y=0; y<9; y++) {
                board.stones.set(`${x},${y}`, 'black');
            }
        }
        const move = BotEngine.selectMove(board, 'easy');
        expect(move).toBeNull();
    });
  });
});
