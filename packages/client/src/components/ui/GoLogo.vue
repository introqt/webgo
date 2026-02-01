<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: number | string;
  }>(),
  {
    size: 40,
  }
);
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 40 40" class="inline-block">
    <defs>
      <radialGradient id="blackGradient" cx="35%" cy="35%">
        <stop offset="0%" style="stop-color:#2a2a2a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
      </radialGradient>
      <radialGradient id="whiteGradient" cx="35%" cy="35%">
        <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#d0d0d0;stop-opacity:1" />
      </radialGradient>
    </defs>

    <!-- Top-left: Black -->
    <circle cx="10" cy="10" r="7" fill="url(#blackGradient)" />

    <!-- Top-right: White -->
    <circle cx="30" cy="10" r="7" fill="url(#whiteGradient)" stroke="#999" stroke-width="0.5" />

    <!-- Bottom-left: White -->
    <circle cx="10" cy="30" r="7" fill="url(#whiteGradient)" stroke="#999" stroke-width="0.5" />

    <!-- Bottom-right: Black -->
    <circle cx="30" cy="30" r="7" fill="url(#blackGradient)" />
  </svg>
</template>
