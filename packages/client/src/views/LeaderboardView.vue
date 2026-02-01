<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { LeaderboardResponse, LeaderboardUser } from '@webgo/shared';
import { api } from '@/services/api';

const users = ref<LeaderboardUser[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
const currentPage = ref(0);
const pageSize = 20;

const totalPages = computed(() => Math.ceil(total.value / pageSize));

async function loadLeaderboard(page = 0) {
  loading.value = true;
  error.value = '';

  try {
    const offset = page * pageSize;
    const response = await api.get<LeaderboardResponse>(
      `/users/leaderboard?limit=${pageSize}&offset=${offset}`
    );
    users.value = response.data.users;
    total.value = response.data.total;
    currentPage.value = page;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load leaderboard';
  } finally {
    loading.value = false;
  }
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'text-yellow-400 font-bold';
  if (rank === 2) return 'text-gray-300 font-bold';
  if (rank === 3) return 'text-amber-600 font-bold';
  return 'text-gray-400';
}

function getRatingClass(rating: number): string {
  if (rating >= 2000) return 'text-purple-400';
  if (rating >= 1800) return 'text-blue-400';
  if (rating >= 1500) return 'text-green-400';
  if (rating >= 1200) return 'text-yellow-400';
  return 'text-gray-400';
}

onMounted(() => {
  loadLeaderboard();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-center mb-8">Leaderboard</h1>

    <div class="max-w-2xl mx-auto">
      <div class="card">
        <div v-if="loading" class="text-center py-8 text-gray-400">
          Loading leaderboard...
        </div>

        <div v-else-if="error" class="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
          {{ error }}
        </div>

        <div v-else-if="users.length === 0" class="text-center py-8 text-gray-400">
          No players yet.
        </div>

        <div v-else>
          <!-- Header -->
          <div class="flex items-center px-4 py-2 text-sm font-medium text-gray-400 border-b border-gray-700">
            <span class="w-16 text-center">Rank</span>
            <span class="flex-1">Player</span>
            <span class="w-24 text-right">Rating</span>
          </div>

          <!-- User rows -->
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center px-4 py-3 hover:bg-gray-700/50 transition-colors"
          >
            <span class="w-16 text-center text-xl" :class="getRankClass(user.rank)">
              <template v-if="user.rank === 1">🥇</template>
              <template v-else-if="user.rank === 2">🥈</template>
              <template v-else-if="user.rank === 3">🥉</template>
              <template v-else>#{{ user.rank }}</template>
            </span>
            <span class="flex-1 font-medium">{{ user.username }}</span>
            <span class="w-24 text-right font-mono font-bold" :class="getRatingClass(user.rating)">
              {{ user.rating }}
            </span>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center gap-2 pt-4 border-t border-gray-700 mt-4">
            <button
              @click="loadLeaderboard(currentPage - 1)"
              :disabled="currentPage === 0"
              class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span class="px-3 py-1 text-gray-400">
              Page {{ currentPage + 1 }} of {{ totalPages }}
            </span>
            <button
              @click="loadLeaderboard(currentPage + 1)"
              :disabled="currentPage >= totalPages - 1"
              class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
