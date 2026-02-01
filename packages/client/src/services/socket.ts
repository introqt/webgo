import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameJoinedEvent,
  PlayerJoinedEvent,
  MoveMadeEvent,
  TurnPassedEvent,
  GameEndedEvent,
  ScoringStartedEvent,
  DeadStonesMarkedEvent,
  ScoreAcceptedEvent,
  InvalidMoveEvent,
  SocketError,
  Position,
} from '@webgo/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: TypedSocket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token available for socket connection');
      return;
    }

    this.socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGame(gameId: string) {
    this.socket?.emit('join_game', { gameId });
  }

  leaveGame(gameId: string) {
    this.socket?.emit('leave_game', { gameId });
  }

  makeMove(gameId: string, x: number, y: number) {
    this.socket?.emit('make_move', { gameId, x, y });
  }

  passTurn(gameId: string) {
    this.socket?.emit('pass_turn', { gameId });
  }

  resign(gameId: string) {
    this.socket?.emit('resign', { gameId });
  }

  markDeadStones(gameId: string, positions: Position[]) {
    this.socket?.emit('mark_dead_stones', { gameId, positions });
  }

  acceptScore(gameId: string) {
    this.socket?.emit('accept_score', { gameId });
  }

  rejectScore(gameId: string) {
    this.socket?.emit('reject_score', { gameId });
  }

  // Event listeners
  onGameJoined(callback: (data: GameJoinedEvent) => void) {
    this.socket?.on('game_joined', callback);
  }

  onPlayerJoined(callback: (data: PlayerJoinedEvent) => void) {
    this.socket?.on('player_joined', callback);
  }

  onMoveMade(callback: (data: MoveMadeEvent) => void) {
    this.socket?.on('move_made', callback);
  }

  onTurnPassed(callback: (data: TurnPassedEvent) => void) {
    this.socket?.on('turn_passed', callback);
  }

  onGameEnded(callback: (data: GameEndedEvent) => void) {
    this.socket?.on('game_ended', callback);
  }

  onScoringStarted(callback: (data: ScoringStartedEvent) => void) {
    this.socket?.on('scoring_started', callback);
  }

  onDeadStonesMarked(callback: (data: DeadStonesMarkedEvent) => void) {
    this.socket?.on('dead_stones_marked', callback);
  }

  onScoreAccepted(callback: (data: ScoreAcceptedEvent) => void) {
    this.socket?.on('score_accepted', callback);
  }

  onInvalidMove(callback: (data: InvalidMoveEvent) => void) {
    this.socket?.on('invalid_move', callback);
  }

  onError(callback: (data: SocketError) => void) {
    this.socket?.on('error', callback);
  }

  offAll() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
