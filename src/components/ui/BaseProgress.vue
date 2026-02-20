<script setup lang="ts">
defineProps<{
  value: number  // 0-100
  label?: string
}>()
</script>

<template>
  <div class="progress-wrap">
    <div v-if="label" class="progress-label">{{ label }}</div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${Math.min(100, Math.max(0, value))}%` }" />
    </div>
    <span class="progress-pct">{{ Math.round(value) }}%</span>
  </div>
</template>

<style scoped>
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-label {
  font-size: 11px;
  color: var(--text-3);
  min-width: 0;
  flex: 1;
}
.progress-track {
  flex: 1;
  height: 4px;
  background: var(--bg-5);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 100ms linear;
}
.progress-pct {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text-3);
  min-width: 32px;
  text-align: right;
}
</style>
