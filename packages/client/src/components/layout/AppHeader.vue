<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import GoLogo from '@/components/ui/GoLogo.vue';

const router = useRouter();
const authStore = useAuthStore();
const isMenuOpen = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const username = computed(() => authStore.user?.username);

function logout() {
  authStore.logout();
  router.push('/');
  closeMenu();
}

function closeMenu() {
  isMenuOpen.value = false;
}

function navigateTo(path: string) {
  router.push(path);
  closeMenu();
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

          <!-- Desktop Navigation -->
          <nav class="hidden sm:flex items-center gap-6">
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

        <!-- Right Group - Desktop -->
        <div class="hidden sm:flex items-center gap-4">
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

        <!-- Mobile Hamburger Menu -->
        <button
          @click="isMenuOpen = !isMenuOpen"
          class="sm:hidden text-gray-300 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="!isMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      <nav
        v-if="isMenuOpen"
        class="sm:hidden mt-4 pt-4 border-t border-gray-700 space-y-3"
      >
        <RouterLink
          to="/learn"
          class="block text-gray-300 hover:text-white transition-colors py-2"
          @click="closeMenu"
        >
          Learn
        </RouterLink>
        <RouterLink
          to="/leaderboard"
          class="block text-gray-300 hover:text-white transition-colors py-2"
          @click="closeMenu"
        >
          Leaderboard
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/lobby"
          class="block btn btn-primary text-center"
          @click="closeMenu"
        >
          Play
        </RouterLink>

        <div class="pt-3 border-t border-gray-700 space-y-2">
          <template v-if="isAuthenticated">
            <RouterLink
              to="/profile"
              class="block text-gray-300 hover:text-white transition-colors py-2"
              @click="closeMenu"
            >
              {{ username }}
            </RouterLink>
            <button
              @click="logout"
              class="w-full btn btn-secondary text-left"
            >
              Logout
            </button>
          </template>
          <template v-else>
            <RouterLink
              to="/login"
              class="block btn btn-primary text-center"
              @click="closeMenu"
            >
              Login
            </RouterLink>
            <RouterLink
              to="/register"
              class="block btn btn-primary text-center"
              @click="closeMenu"
            >
              Sign Up
            </RouterLink>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>
