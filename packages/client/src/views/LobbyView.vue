<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { BoardSize, StoneColor, GameSummary } from '@webgo/shared';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';

const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();

const boardSize = ref<BoardSize>(19);
const selectedColor = ref<StoneColor | 'random'>('random');
const joinCode = ref('');
const error = ref('');
const loading = ref(false);
const myGames = ref<GameSummary[]>([]);
const loadingGames = ref(false);
const resigningGameId = ref<string | null>(null);

async function createGame() {
  error.value = '';
  loading.value = true;

  try {
    const color = selectedColor.value === 'random' ? undefined : selectedColor.value;
    const result = await gameStore.createGame(boardSize.value, color);
    router.push(`/game/${result.game.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create game';
  } finally {
    loading.value = false;
  }
}

async function joinGame() {
  if (!joinCode.value.trim()) {
    error.value = 'Please enter an invitation code';
    return;
  }

  error.value = '';
  loading.value = true;

  try {
    const result = await gameStore.joinGame(joinCode.value.trim().toUpperCase());
    router.push(`/game/${result.game.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to join game';
  } finally {
    loading.value = false;
  }
}

async function loadMyGames() {
  loadingGames.value = true;
  try {
    const response = await api.get<{ games: GameSummary[] }>('/games/my-games');
    myGames.value = response.data.games;
  } catch (e) {
    console.error('Failed to load games:', e);
  } finally {
    loadingGames.value = false;
  }
}

function goToGame(gameId: string) {
  router.push(`/game/${gameId}`);
}

function formatStatus(status: string): string {
  switch (status) {
    case 'waiting': return 'Waiting';
    case 'active': return 'In Progress';
    case 'scoring': return 'Scoring';
    case 'finished': return 'Finished';
    default: return status;
  }
}

function canResign(game: GameSummary): boolean {
  if (!authStore.user) return false;
  const isParticipant = game.blackPlayer?.id === authStore.user.id ||
                        game.whitePlayer?.id === authStore.user.id;
  const isNotFinished = game.status !== 'finished';
  return isParticipant && isNotFinished;
}

function getResignLabel(game: GameSummary): string {
  return game.status === 'waiting' ? 'Leave' : 'Resign';
}

async function handleResign(game: GameSummary) {
  const label = getResignLabel(game);
  const confirm = window.confirm(`Are you sure you want to ${label.toLowerCase()} from this game?`);
  if (!confirm) return;

  resigningGameId.value = game.id;
  try {
    await api.post(`/games/${game.id}/resign`);
    await loadMyGames();
  } catch (e) {
    console.error('Failed to resign:', e);
    error.value = e instanceof Error ? e.message : 'Failed to resign from game';
  } finally {
    resigningGameId.value = null;
  }
}

onMounted(() => {
  loadMyGames();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-center mb-8">Game Lobby</h1>

    <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      <!-- Create Game -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Create a Game</h2>

        <div v-if="error" class="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 mb-4">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Board Size</label>
            <div class="flex gap-2">
              <button
                v-for="size in [9, 13, 19] as BoardSize[]"
                :key="size"
                @click="boardSize = size"
                :class="[
                  'flex-1 py-2 rounded-lg font-medium transition-colors',
                  boardSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                ]"
              >
                {{ size }}x{{ size }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Your Color</label>
            <div class="flex gap-2">
              <button
                @click="selectedColor = 'black'"
                :class="[
                  'flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  selectedColor === 'black'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                ]"
              >
                <span class="w-4 h-4 rounded-full bg-stone-black border border-gray-500"></span>
                Black
              </button>
              <button
                @click="selectedColor = 'white'"
                :class="[
                  'flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  selectedColor === 'white'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                ]"
              >
                <span class="w-4 h-4 rounded-full bg-stone-white border border-gray-400"></span>
                White
              </button>
              <button
                @click="selectedColor = 'random'"
                :class="[
                  'flex-1 py-2 rounded-lg font-medium transition-colors',
                  selectedColor === 'random'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                ]"
              >
                Random
              </button>
            </div>
          </div>

          <button
            @click="createGame"
            :disabled="loading"
            class="w-full btn btn-primary py-3"
          >
            {{ loading ? 'Creating...' : 'Create Game' }}
          </button>
        </div>
      </div>

      <!-- Join Game -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Join a Game</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Invitation Code</label>
            <input
              v-model="joinCode"
              type="text"
              class="input uppercase"
              placeholder="Enter code (e.g., ABC123XY)"
              maxlength="8"
            />
          </div>

          <button
            @click="joinGame"
            :disabled="loading || !joinCode.trim()"
            class="w-full btn btn-primary py-3 disabled:opacity-50"
          >
            {{ loading ? 'Joining...' : 'Join Game' }}
          </button>
        </div>
      </div>
    </div>

    <!-- My Games -->
    <div class="max-w-6xl mx-auto mt-8">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">My Games</h2>

        <div v-if="loadingGames" class="text-center py-8 text-gray-400">
          Loading games...
        </div>

        <div v-else-if="myGames.length === 0" class="text-center py-8 text-gray-400">
          You haven't played any games yet.
        </div>

        <!-- Desktop table view (lg+) and Mobile card view -->
        <template v-else>
          <div class="hidden lg:block overflow-hidden rounded-lg border border-gray-600">
          <!-- Header -->
          <div class="grid gap-0 bg-gray-800 border-b border-gray-600 sticky top-0" style="grid-template-columns: 80px 60px 1fr 80px 100px;">
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Status</div>
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Board</div>
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Players</div>
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Created</div>
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Actions</div>
          </div>

          <!-- Rows -->
          <div
            v-for="(game, index) in myGames"
            :key="game.id"
            class="grid gap-0 border-t border-gray-700 hover:bg-gray-800/50 transition-colors"
            :class="index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/10'"
            style="grid-template-columns: 80px 60px 1fr 80px 100px;"
          >
            <!-- Status -->
            <div class="px-3 py-2 flex items-center text-sm">
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs font-medium',
                  game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  game.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                  game.status === 'scoring' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400',
                ]"
              >
                {{ formatStatus(game.status) }}
              </span>
            </div>

            <!-- Board Size -->
            <div class="px-3 py-2 text-sm text-gray-300 flex items-center">
              {{ game.boardSize }}x{{ game.boardSize }}
            </div>

            <!-- Players -->
            <div
              class="px-3 py-2 text-sm text-gray-300 flex items-center gap-2 cursor-pointer"
              @click="goToGame(game.id)"
            >
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-stone-black"></span>
                <span class="truncate">{{ game.blackPlayer?.username || 'Waiting' }}</span>
              </div>
              <span class="text-gray-500 text-xs">vs</span>
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-stone-white border border-gray-400"></span>
                <span class="truncate">{{ game.whitePlayer?.username || 'Waiting' }}</span>
              </div>
            </div>

            <!-- Created -->
            <div class="px-3 py-2 text-sm text-gray-400 flex items-center">
              {{ new Date(game.createdAt).toLocaleDateString() }}
            </div>

            <!-- Actions -->
            <div class="px-3 py-2 flex items-center justify-center gap-2">
              <button
                v-if="canResign(game)"
                @click="handleResign(game)"
                :disabled="resigningGameId === game.id"
                :class="[
                  'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                  resigningGameId === game.id
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600/30 text-red-400 hover:bg-red-600/50',
                ]"
              >
                {{ resigningGameId === game.id ? '...' : getResignLabel(game) }}
              </button>
              <button
                @click="goToGame(game.id)"
                class="px-2 py-0.5 rounded text-xs font-medium bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 transition-colors"
              >
                View
              </button>
            </div>
          </div>
          </div>

          <!-- Mobile card view (<lg) -->
          <div class="lg:hidden space-y-2">
          <div
            v-for="game in myGames"
            :key="game.id"
            class="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
          >
            <div
              class="flex items-center gap-4 flex-1 cursor-pointer"
              @click="goToGame(game.id)"
            >
              <span class="text-gray-400 text-sm">{{ game.boardSize }}x{{ game.boardSize }}</span>
              <div class="flex items-center gap-1 min-w-0">
                <span class="w-2 h-2 rounded-full bg-stone-black flex-shrink-0"></span>
                <span class="truncate text-sm">{{ game.blackPlayer?.username || 'Waiting' }}</span>
              </div>
              <span class="text-gray-500 text-xs flex-shrink-0">vs</span>
              <div class="flex items-center gap-1 min-w-0">
                <span class="w-2 h-2 rounded-full bg-stone-white border border-gray-400 flex-shrink-0"></span>
                <span class="truncate text-sm">{{ game.whitePlayer?.username || 'Waiting' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 ml-2">
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  game.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                  game.status === 'scoring' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400',
                ]"
              >
                {{ formatStatus(game.status) }}
              </span>
              <button
                v-if="canResign(game)"
                @click.stop="handleResign(game)"
                :disabled="resigningGameId === game.id"
                :class="[
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  resigningGameId === game.id
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600/30 text-red-400 hover:bg-red-600/50',
                ]"
              >
                {{ resigningGameId === game.id ? '...' : getResignLabel(game) }}
              </button>
            </div>
          </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
