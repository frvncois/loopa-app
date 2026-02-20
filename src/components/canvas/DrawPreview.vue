<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'

defineProps<{
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}>()

const ui = useUiStore()
</script>

<template>
  <rect
    v-if="visible"
    :x="x"
    :y="y"
    :width="Math.max(width, 1)"
    :height="Math.max(height, 1)"
    class="draw-preview"
    :rx="ui.currentTool === 'circle' ? Math.min(width, height) / 2 : 0"
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
