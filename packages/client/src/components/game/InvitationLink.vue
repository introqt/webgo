<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  invitationCode: string;
}>();

const copied = ref(false);

const invitationUrl = computed(() => {
  return `${window.location.origin}/join/${props.invitationCode}`;
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(invitationUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-3">Invite a Friend</h3>
    <p class="text-sm text-gray-400 mb-3">
      Share this link with your friend to start playing:
    </p>

    <div class="flex gap-2">
      <input
        type="text"
        :value="invitationUrl"
        readonly
        class="input flex-1 text-sm"
      />
      <button
        @click="copyLink"
        class="btn btn-primary whitespace-nowrap"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>

    <div class="mt-3 text-center">
      <span class="text-gray-500 text-sm">Code: </span>
      <span class="font-mono text-lg font-bold text-blue-400">{{ invitationCode }}</span>
    </div>
  </div>
</template>
