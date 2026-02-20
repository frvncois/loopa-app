<script setup lang="ts">
defineProps<{
  zoom: number
  cursorX: number
  cursorY: number
}>()
</script>

<template>
  <div class="c-info">
    <span>{{ Math.round(zoom * 100) }}%</span>
    <span>{{ Math.round(cursorX) }}, {{ Math.round(cursorY) }}</span>
  </div>
</template>

<style scoped>
.c-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--mono);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 3px 9px;
  pointer-events: none;
}
</style>
