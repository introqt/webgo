<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);
    const redirect = route.query.redirect as string;
    router.push(redirect || '/lobby');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">Login</h1>

      <form @submit.prevent="handleSubmit" class="card space-y-4">
        <div v-if="error" class="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="input"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="input"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn btn-primary py-3"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

        <p class="text-center text-gray-400">
          Don't have an account?
          <RouterLink to="/register" class="text-blue-400 hover:underline">Sign up</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
