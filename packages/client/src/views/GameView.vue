<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Position } from '@webgo/shared';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { useSound } from '@/composables/useSound';
import GoBoard from '@/components/game/GoBoard.vue';
import GameInfo from '@/components/game/GameInfo.vue';
import GameControls from '@/components/game/GameControls.vue';
import InvitationLink from '@/components/game/InvitationLink.vue';
import MoveHistory from '@/components/game/MoveHistory.vue';
import VictoryOverlay from '@/components/game/VictoryOverlay.vue';
import SoundToggle from '@/components/game/SoundToggle.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();
const { play } = useSound();

const gameId = computed(() => route.params.id as string);
const loading = ref(true);
const showVictoryOverlay = ref(false);

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
const winner = computed(() => gameStore.currentGame?.winner ?? null);
const finalScore = computed(() => gameStore.currentGame?.finalScore ?? null);
const endReason = computed(() => gameStore.endReason);
const ratingChanges = computed(() => gameStore.ratingChanges);
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

function dismissVictory() {
  showVictoryOverlay.value = false;
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
      gameStore.connectToGame(gameId.value, {
        onStonePlace: () => play('stone-place'),
        onCapture: () => play('stone-capture'),
        onVictory: () => {
          play('victory');
          showVictoryOverlay.value = true;
        },
      });
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
  <div class="w-full min-h-screen flex flex-col">
    <!-- Victory Overlay -->
    <VictoryOverlay
      v-if="showVictoryOverlay && status === 'finished'"
      :winner="winner"
      :final-score="finalScore"
      :reason="endReason"
      :black-player="blackPlayer"
      :white-player="whitePlayer"
      :rating-changes="ratingChanges"
      @dismiss="dismissVictory"
    />

    <div v-if="loading" class="text-center py-16 flex-1">
      <div class="text-xl text-gray-400">Loading game...</div>
    </div>

    <div v-else-if="!gameStore.currentGame" class="text-center py-16 flex-1">
      <div class="text-xl text-gray-400 mb-4">Game not found</div>
      <button @click="goToLobby" class="btn btn-primary">
        Back to Lobby
      </button>
    </div>

    <div v-else class="flex-1 flex flex-col lg:flex-row gap-2 lg:gap-6 px-2 py-4 lg:px-6 lg:py-6 w-full overflow-x-hidden">
      <!-- Left Sidebar (hidden on mobile) -->
      <div class="hidden lg:block lg:w-[280px] space-y-4 flex-shrink-0">
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

        <!-- Move history -->
        <MoveHistory
          :moves="moves"
          :board-size="boardSize"
        />
      </div>

      <!-- Center Board -->
      <div class="flex-1 flex justify-center items-start min-w-0 w-full">
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

      <!-- Right Sidebar -->
      <div class="w-full lg:w-[280px] space-y-2 lg:space-y-4 flex-shrink-0 px-2 lg:px-0">
        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400"
        >
          {{ error }}
        </div>

        <!-- Game info on mobile -->
        <GameInfo
          class="lg:hidden"
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

        <!-- Move history on mobile -->
        <MoveHistory
          class="lg:hidden"
          :moves="moves"
          :board-size="boardSize"
        />

        <!-- Sound toggle -->
        <SoundToggle />

        <!-- Back to lobby -->
        <button @click="goToLobby" class="w-full btn btn-secondary">
          Back to Lobby
        </button>
      </div>
    </div>
  </div>
</template>
