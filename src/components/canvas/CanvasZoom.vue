<script setup lang="ts">
import IconZoomOut from '@/components/icons/IconZoomOut.vue'
import IconZoomIn from '@/components/icons/IconZoomIn.vue'
defineProps<{ zoom: number }>()
const emit = defineEmits<{ zoomIn: []; zoomOut: []; reset: [] }>()
</script>

<template>
  <div class="zoom">
    <button class="button is-ghost is-icon is-xs" title="Zoom out ([)" @click="emit('zoomOut')">
      <IconZoomOut />
    </button>
    <button class="button is-ghost is-xs pct" title="Reset zoom (0)" @click="emit('reset')">
      {{ Math.round(zoom * 100) }}%
    </button>
    <button class="button is-ghost is-icon is-xs" title="Zoom in (])" @click="emit('zoomIn')">
      <IconZoomIn />
    </button>
  </div>
</template>

<style scoped>
.zoom {
  position: absolute;
  bottom: 0.625rem;
  right: 0.625rem;
  display: flex;
  gap: 1px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 0.125rem;
}
.button {
  height: 1.25rem;
  padding: 0 0.3125rem;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ease);
  font-size: 0.625rem;
  &:hover { background: var(--bg-4); color: var(--text-1); }
  &.is-icon { width: 1.375rem; }
}
.pct { font-family: var(--mono); min-width: 2.5rem; }
</style>
