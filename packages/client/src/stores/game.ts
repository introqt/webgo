import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SerializedGame,
  SerializedGameState,
  StoneColor,
  Position,
  UserPublic,
} from '@webgo/shared';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';

interface CreateGameResponse {
  game: SerializedGame;
  invitationCode: string;
  invitationUrl: string;
}

interface LoadGameResponse extends SerializedGame {
  blackPlayer: UserPublic | null;
  whitePlayer: UserPublic | null;
}

interface JoinGameResponse {
  game: SerializedGame & {
    blackPlayer: UserPublic | null;
    whitePlayer: UserPublic | null;
  };
  color: StoneColor;
}

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<SerializedGame | null>(null);
  const gameState = ref<SerializedGameState | null>(null);
  const myColor = ref<StoneColor | null>(null);
  const blackPlayer = ref<UserPublic | null>(null);
  const whitePlayer = ref<UserPublic | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);

  const isMyTurn = computed(() => {
    if (!gameState.value || !myColor.value) return false;
    return gameState.value.board.currentTurn === myColor.value;
  });

  const currentTurn = computed(() => gameState.value?.board.currentTurn || 'black');

  const status = computed(() => currentGame.value?.status || 'waiting');

  const stones = computed(() => {
    if (!gameState.value) return {};
    return gameState.value.board.stones;
  });

  const captures = computed(() => {
    if (!gameState.value) return { black: 0, white: 0 };
    return gameState.value.board.captures;
  });

  const lastMove = computed(() => gameState.value?.board.lastMove || null);

  async function createGame(boardSize: 9 | 13 | 19, color?: StoneColor) {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<CreateGameResponse>('/games', { boardSize, color });
      currentGame.value = response.data.game;
      gameState.value = response.data.game.gameState;
      myColor.value = response.data.game.blackPlayerId ? 'black' : 'white';
      return response.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create game';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadGame(gameId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get<LoadGameResponse>(`/games/${gameId}`);
      currentGame.value = response.data;
      gameState.value = response.data.gameState;
      blackPlayer.value = response.data.blackPlayer;
      whitePlayer.value = response.data.whitePlayer;
      return response.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load game';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function joinGame(invitationCode: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<JoinGameResponse>(`/games/join/${invitationCode}`);
      currentGame.value = response.data.game;
      gameState.value = response.data.game.gameState;
      myColor.value = response.data.color;
      blackPlayer.value = response.data.game.blackPlayer;
      whitePlayer.value = response.data.game.whitePlayer;
      return response.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to join game';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function connectToGame(gameId: string) {
    socketService.connect();
    socketService.joinGame(gameId);

    socketService.onGameJoined((data) => {
      currentGame.value = data.game;
      gameState.value = data.game.gameState;
      myColor.value = data.yourColor;
    });

    socketService.onPlayerJoined((data) => {
      if (data.color === 'black') {
        blackPlayer.value = data.player;
      } else {
        whitePlayer.value = data.player;
      }
      if (currentGame.value) {
        currentGame.value.status = 'active';
      }
    });

    socketService.onMoveMade((data) => {
      gameState.value = data.gameState;
    });

    socketService.onTurnPassed((data) => {
      gameState.value = data.gameState;
    });

    socketService.onGameEnded((data) => {
      if (currentGame.value) {
        currentGame.value.status = 'finished';
        currentGame.value.winner = data.winner;
        currentGame.value.finalScore = data.finalScore;
      }
    });

    socketService.onScoringStarted((data) => {
      gameState.value = data.gameState;
      if (currentGame.value) {
        currentGame.value.status = 'scoring';
      }
    });

    socketService.onError((err) => {
      error.value = err.message;
    });

    socketService.onInvalidMove((data) => {
      error.value = data.message;
      setTimeout(() => { error.value = null; }, 3000);
    });
  }

  function makeMove(x: number, y: number) {
    if (!currentGame.value) return;
    socketService.makeMove(currentGame.value.id, x, y);
  }

  function passTurn() {
    if (!currentGame.value) return;
    socketService.passTurn(currentGame.value.id);
  }

  function resign() {
    if (!currentGame.value) return;
    socketService.resign(currentGame.value.id);
  }

  function markDeadStones(positions: Position[]) {
    if (!currentGame.value) return;
    socketService.markDeadStones(currentGame.value.id, positions);
  }

  function acceptScore() {
    if (!currentGame.value) return;
    socketService.acceptScore(currentGame.value.id);
  }

  function leaveGame() {
    if (currentGame.value) {
      socketService.leaveGame(currentGame.value.id);
    }
    socketService.disconnect();
    currentGame.value = null;
    gameState.value = null;
    myColor.value = null;
    blackPlayer.value = null;
    whitePlayer.value = null;
  }

  return {
    currentGame,
    gameState,
    myColor,
    blackPlayer,
    whitePlayer,
    error,
    loading,
    isMyTurn,
    currentTurn,
    status,
    stones,
    captures,
    lastMove,
    createGame,
    loadGame,
    joinGame,
    connectToGame,
    makeMove,
    passTurn,
    resign,
    markDeadStones,
    acceptScore,
    leaveGame,
  };
});
