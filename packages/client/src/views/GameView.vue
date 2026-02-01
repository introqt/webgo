<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Position } from '@webgo/shared';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import GoBoard from '@/components/game/GoBoard.vue';
import GameInfo from '@/components/game/GameInfo.vue';
import GameControls from '@/components/game/GameControls.vue';
import InvitationLink from '@/components/game/InvitationLink.vue';
import MoveHistory from '@/components/game/MoveHistory.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();

const gameId = computed(() => route.params.id as string);
const loading = ref(true);

const boardSize = computed(() => gameStore.currentGame?.boardSize || 19);
const stones = computed(() => gameStore.stones);
const lastMove = computed(() => gameStore.lastMove);
const myColor = computed(() => gameStore.myColor);
const isMyTurn = computed(() => gameStore.isMyTurn);
const currentTurn = computed(() => gameStore.currentTurn);
const status = computed(() => gameStore.status);
const captures = computed(() => gameStore.captures);
const error = computed(() => gameStore.error);
const blackPlayer = computed(() => gameStore.blackPlayer);
const whitePlayer = computed(() => gameStore.whitePlayer);
const winner = computed(() => gameStore.currentGame?.winner);
const finalScore = computed(() => gameStore.currentGame?.finalScore);
const invitationCode = computed(() => gameStore.currentGame?.invitationCode || '');
const deadStones = computed(() => gameStore.gameState?.deadStones || []);
const territory = computed(() => gameStore.gameState?.territory || { black: [], white: [] });
const moves = computed(() => gameStore.gameState?.moveHistory || []);
const canPlay = computed(() => {
  return authStore.isAuthenticated &&
    (gameStore.currentGame?.blackPlayerId === authStore.user?.id ||
     gameStore.currentGame?.whitePlayerId === authStore.user?.id);
});

function handlePlaceStone(pos: Position) {
  gameStore.makeMove(pos.x, pos.y);
}

function handleMarkDead(pos: Position) {
  gameStore.markDeadStones([pos]);
}

function handlePass() {
  gameStore.passTurn();
}

function handleResign() {
  gameStore.resign();
}

function handleAcceptScore() {
  gameStore.acceptScore();
}

function goToLobby() {
  router.push('/lobby');
}

async function initGame() {
  loading.value = true;
  try {
    await gameStore.loadGame(gameId.value);

    // Determine user's color
    if (authStore.user) {
      if (gameStore.currentGame?.blackPlayerId === authStore.user.id) {
        gameStore.myColor = 'black';
      } else if (gameStore.currentGame?.whitePlayerId === authStore.user.id) {
        gameStore.myColor = 'white';
      }
    }

    // Connect via WebSocket if authenticated
    if (authStore.isAuthenticated) {
      gameStore.connectToGame(gameId.value);
    }
  } catch (e) {
    console.error('Failed to load game:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  gameStore.leaveGame();
});

// Reload if game ID changes
watch(gameId, () => {
  gameStore.leaveGame();
  initGame();
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div v-if="loading" class="text-center py-16">
      <div class="text-xl text-gray-400">Loading game...</div>
    </div>

    <div v-else-if="!gameStore.currentGame" class="text-center py-16">
      <div class="text-xl text-gray-400 mb-4">Game not found</div>
      <button @click="goToLobby" class="btn btn-primary">
        Back to Lobby
      </button>
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-6">
      <!-- Main board area -->
      <div class="flex-1 flex justify-center">
        <GoBoard
          :size="boardSize"
          :stones="stones"
          :last-move="lastMove"
          :my-color="myColor"
          :is-my-turn="isMyTurn"
          :status="status"
          :dead-stones="deadStones"
          :territory="territory"
          @place-stone="handlePlaceStone"
          @mark-dead="handleMarkDead"
        />
      </div>

      <!-- Sidebar -->
      <div class="lg:w-80 space-y-4">
        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400"
        >
          {{ error }}
        </div>

        <!-- Game info -->
        <GameInfo
          :black-player="blackPlayer"
          :white-player="whitePlayer"
          :current-turn="currentTurn"
          :my-color="myColor"
          :captures="captures"
          :status="status"
          :winner="winner"
          :final-score="finalScore"
        />

        <!-- Invitation link (if waiting) -->
        <InvitationLink
          v-if="status === 'waiting' && invitationCode"
          :invitation-code="invitationCode"
        />

        <!-- Controls -->
        <GameControls
          v-if="canPlay"
          :is-my-turn="isMyTurn"
          :status="status"
          :can-play="canPlay"
          @pass="handlePass"
          @resign="handleResign"
          @accept-score="handleAcceptScore"
        />

        <!-- Login prompt for spectators -->
        <div v-if="!authStore.isAuthenticated" class="card text-center">
          <p class="text-gray-400 mb-3">Login to play or join this game</p>
          <RouterLink to="/login" class="btn btn-primary">
            Login
          </RouterLink>
        </div>

        <!-- Move history -->
        <MoveHistory
          :moves="moves"
          :board-size="boardSize"
        />

        <!-- Back to lobby -->
        <button @click="goToLobby" class="w-full btn btn-secondary">
          Back to Lobby
        </button>
      </div>
    </div>
  </div>
</template>
