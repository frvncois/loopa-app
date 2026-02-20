<script setup lang="ts">
import type { Bounds } from '@/lib/elements/ElementBounds'

defineProps<{
  bounds: Bounds
}>()

const emit = defineEmits<{
  resizeStart: [e: MouseEvent, handle: string]
}>()

const HANDLES = [
  { id: 'nw', x: -4, y: -4 },
  { id: 'ne', x: 1, y: -4 },
  { id: 'sw', x: -4, y: 1 },
  { id: 'se', x: 1, y: 1 },
]
</script>

<template>
  <g class="selection-overlay">
    <!-- Dashed bounding rect -->
    <rect
      :x="bounds.x - 1"
      :y="bounds.y - 1"
      :width="bounds.width + 2"
      :height="bounds.height + 2"
      class="sel-box"
    />

    <!-- Corner handles -->
    <rect
      v-for="h in HANDLES"
      :key="h.id"
      :x="bounds.x + (h.x < 0 ? 0 : bounds.width) + h.x"
      :y="bounds.y + (h.y < 0 ? 0 : bounds.height) + h.y"
      width="8"
      height="8"
      rx="1.5"
      class="sel-handle"
      :style="{ cursor: `${h.id}-resize` }"
      @mousedown.stop="emit('resizeStart', $event, h.id)"
    />
  </g>
</template>

<style scoped>
.sel-box {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 5 4;
  pointer-events: none;
}
.sel-handle {
  fill: #fff;
  stroke: var(--accent);
  stroke-width: 1.5;
}
.sel-handle:hover { fill: var(--accent); }
</style>
