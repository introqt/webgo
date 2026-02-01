<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  loading.value = true;

  try {
    await authStore.register(username.value, email.value, password.value);
    router.push('/lobby');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">Create Account</h1>

      <form @submit.prevent="handleSubmit" class="card space-y-4">
        <div v-if="error" class="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Username</label>
          <input
            v-model="username"
            type="text"
            required
            minlength="3"
            maxlength="50"
            pattern="[a-zA-Z0-9_]+"
            class="input"
            placeholder="Choose a username"
          />
          <p class="text-xs text-gray-500 mt-1">Letters, numbers, and underscores only</p>
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
            minlength="6"
            class="input"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            class="input"
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn btn-primary py-3"
        >
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>

        <p class="text-center text-gray-400">
          Already have an account?
          <RouterLink to="/login" class="text-blue-400 hover:underline">Login</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
