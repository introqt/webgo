<script setup lang="ts">
import { computed } from 'vue';
import type { StoneColor, UserPublic } from '@webgo/shared';

const props = defineProps<{
  blackPlayer: UserPublic | null;
  whitePlayer: UserPublic | null;
  currentTurn: StoneColor;
  myColor: StoneColor | null;
  captures: { black: number; white: number };
  status: string;
  winner?: StoneColor | 'draw' | null;
  finalScore?: { black: number; white: number } | null;
}>();

const turnIndicator = computed(() => {
  if (props.status === 'finished') {
    if (props.winner === 'draw') return 'Draw!';
    return `${props.winner === 'black' ? 'Black' : 'White'} wins!`;
  }
  if (props.status === 'scoring') return 'Scoring phase - mark dead stones';
  if (props.status === 'waiting') return 'Waiting for opponent...';
  return props.currentTurn === 'black' ? "Black's turn" : "White's turn";
});

const isMyTurnText = computed(() => {
  if (props.status !== 'active') return '';
  if (!props.myColor) return '';
  return props.currentTurn === props.myColor ? '(Your turn)' : '';
});
</script>

<template>
  <div class="card space-y-4">
    <h3 class="text-lg font-semibold text-center">
      {{ turnIndicator }}
      <span v-if="isMyTurnText" class="text-blue-400 text-sm">{{ isMyTurnText }}</span>
    </h3>

    <!-- Players -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Black player -->
      <div
        :class="[
          'p-3 rounded-lg border-2 transition-colors',
          currentTurn === 'black' && status === 'active'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700',
        ]"
      >
        <div class="flex items-center gap-2 mb-2">
          <div class="w-6 h-6 rounded-full bg-stone-black border border-gray-600"></div>
          <span class="font-medium">Black</span>
          <span v-if="myColor === 'black'" class="text-xs text-blue-400">(You)</span>
        </div>
        <div v-if="blackPlayer" class="text-sm text-gray-400">
          {{ blackPlayer.username }}
          <span class="text-xs">({{ blackPlayer.rating }})</span>
        </div>
        <div v-else class="text-sm text-gray-500">Waiting...</div>
        <div class="text-sm mt-1">
          Captures: <span class="font-mono">{{ captures.black }}</span>
        </div>
        <div v-if="finalScore" class="text-sm mt-1 font-semibold">
          Score: {{ finalScore.black }}
        </div>
      </div>

      <!-- White player -->
      <div
        :class="[
          'p-3 rounded-lg border-2 transition-colors',
          currentTurn === 'white' && status === 'active'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700',
        ]"
      >
        <div class="flex items-center gap-2 mb-2">
          <div class="w-6 h-6 rounded-full bg-stone-white border border-gray-400"></div>
          <span class="font-medium">White</span>
          <span v-if="myColor === 'white'" class="text-xs text-blue-400">(You)</span>
        </div>
        <div v-if="whitePlayer" class="text-sm text-gray-400">
          {{ whitePlayer.username }}
          <span class="text-xs">({{ whitePlayer.rating }})</span>
        </div>
        <div v-else class="text-sm text-gray-500">Waiting...</div>
        <div class="text-sm mt-1">
          Captures: <span class="font-mono">{{ captures.white }}</span>
        </div>
        <div v-if="finalScore" class="text-sm mt-1 font-semibold">
          Score: {{ finalScore.white }}
        </div>
      </div>
    </div>
  </div>
</template>
