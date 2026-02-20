<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{
  modelValue: string
  options: { value: string; label?: string; title?: string; icon?: Component }[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="toggle-group">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="toggle-btn"
      :class="{ active: modelValue === opt.value }"
      :title="opt.title ?? opt.label"
      @click="emit('update:modelValue', opt.value)"
    >
      <span v-if="opt.label && !opt.icon">{{ opt.label }}</span>
      <component v-else-if="opt.icon" :is="opt.icon" />
    </button>
  </div>
</template>

<style scoped>
.toggle-group {
  display: flex;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  flex: 1;
}
.toggle-btn {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--ease);
  padding: 0;
  font-size: 11px;
}
.toggle-btn:hover { color: var(--text-2); background: var(--bg-4); }
.toggle-btn.active { color: var(--text-1); background: var(--bg-5); }
.toggle-btn + .toggle-btn { border-left: 1px solid var(--border); }
</style>
