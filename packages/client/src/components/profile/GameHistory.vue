<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { GameHistoryResponse, GameHistoryItem } from '@webgo/shared';
import { api } from '@/services/api';

const router = useRouter();

const games = ref<GameHistoryItem[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
const currentPage = ref(0);
const filter = ref<'all' | 'wins' | 'losses'>('all');
const pageSize = 10;

const totalPages = computed(() => Math.ceil(total.value / pageSize));

async function loadHistory(page = 0) {
  loading.value = true;
  error.value = '';

  try {
    const offset = page * pageSize;
    const response = await api.get<GameHistoryResponse>(
      `/users/me/game-history?filter=${filter.value}&limit=${pageSize}&offset=${offset}`
    );
    games.value = response.data.games;
    total.value = response.data.total;
    currentPage.value = page;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load game history';
  } finally {
    loading.value = false;
  }
}

function changeFilter(newFilter: 'all' | 'wins' | 'losses') {
  filter.value = newFilter;
  loadHistory(0);
}

function goToGame(gameId: string) {
  router.push(`/game/${gameId}`);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRatingChangeClass(change: number | null): string {
  if (change === null) return 'text-gray-400';
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-gray-400';
}

function formatRatingChange(change: number | null): string {
  if (change === null) return '-';
  if (change > 0) return `+${change}`;
  return `${change}`;
}

function getResultClass(result: 'win' | 'loss' | 'draw'): string {
  if (result === 'win') return 'bg-green-500/20 text-green-400';
  if (result === 'loss') return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-400';
}

function getResultText(result: 'win' | 'loss' | 'draw'): string {
  if (result === 'win') return 'Won';
  if (result === 'loss') return 'Lost';
  return 'Draw';
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Game History</h2>
      <div class="flex gap-1">
        <button
          v-for="f in (['all', 'wins', 'losses'] as const)"
          :key="f"
          @click="changeFilter(f)"
          :class="[
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            filter === f
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
          ]"
        >
          {{ f === 'all' ? 'All' : f === 'wins' ? 'Wins' : 'Losses' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-400">
      Loading history...
    </div>

    <div v-else-if="error" class="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
      {{ error }}
    </div>

    <div v-else-if="games.length === 0" class="text-center py-8 text-gray-400">
      No games found.
    </div>

    <div v-else>
      <!-- Header -->
      <div class="hidden md:flex items-center px-4 py-2 text-sm font-medium text-gray-400 border-b border-gray-700">
        <span class="w-20">Result</span>
        <span class="flex-1">Opponent</span>
        <span class="w-16 text-center">Board</span>
        <span class="w-24 text-right">Rating</span>
        <span class="w-24 text-right">Date</span>
      </div>

      <!-- Game rows -->
      <div
        v-for="game in games"
        :key="game.id"
        @click="goToGame(game.id)"
        class="flex flex-col md:flex-row md:items-center px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700/50 last:border-0"
      >
        <!-- Mobile: stacked layout -->
        <div class="md:hidden flex justify-between items-center mb-2">
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-medium',
              getResultClass(game.result),
            ]"
          >
            {{ getResultText(game.result) }}
          </span>
          <span class="text-sm text-gray-400">{{ formatDate(game.playedAt) }}</span>
        </div>
        <div class="md:hidden flex justify-between items-center">
          <span>vs {{ game.opponent.username }} ({{ game.opponent.rating }})</span>
          <span class="font-mono font-bold" :class="getRatingChangeClass(game.ratingChange)">
            {{ formatRatingChange(game.ratingChange) }}
          </span>
        </div>

        <!-- Desktop: row layout -->
        <span
          :class="[
            'hidden md:inline-block w-20 px-2 py-1 rounded text-xs font-medium text-center',
            getResultClass(game.result),
          ]"
        >
          {{ getResultText(game.result) }}
        </span>
        <span class="hidden md:block flex-1">
          <span class="font-medium">{{ game.opponent.username }}</span>
          <span class="text-gray-400 ml-2">({{ game.opponent.rating }})</span>
        </span>
        <span class="hidden md:block w-16 text-center text-gray-400">
          {{ game.boardSize }}x{{ game.boardSize }}
        </span>
        <span class="hidden md:block w-24 text-right font-mono font-bold" :class="getRatingChangeClass(game.ratingChange)">
          {{ formatRatingChange(game.ratingChange) }}
        </span>
        <span class="hidden md:block w-24 text-right text-gray-400 text-sm">
          {{ formatDate(game.playedAt) }}
        </span>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-2 pt-4 border-t border-gray-700 mt-4">
        <button
          @click="loadHistory(currentPage - 1)"
          :disabled="currentPage === 0"
          class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span class="px-3 py-1 text-gray-400">
          Page {{ currentPage + 1 }} of {{ totalPages }}
        </span>
        <button
          @click="loadHistory(currentPage + 1)"
          :disabled="currentPage >= totalPages - 1"
          class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
