<script setup lang="ts">
import { computed } from 'vue';
import type { Move } from '@webgo/shared';

const props = defineProps<{
  moves: Move[];
  boardSize: number;
}>();

// Convert position to Go notation (e.g., D4, Q16)
function positionToNotation(x: number, y: number): string {
  // Skip 'I' in column notation
  const col = String.fromCharCode(65 + (x >= 8 ? x + 1 : x));
  const row = props.boardSize - y;
  return `${col}${row}`;
}

const formattedMoves = computed(() => {
  return props.moves.map((move, index) => ({
    number: index + 1,
    color: move.color,
    notation: move.isPass
      ? 'Pass'
      : move.position
        ? positionToNotation(move.position.x, move.position.y)
        : '?',
    captures: move.capturedStones.length,
  }));
});

const recentMoves = computed(() => {
  return formattedMoves.value.slice(-20).reverse();
});
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-3">Move History</h3>

    <div v-if="recentMoves.length === 0" class="text-gray-500 text-sm text-center py-4">
      No moves yet
    </div>

    <div v-else class="max-h-48 overflow-y-auto space-y-1">
      <div
        v-for="move in recentMoves"
        :key="move.number"
        class="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-gray-700"
      >
        <span class="text-gray-500 w-8">{{ move.number }}.</span>
        <div
          class="w-4 h-4 rounded-full flex-shrink-0"
          :class="move.color === 'black' ? 'bg-stone-black' : 'bg-stone-white border border-gray-400'"
        ></div>
        <span class="font-mono">{{ move.notation }}</span>
        <span v-if="move.captures > 0" class="text-red-400 text-xs">
          +{{ move.captures }}
        </span>
      </div>
    </div>

    <div v-if="moves.length > 0" class="mt-2 pt-2 border-t border-gray-700 text-sm text-gray-500 text-center">
      {{ moves.length }} move{{ moves.length !== 1 ? 's' : '' }}
    </div>
  </div>
</template>
