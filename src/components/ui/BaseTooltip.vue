<script setup lang="ts">
defineProps<{
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()
</script>

<template>
  <div class="tooltip-wrap">
    <slot />
    <div class="tooltip" :class="position ?? 'top'">{{ text }}</div>
  </div>
</template>

<style scoped>
.tooltip-wrap {
  position: relative;
  display: inline-flex;
}
.tooltip {
  position: absolute;
  background: var(--bg-6);
  border: 1px solid var(--border-l);
  color: var(--text-1);
  font-size: 10px;
  padding: 3px 7px;
  border-radius: var(--r-sm);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--ease);
  z-index: 500;
}
.tooltip.top { bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
.tooltip.bottom { top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
.tooltip.left { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
.tooltip.right { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
.tooltip-wrap:hover .tooltip { opacity: 1; }
</style>
