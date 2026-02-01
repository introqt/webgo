import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserPublic, UserStats, AuthResponse } from '@webgo/shared';
import { api } from '@/services/api';

interface MeResponse {
  user: UserPublic;
  stats: UserStats;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(null);
  const stats = ref<UserStats | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    token.value = response.data.token;
    user.value = response.data.user;
    localStorage.setItem('token', response.data.token);
  }

  async function register(username: string, email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/register', { username, email, password });
    token.value = response.data.token;
    user.value = response.data.user;
    localStorage.setItem('token', response.data.token);
  }

  async function fetchUser() {
    if (!token.value) return;
    try {
      const response = await api.get<MeResponse>('/auth/me');
      user.value = response.data.user;
      stats.value = response.data.stats;
    } catch {
      logout();
    }
  }

  function logout() {
    user.value = null;
    stats.value = null;
    token.value = null;
    localStorage.removeItem('token');
  }

  // Restore user on app load
  if (token.value) {
    fetchUser();
  }

  return {
    user,
    stats,
    token,
    isAuthenticated,
    login,
    register,
    fetchUser,
    logout,
  };
});
