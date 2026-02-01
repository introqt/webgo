<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>

<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-5xl font-bold mb-6">
        Play <span class="text-blue-400">Go</span> Online
      </h1>
      <p class="text-xl text-gray-400 mb-8">
        Challenge your friends to a game of Go. Create a game, share the invitation link,
        and start playing in seconds.
      </p>

      <div class="flex justify-center gap-4">
        <template v-if="isAuthenticated">
          <RouterLink to="/lobby" class="btn btn-primary text-lg px-8 py-3">
            Start Playing
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/register" class="btn btn-primary text-lg px-8 py-3">
            Get Started
          </RouterLink>
          <RouterLink to="/login" class="btn btn-secondary text-lg px-8 py-3">
            Login
          </RouterLink>
        </template>
      </div>

      <!-- Features -->
      <div class="grid md:grid-cols-3 gap-8 mt-16">
        <div class="card text-center">
          <div class="text-4xl mb-4">9x9</div>
          <div class="text-3xl mb-2">13x13</div>
          <div class="text-4xl mb-4">19x19</div>
          <h3 class="font-semibold mb-2">Multiple Board Sizes</h3>
          <p class="text-gray-400 text-sm">
            Play on 9x9 for quick games, 13x13 for medium, or 19x19 for full games.
          </p>
        </div>

        <div class="card text-center">
          <div class="text-5xl mb-4">&#9679; &#9675;</div>
          <h3 class="font-semibold mb-2">Real-time Play</h3>
          <p class="text-gray-400 text-sm">
            See your opponent's moves instantly with live WebSocket updates.
          </p>
        </div>

        <div class="card text-center">
          <div class="text-5xl mb-4">&#128279;</div>
          <h3 class="font-semibold mb-2">Easy Invitations</h3>
          <p class="text-gray-400 text-sm">
            Share a simple link with friends to start playing immediately.
          </p>
        </div>
      </div>

      <!-- Rules reminder -->
      <div class="mt-16 card text-left">
        <h2 class="text-2xl font-semibold mb-4">About Go</h2>
        <p class="text-gray-400 mb-4">
          Go is one of the oldest board games in the world, originating in China over 2,500 years ago.
          Two players take turns placing black and white stones on a grid, attempting to surround
          more territory than their opponent.
        </p>
        <p class="text-gray-400">
          Stones that are completely surrounded by opponent stones are captured and removed from the board.
          The game ends when both players pass consecutively, and the player with more territory wins.
        </p>
      </div>
    </div>
  </div>
</template>
