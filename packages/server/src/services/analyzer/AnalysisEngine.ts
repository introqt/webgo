
import {
  Move,
  StoneColor,
  BoardSize,
} from '@webgo/shared';
import { GameEngine } from '../game/GameEngine.js';
import { GameAnalysisResult } from '../../models/GameAnalysis.js';
import { LiveAnalysisEngine } from './LiveAnalysisEngine.js';

export class AnalysisEngine {
  static analyzeGame(
    gameId: string,
    playerColor: StoneColor,
    playerId: string,
    moves: Move[],
    boardSize: BoardSize
  ): GameAnalysisResult {
    let board = GameEngine.createBoardState(boardSize);
    
    let totalMoves = 0;
    let stonesCaptured = 0;
    let stonesLost = 0;
    let blunders = 0;
    let missedCaptures = 0;
    let badAtariEscapes = 0;
    let totalMoveTime = 0;
    
    // Track quality of opening (moves 1-20)
    let openingScores: number[] = [];
    
    // Sort moves by move number
    const sortedMoves = [...moves].sort((a, b) => a.moveNumber - b.moveNumber);

    for (let i = 0; i < sortedMoves.length; i++) {
        const move = sortedMoves[i];
        
        if (move.isPass) {
             board = GameEngine.pass(board);
             continue;
        }

        if (!move.createdAt) continue;
        const currentMoveTime = new Date(move.createdAt).getTime();

        if (move.color === playerColor) {
             // Find previous move (i-1)
             // simplified: time since previous move regardless of who played?
             // Usually move time is (my move time) - (opponent move time)
             if (i > 0) {
                 const prevDate = sortedMoves[i-1].createdAt;
                 if (prevDate) {
                     const prevTime = new Date(prevDate).getTime();
                     const diff = currentMoveTime - prevTime;
                     // Filter unrealistic times (e.g. game resume)
                     if (diff < 300000) { // < 5 mins
                         totalMoveTime += diff;
                     }
                 }
             }
             totalMoves++;
        }

        // Apply move to get next state
        // Deep copy needed for 'previousState' passed to LiveAnalysis
        const prevBoardCopy = GameEngine.deserializeBoardState(GameEngine.serializeBoardState(board));

        const result = GameEngine.makeMove(board, move.position!, move.color);
        if (!result.valid) {
            console.error('Invalid move in analysis replay:', move);
            // Try to recover? Skip?
            continue;
        }
        board = result.newState;

        // Analyze if it was player's move
        if (move.color === playerColor) {
            const analysis = LiveAnalysisEngine.evaluateMove(
                prevBoardCopy,
                board,
                move,
                playerColor
            );

            if (analysis.quality === 'blunder') blunders++;
            if (analysis.quality === 'questionable' && analysis.details?.missedCapture) missedCaptures++;
            if (analysis.details?.capturedStones) stonesCaptured += analysis.details.capturedStones;
            
            if (move.moveNumber <= 20) {
                openingScores.push(analysis.score);
            }
        } else {
            // Opponent move: did they capture our stones?
            if (result.capturedStones.length > 0) {
                stonesLost += result.capturedStones.length;
            }
        }
    }

    // Opening Quality
    const avgOpeningScore = openingScores.length > 0 
        ? openingScores.reduce((a,b) => a+b, 0) / openingScores.length 
        : 50;
    
    let openingQualityString = 'neutral';
    if (avgOpeningScore >= 80) openingQualityString = 'excellent';
    else if (avgOpeningScore >= 70) openingQualityString = 'good';
    else if (avgOpeningScore <= 40) openingQualityString = 'poor';

    return {
        gameId,
        playerId,
        totalMoves,
        averageMoveTimeMs: totalMoves > 0 ? Math.round(totalMoveTime / totalMoves) : 0,
        stonesCaptured,
        stonesLost,
        captureOpportunitiesMissed: 0, 
        blunders,
        missedCaptures,
        badAtariEscapes,
        endgameEfficiency: 50,
        openingQuality: openingQualityString
    };
  }
}
