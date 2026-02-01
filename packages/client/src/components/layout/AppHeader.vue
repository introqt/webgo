<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const username = computed(() => authStore.user?.username);

function logout() {
  authStore.logout();
  router.push('/');
}
</script>

<template>
  <header class="bg-gray-800 border-b border-gray-700">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <RouterLink to="/" class="text-2xl font-bold text-white hover:text-blue-400">
        WebGo
      </RouterLink>

      <nav class="flex items-center gap-4">
        <RouterLink to="/leaderboard" class="text-gray-300 hover:text-white">
          Leaderboard
        </RouterLink>
        <template v-if="isAuthenticated">
          <RouterLink to="/lobby" class="text-gray-300 hover:text-white">
            Play
          </RouterLink>
          <RouterLink to="/profile" class="text-gray-300 hover:text-white">
            {{ username }}
          </RouterLink>
          <button @click="logout" class="text-gray-400 hover:text-white">
            Logout
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="text-gray-300 hover:text-white">
            Login
          </RouterLink>
          <RouterLink to="/register" class="btn btn-primary">
            Sign Up
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
