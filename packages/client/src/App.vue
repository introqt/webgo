<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/layout/AppHeader.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <footer class="py-4 text-center text-gray-500 text-sm">
      WebGo - Play Go Online
    </footer>
  </div>
</template>
