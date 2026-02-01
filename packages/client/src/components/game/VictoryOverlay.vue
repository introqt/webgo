<script setup lang="ts">
import type { StoneColor, UserPublic } from '@webgo/shared';

defineProps<{
  winner: StoneColor | 'draw' | null;
  finalScore: { black: number; white: number } | null;
  reason: 'resignation' | 'score' | 'timeout' | null;
  blackPlayer: UserPublic | null;
  whitePlayer: UserPublic | null;
  ratingChanges: {
    black: { change: number; newRating: number; oldRating: number } | null;
    white: { change: number; newRating: number; oldRating: number } | null;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

function handleDismiss() {
  emit('dismiss');
}

function getWinnerText(
  winner: StoneColor | 'draw' | null,
  blackPlayer: UserPublic | null,
  whitePlayer: UserPublic | null
): string {
  if (!winner) return 'Game Over';
  if (winner === 'draw') return 'Draw!';

  const winnerName = winner === 'black' ? blackPlayer?.username : whitePlayer?.username;
  if (winnerName) {
    return `${winnerName} Wins!`;
  }

  return winner === 'black' ? 'Black Wins!' : 'White Wins!';
}

function getScoreText(score: { black: number; white: number } | null): string {
  if (!score) return '';
  return `${score.black} - ${score.white}`;
}

function getRatingChangeColor(change: number): string {
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-gray-400';
}

function formatRatingChange(change: number): string {
  if (change >= 0) return `+${change}`;
  return `${change}`;
}
</script>

<template>
  <div class="victory-overlay" @click.self="handleDismiss">
    <!-- Confetti particles -->
    <div class="confetti-container">
      <div v-for="i in 20" :key="i" class="confetti" :style="{ '--delay': `${i * 0.1}s`, '--duration': `${3 + Math.random()}s` }"></div>
    </div>

    <div class="victory-card">
      <div class="victory-content">
        <!-- Winner announcement with glow effect -->
        <h2 class="victory-title" :class="{ 'winner-glow': winner && winner !== 'draw' }">
          {{ getWinnerText(winner, blackPlayer, whitePlayer) }}
        </h2>

        <!-- Show score only if not resignation -->
        <p v-if="reason !== 'resignation' && finalScore" class="victory-score">
          Final Score: {{ getScoreText(finalScore) }}
        </p>

        <!-- Player cards with ratings -->
        <div v-if="blackPlayer || whitePlayer" class="player-cards-grid">
          <!-- Black Player Card -->
          <div
            :class="[
              'player-card',
              winner === 'black' && 'winner-card',
              winner === 'black' && 'winner-highlight',
            ]"
          >
            <div class="player-header">
              <span class="w-3 h-3 rounded-full bg-stone-black"></span>
              <span class="player-name">{{ blackPlayer?.username || 'Black' }}</span>
            </div>
            <div v-if="ratingChanges?.black" class="rating-display">
              <div class="rating-line">
                <span class="rating-before">{{ ratingChanges.black.oldRating }}</span>
                <span class="rating-arrow">→</span>
                <span class="rating-after">{{ ratingChanges.black.newRating }}</span>
              </div>
              <div :class="['rating-change', getRatingChangeColor(ratingChanges.black.change)]">
                {{ formatRatingChange(ratingChanges.black.change) }}
              </div>
            </div>
            <div v-else class="rating-unavailable">
              Rating not available
            </div>
          </div>

          <!-- White Player Card -->
          <div
            :class="[
              'player-card',
              winner === 'white' && 'winner-card',
              winner === 'white' && 'winner-highlight',
            ]"
          >
            <div class="player-header">
              <span class="w-3 h-3 rounded-full bg-stone-white border border-gray-400"></span>
              <span class="player-name">{{ whitePlayer?.username || 'White' }}</span>
            </div>
            <div v-if="ratingChanges?.white" class="rating-display">
              <div class="rating-line">
                <span class="rating-before">{{ ratingChanges.white.oldRating }}</span>
                <span class="rating-arrow">→</span>
                <span class="rating-after">{{ ratingChanges.white.newRating }}</span>
              </div>
              <div :class="['rating-change', getRatingChangeColor(ratingChanges.white.change)]">
                {{ formatRatingChange(ratingChanges.white.change) }}
              </div>
            </div>
            <div v-else class="rating-unavailable">
              Rating not available
            </div>
          </div>
        </div>
      </div>

      <!-- Dismiss button -->
      <button @click="handleDismiss" class="btn btn-primary dismiss-btn">
        Back to Lobby
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

.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 999;
}

.confetti {
  position: fixed;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #3b82f6, #1f2937);
  opacity: 0.8;
  border-radius: 50%;
  pointer-events: none;
  --delay: 0s;
  --duration: 3s;
  --left: calc(var(--index, 0) * 5%);
  left: var(--left);
  top: -10px;
  animation: confetti-fall var(--duration) linear var(--delay) forwards;
}

.confetti:nth-child(1) { left: 5%; background: #3b82f6; }
.confetti:nth-child(2) { left: 10%; background: #1f2937; }
.confetti:nth-child(3) { left: 15%; background: #3b82f6; }
.confetti:nth-child(4) { left: 20%; background: #10b981; }
.confetti:nth-child(5) { left: 25%; background: #3b82f6; }
.confetti:nth-child(6) { left: 30%; background: #f59e0b; }
.confetti:nth-child(7) { left: 35%; background: #3b82f6; }
.confetti:nth-child(8) { left: 40%; background: #1f2937; }
.confetti:nth-child(9) { left: 45%; background: #3b82f6; }
.confetti:nth-child(10) { left: 50%; background: #ef4444; }
.confetti:nth-child(11) { left: 55%; background: #3b82f6; }
.confetti:nth-child(12) { left: 60%; background: #1f2937; }
.confetti:nth-child(13) { left: 65%; background: #3b82f6; }
.confetti:nth-child(14) { left: 70%; background: #8b5cf6; }
.confetti:nth-child(15) { left: 75%; background: #3b82f6; }
.confetti:nth-child(16) { left: 80%; background: #1f2937; }
.confetti:nth-child(17) { left: 85%; background: #3b82f6; }
.confetti:nth-child(18) { left: 90%; background: #ec4899; }
.confetti:nth-child(19) { left: 95%; background: #3b82f6; }
.confetti:nth-child(20) { left: 98%; background: #1f2937; }

@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg) scale(0.5);
    opacity: 0;
  }
}

.victory-card {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 2px solid #3b82f6;
  border-radius: 16px;
  padding: 3rem 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.3);
  animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 1001;
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
  animation: fadeInScale 0.8s ease-out;
}

.victory-title.winner-glow {
  animation: fadeInScale 0.8s ease-out, winner-glow 2s ease-in-out infinite 0.8s;
}

.victory-score {
  font-size: 1.5rem;
  color: #9ca3af;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 2rem;
  animation: fadeIn 0.8s ease-out 0.2s both;
}

.player-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.player-card {
  background: rgba(55, 65, 81, 0.5);
  border: 2px solid #4b5563;
  border-radius: 12px;
  padding: 1.25rem 1rem;
  transition: all 0.3s ease;
  animation: slideInCard 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:nth-child(2) {
    animation-delay: 0.1s;
  }
}

.player-card.winner-card {
  border: 2px solid #fbbf24;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
}

.player-card.winner-highlight {
  animation: slideInCard 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), winner-pulse 1s ease-in-out infinite 0.8s;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  justify-content: center;
}

.player-name {
  font-weight: 600;
  color: #e5e7eb;
  font-size: 0.95rem;
}

.rating-display {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rating-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #d1d5db;
}

.rating-before,
.rating-after {
  font-weight: 600;
}

.rating-arrow {
  color: #9ca3af;
  font-size: 0.85rem;
}

.rating-change {
  font-weight: 700;
  font-size: 1.1rem;
  animation: fadeIn 0.8s ease-out 0.4s both;
}

.rating-unavailable {
  font-size: 0.85rem;
  color: #9ca3af;
  font-style: italic;
}

.dismiss-btn {
  width: 100%;
  margin-top: 1.5rem;
  animation: fadeIn 0.8s ease-out 0.5s both;
}

@keyframes slideInBounce {
  0% {
    transform: translateY(-100px) scale(0.9);
    opacity: 0;
  }
  60% {
    transform: translateY(10px);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes slideInCard {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes winner-glow {
  0%, 100% {
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
  }
  50% {
    text-shadow: 0 0 40px rgba(59, 130, 246, 0.9), 0 0 60px rgba(251, 191, 36, 0.5);
  }
}

@keyframes winner-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
  }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .victory-card,
  .victory-title,
  .player-card,
  .confetti {
    animation-duration: 0.1ms !important;
    animation-iteration-count: 1 !important;
  }

  .confetti {
    display: none;
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .victory-card {
    padding: 2rem 1.5rem;
    max-width: 90vw;
  }

  .victory-title {
    font-size: 2rem;
  }

  .victory-score {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .player-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .player-card {
    padding: 1rem;
  }
}
</style>
