<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import GoLogo from '@/components/ui/GoLogo.vue';

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
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Left Group -->
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <GoLogo :size="40" />
            <span class="text-xl font-bold text-white hidden sm:inline">WebGo</span>
          </RouterLink>

          <nav class="flex items-center gap-6">
            <RouterLink to="/learn" class="text-gray-300 hover:text-white transition-colors">
              Learn
            </RouterLink>
            <RouterLink to="/leaderboard" class="text-gray-300 hover:text-white transition-colors">
              Leaderboard
            </RouterLink>
            <RouterLink v-if="isAuthenticated" to="/lobby" class="btn btn-primary px-6">
              Play
            </RouterLink>
          </nav>
        </div>

        <!-- Right Group -->
        <div class="flex items-center gap-4">
          <template v-if="isAuthenticated">
            <RouterLink to="/profile" class="text-gray-300 hover:text-white transition-colors">
              {{ username }}
            </RouterLink>
            <button @click="logout" class="btn btn-secondary">
              Logout
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="text-gray-300 hover:text-white transition-colors">
              Login
            </RouterLink>
            <RouterLink to="/register" class="btn btn-primary">
              Sign Up
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
