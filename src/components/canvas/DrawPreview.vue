<script setup lang="ts">
defineProps<{
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}>()
</script>

<template>
  <rect
    v-if="visible"
    :x="x"
    :y="y"
    :width="Math.max(width, 1)"
    :height="Math.max(height, 1)"
    class="draw-preview"
    :rx="0"
  />
</template>

<style scoped>
.draw-preview {
  fill: var(--accent-s);
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  pointer-events: none;
}
</style>
