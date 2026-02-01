<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const user = computed(() => authStore.user);
const stats = computed(() => authStore.stats);

onMounted(() => {
  authStore.fetchUser();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">Profile</h1>

      <div v-if="!user" class="card text-center py-8">
        <div class="text-gray-400">Loading...</div>
      </div>

      <div v-else class="space-y-6">
        <!-- User info -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Account</h2>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-400">Username:</span>
              <span class="font-medium">{{ user.username }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Rating:</span>
              <span class="font-medium text-blue-400">{{ user.rating }}</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div v-if="stats" class="card">
          <h2 class="text-xl font-semibold mb-4">Statistics</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-gray-700/50 rounded-lg">
              <div class="text-3xl font-bold">{{ stats.totalGames }}</div>
              <div class="text-sm text-gray-400">Games</div>
            </div>
            <div class="text-center p-4 bg-green-500/10 rounded-lg">
              <div class="text-3xl font-bold text-green-400">{{ stats.wins }}</div>
              <div class="text-sm text-gray-400">Wins</div>
            </div>
            <div class="text-center p-4 bg-red-500/10 rounded-lg">
              <div class="text-3xl font-bold text-red-400">{{ stats.losses }}</div>
              <div class="text-sm text-gray-400">Losses</div>
            </div>
            <div class="text-center p-4 bg-gray-700/50 rounded-lg">
              <div class="text-3xl font-bold">{{ stats.winRate.toFixed(0) }}%</div>
              <div class="text-sm text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Actions</h2>
          <div class="space-y-3">
            <RouterLink to="/lobby" class="block w-full btn btn-primary text-center">
              Play a Game
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
