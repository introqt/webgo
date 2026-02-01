<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();

const invitationCode = computed(() => route.params.code as string);
const loading = ref(true);
const error = ref('');
const gameInfo = ref<{
  id: string;
  boardSize: number;
  blackPlayer: { username: string } | null;
  whitePlayer: { username: string } | null;
  status: string;
} | null>(null);

async function loadGameInfo() {
  loading.value = true;
  error.value = '';

  try {
    const response = await api.get<{
      boardSize: number;
      blackPlayer: { username: string } | null;
      whitePlayer: { username: string } | null;
      status: string;
      id: string;
    }>(`/games/join/${invitationCode.value}`);

    gameInfo.value = response.data;

    // If already a participant, redirect to game
    if (authStore.user) {
      const userId = authStore.user.id;
      const game = response.data as { blackPlayerId?: string; whitePlayerId?: string; id: string };
      if (game.blackPlayerId === userId || game.whitePlayerId === userId) {
        router.push(`/game/${game.id}`);
        return;
      }
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Game not found';
  } finally {
    loading.value = false;
  }
}

async function joinGame() {
  if (!authStore.isAuthenticated) {
    // Redirect to login with return URL
    router.push({
      name: 'login',
      query: { redirect: route.fullPath },
    });
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await gameStore.joinGame(invitationCode.value);
    router.push(`/game/${result.game.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to join game';
    loading.value = false;
  }
}

onMounted(() => {
  loadGameInfo();
});
</script>

<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">Join Game</h1>

      <div v-if="loading" class="card text-center py-8">
        <div class="text-gray-400">Loading game information...</div>
      </div>

      <div v-else-if="error" class="card text-center py-8">
        <div class="text-red-400 mb-4">{{ error }}</div>
        <RouterLink to="/lobby" class="btn btn-primary">
          Go to Lobby
        </RouterLink>
      </div>

      <div v-else-if="gameInfo" class="card">
        <div class="text-center mb-6">
          <div class="text-6xl mb-4">&#9679; &#9675;</div>
          <h2 class="text-xl font-semibold">You've been invited to play Go!</h2>
        </div>

        <div class="space-y-4 mb-6">
          <div class="flex justify-between">
            <span class="text-gray-400">Board Size:</span>
            <span>{{ gameInfo.boardSize }}x{{ gameInfo.boardSize }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Black Player:</span>
            <span>{{ gameInfo.blackPlayer?.username || 'Waiting...' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">White Player:</span>
            <span>{{ gameInfo.whitePlayer?.username || 'Waiting...' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Status:</span>
            <span
              :class="gameInfo.status === 'waiting' ? 'text-green-400' : 'text-yellow-400'"
            >
              {{ gameInfo.status === 'waiting' ? 'Open' : 'In Progress' }}
            </span>
          </div>
        </div>

        <div v-if="gameInfo.status !== 'waiting'" class="text-center text-yellow-400 mb-4">
          This game has already started.
        </div>

        <button
          v-if="gameInfo.status === 'waiting'"
          @click="joinGame"
          :disabled="loading"
          class="w-full btn btn-primary py-3"
        >
          {{ authStore.isAuthenticated ? 'Join Game' : 'Login to Join' }}
        </button>

        <RouterLink
          v-else
          :to="`/game/${gameInfo.id}`"
          class="block w-full btn btn-secondary py-3 text-center"
        >
          Watch Game
        </RouterLink>
      </div>
    </div>
  </div>
</template>
