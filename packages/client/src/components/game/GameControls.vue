<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isMyTurn: boolean;
  status: string;
  canPlay: boolean;
}>();

const emit = defineEmits<{
  (e: 'pass'): void;
  (e: 'resign'): void;
  (e: 'accept-score'): void;
}>();

const showResignConfirm = ref(false);

function handlePass() {
  emit('pass');
}

function handleResign() {
  showResignConfirm.value = true;
}

function confirmResign() {
  emit('resign');
  showResignConfirm.value = false;
}

function cancelResign() {
  showResignConfirm.value = false;
}

function handleAcceptScore() {
  emit('accept-score');
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Controls</h3>

    <div v-if="status === 'active'" class="space-y-3">
      <button
        @click="handlePass"
        :disabled="!isMyTurn || !canPlay"
        class="w-full btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Pass
      </button>

      <button
        v-if="!showResignConfirm"
        @click="handleResign"
        :disabled="!canPlay"
        class="w-full btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Resign
      </button>

      <div v-else class="space-y-2">
        <p class="text-sm text-center text-gray-400">Are you sure you want to resign?</p>
        <div class="flex gap-2">
          <button @click="confirmResign" class="flex-1 btn btn-danger">
            Yes, Resign
          </button>
          <button @click="cancelResign" class="flex-1 btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="status === 'scoring'" class="space-y-3">
      <p class="text-sm text-gray-400 text-center">
        Click on dead stone groups to mark them. Both players must accept the score to finish.
      </p>
      <button
        @click="handleAcceptScore"
        class="w-full btn btn-primary"
      >
        Accept Score
      </button>
    </div>

    <div v-else-if="status === 'waiting'" class="text-center text-gray-400">
      <p>Waiting for opponent to join...</p>
    </div>

    <div v-else-if="status === 'finished'" class="text-center text-gray-400">
      <p>Game has ended</p>
    </div>
  </div>
</template>
