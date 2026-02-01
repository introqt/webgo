<script setup lang="ts">
import type { StoneColor } from '@webgo/shared';

defineProps<{
  winner: StoneColor | 'draw' | null;
  finalScore: { black: number; white: number } | null;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

function handleDismiss() {
  emit('dismiss');
}

function getWinnerText(winner: StoneColor | 'draw' | null): string {
  if (!winner) return 'Game Over';
  if (winner === 'draw') return 'Draw!';
  return winner === 'black' ? 'Black Wins!' : 'White Wins!';
}

function getScoreText(score: { black: number; white: number } | null): string {
  if (!score) return '';
  return `${score.black} - ${score.white}`;
}
</script>

<template>
  <div class="victory-overlay" @click.self="handleDismiss">
    <div class="victory-card">
      <div class="victory-content">
        <h2 class="victory-title">
          {{ getWinnerText(winner) }}
        </h2>
        <p v-if="finalScore" class="victory-score">
          {{ getScoreText(finalScore) }}
        </p>
      </div>
      <button @click="handleDismiss" class="btn btn-primary mt-6">
        Dismiss
      </button>
    </div>
  </div>
</template>

<style scoped>
.victory-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.victory-card {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 2px solid #3b82f6;
  border-radius: 16px;
  padding: 3rem 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.3);
  animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.victory-content {
  text-align: center;
}

.victory-title {
  font-size: 3rem;
  font-weight: bold;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

.victory-score {
  font-size: 2rem;
  color: #9ca3af;
  font-weight: 600;
  letter-spacing: 0.05em;
}

@keyframes slideIn {
  from {
    transform: translateY(-100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .victory-card {
    padding: 2rem 1.5rem;
  }

  .victory-title {
    font-size: 2rem;
  }

  .victory-score {
    font-size: 1.5rem;
  }
}
</style>
