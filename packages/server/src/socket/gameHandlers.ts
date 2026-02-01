import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Position,
} from '@webgo/shared';
import { GameService } from '../services/game/index.js';
import { GameRepository } from '../models/Game.js';
import { UserRepository } from '../models/User.js';
import { ScoreAcceptanceRepository } from '../models/ScoreAcceptance.js';
import { RatingChangeRepository } from '../models/RatingChange.js';
import { AuthService, TokenPayload } from '../services/auth/index.js';
import { GameEngine } from '../services/game/GameEngine.js';

const gameRepo = new GameRepository();
const userRepo = new UserRepository();
const scoreRepo = new ScoreAcceptanceRepository();
const ratingRepo = new RatingChangeRepository();
const gameService = new GameService(gameRepo);
const authService = new AuthService(userRepo);

// Socket with user data
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  data: {
    user?: TokenPayload;
  };
}

/**
 * Check if user is a participant in the game
 */
async function isGameParticipant(gameId: string, userId: string): Promise<boolean> {
  const game = await gameRepo.findById(gameId);
  if (!game) return false;
  return game.blackPlayerId === userId || game.whitePlayerId === userId;
}

export function setupGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = authService.verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) return;

    console.log(`User ${user.userId} connected`);

    // Join game room
    socket.on('join_game', async ({ gameId }) => {
      try {
        const game = await gameService.getGame(gameId);
        if (!game) {
          socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant =
          game.blackPlayerId === user.userId || game.whitePlayerId === user.userId;

        socket.join(gameId);

        // Determine user's color
        let yourColor: 'black' | 'white' | null = null;
        if (game.blackPlayerId === user.userId) yourColor = 'black';
        if (game.whitePlayerId === user.userId) yourColor = 'white';

        socket.emit('game_joined', {
          game: {
            ...game,
            gameState: GameEngine.serializeGameState(game.gameState),
          },
          yourColor,
        });

        // Notify others if player joined
        if (isParticipant) {
          const userInfo = await userRepo.getPublicInfo(user.userId);
          if (userInfo && yourColor) {
            socket.to(gameId).emit('player_joined', {
              player: userInfo,
              color: yourColor,
            });
          }
        }
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join game' });
      }
    });

    // Leave game room
    socket.on('leave_game', ({ gameId }) => {
      socket.leave(gameId);
    });

    // Make a move
    socket.on('make_move', async ({ gameId, x, y }) => {
      try {
        // Authorization: Only participants can make moves
        if (!await isGameParticipant(gameId, user.userId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only game participants can make moves' });
          return;
        }

        const result = await gameService.makeMove(gameId, user.userId, { x, y });

        if (!result.success) {
          socket.emit('invalid_move', {
            reason: result.error as 'occupied' | 'ko' | 'suicide' | 'not_your_turn',
            message: result.error || 'Invalid move',
          });
          return;
        }

        // Get the game to find the color
        const game = await gameService.getGame(gameId);
        if (!game) return;

        const moveColor = game.blackPlayerId === user.userId ? 'black' : 'white';

        // Broadcast to all in the room
        io.to(gameId).emit('move_made', {
          move: {
            color: moveColor,
            position: { x, y },
            moveNumber: game.gameState.moveHistory.length,
          },
          capturedStones: result.capturedStones || [],
          gameState: result.gameState!,
        });
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('error', { code: 'MOVE_ERROR', message: 'Failed to make move' });
      }
    });

    // Pass turn
    socket.on('pass_turn', async ({ gameId }) => {
      try {
        // Authorization: Only participants can pass
        if (!await isGameParticipant(gameId, user.userId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only game participants can pass' });
          return;
        }

        const result = await gameService.passTurn(gameId, user.userId);

        if (!result.success) {
          socket.emit('invalid_move', {
            reason: 'not_your_turn',
            message: result.error || 'Cannot pass',
          });
          return;
        }

        const game = await gameService.getGame(gameId);
        if (!game) return;

        const passColor = game.blackPlayerId === user.userId ? 'black' : 'white';

        io.to(gameId).emit('turn_passed', {
          color: passColor,
          consecutivePasses: game.gameState.board.consecutivePasses,
          gameState: result.gameState!,
        });

        // Check if scoring phase started
        if (game.status === 'scoring') {
          await scoreRepo.clearAcceptances(gameId);
          io.to(gameId).emit('scoring_started', {
            gameState: result.gameState!,
          });
        }
      } catch (error) {
        console.error('Error passing turn:', error);
        socket.emit('error', { code: 'PASS_ERROR', message: 'Failed to pass' });
      }
    });

    // Resign
    socket.on('resign', async ({ gameId }) => {
      try {
        // Authorization: Only participants can resign
        if (!await isGameParticipant(gameId, user.userId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only game participants can resign' });
          return;
        }

        const result = await gameService.resign(gameId, user.userId);

        if (!result.success) {
          socket.emit('error', { code: 'RESIGN_ERROR', message: result.error || 'Cannot resign' });
          return;
        }

        // Fetch player info and rating changes
        const game = await gameService.getGame(gameId);
        if (!game) return;

        const blackPlayer = game.blackPlayerId ? await userRepo.getPublicInfo(game.blackPlayerId) : null;
        const whitePlayer = game.whitePlayerId ? await userRepo.getPublicInfo(game.whitePlayerId) : null;
        const ratingChanges = await ratingRepo.findByGameId(gameId);

        io.to(gameId).emit('game_ended', {
          winner: result.gameResult!.winner,
          reason: 'resignation',
          finalScore: result.gameResult!.finalScore,
          blackPlayer,
          whitePlayer,
          ratingChanges: {
            black: ratingChanges.find(r => r.userId === game.blackPlayerId)
              ? {
                  change: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingChange,
                  newRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingAfter,
                  oldRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingBefore,
                }
              : null,
            white: ratingChanges.find(r => r.userId === game.whitePlayerId)
              ? {
                  change: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingChange,
                  newRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingAfter,
                  oldRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingBefore,
                }
              : null,
          },
        });

        // Clean up
        await scoreRepo.clearAcceptances(gameId);
      } catch (error) {
        console.error('Error resigning:', error);
        socket.emit('error', { code: 'RESIGN_ERROR', message: 'Failed to resign' });
      }
    });

    // Mark dead stones during scoring
    socket.on('mark_dead_stones', async ({ gameId, positions }) => {
      try {
        // Authorization: Only participants can mark dead stones
        if (!await isGameParticipant(gameId, user.userId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only game participants can mark dead stones' });
          return;
        }

        const result = await gameService.markDeadStones(gameId, user.userId, positions);

        if (!result.success) {
          socket.emit('error', { code: 'MARK_ERROR', message: result.error || 'Cannot mark stones' });
          return;
        }

        // Reset acceptances when stones are marked
        await scoreRepo.clearAcceptances(gameId);

        io.to(gameId).emit('dead_stones_marked', {
          positions,
          markedBy: user.userId,
        });

        // Also send updated game state
        io.to(gameId).emit('game_state', {
          gameState: result.gameState!,
          status: 'scoring',
        });
      } catch (error) {
        console.error('Error marking dead stones:', error);
        socket.emit('error', { code: 'MARK_ERROR', message: 'Failed to mark stones' });
      }
    });

    // Accept score
    socket.on('accept_score', async ({ gameId }) => {
      try {
        const game = await gameService.getGame(gameId);
        if (!game || game.status !== 'scoring') {
          socket.emit('error', { code: 'ACCEPT_ERROR', message: 'Game not in scoring phase' });
          return;
        }

        // Authorization: Only participants can accept score
        if (!await isGameParticipant(gameId, user.userId)) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only game participants can accept score' });
          return;
        }

        // Track acceptance in database
        await scoreRepo.addAcceptance(gameId, user.userId);

        // Check if both players accepted
        const bothAccepted = await scoreRepo.bothPlayersAccepted(
          gameId,
          game.blackPlayerId || '',
          game.whitePlayerId || ''
        );

        // Notify others
        io.to(gameId).emit('score_accepted', {
          acceptedBy: user.userId,
          bothAccepted,
        });

        if (bothAccepted) {
          const result = await gameService.acceptScore(gameId, user.userId);

          if (result.success && result.gameResult) {
            // Fetch player info and rating changes
            const blackPlayer = game.blackPlayerId ? await userRepo.getPublicInfo(game.blackPlayerId) : null;
            const whitePlayer = game.whitePlayerId ? await userRepo.getPublicInfo(game.whitePlayerId) : null;
            const ratingChanges = await ratingRepo.findByGameId(gameId);

            io.to(gameId).emit('game_ended', {
              winner: result.gameResult.winner,
              reason: 'score',
              finalScore: result.gameResult.finalScore,
              blackPlayer,
              whitePlayer,
              ratingChanges: {
                black: ratingChanges.find(r => r.userId === game.blackPlayerId)
                  ? {
                      change: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingChange,
                      newRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingAfter,
                      oldRating: ratingChanges.find(r => r.userId === game.blackPlayerId)!.ratingBefore,
                    }
                  : null,
                white: ratingChanges.find(r => r.userId === game.whitePlayerId)
                  ? {
                      change: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingChange,
                      newRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingAfter,
                      oldRating: ratingChanges.find(r => r.userId === game.whitePlayerId)!.ratingBefore,
                    }
                  : null,
              },
            });

            // Clean up
            await scoreRepo.clearAcceptances(gameId);
          }
        }
      } catch (error) {
        console.error('Error accepting score:', error);
        socket.emit('error', { code: 'ACCEPT_ERROR', message: 'Failed to accept score' });
      }
    });

    // Reject score (reset to scoring phase)
    socket.on('reject_score', async ({ gameId }) => {
      // Just clear acceptances, allowing re-marking of dead stones
      await scoreRepo.clearAcceptances(gameId);

      io.to(gameId).emit('error', {
        code: 'SCORE_REJECTED',
        message: 'Score rejected, please re-mark dead stones',
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${user.userId} disconnected`);
    });
  });
}
