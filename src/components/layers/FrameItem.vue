<script setup lang="ts">
import type { Frame } from '@/types/frame'

defineProps<{
  frame: Frame
  active: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  click: []
  delete: []
  duplicate: []
}>()
</script>

<template>
  <div
    class="frame-item"
    :class="{ 'is-active': active }"
    @click="emit('click')"
  >
    <div class="frame-icon">
      <svg viewBox="0 0 10 10" width="10" height="10" fill="none">
        <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1"/>
      </svg>
    </div>
    <span class="frame-name">{{ frame.name }}</span>
    <span class="frame-dims">{{ frame.width }}×{{ frame.height }}</span>
    <div class="frame-actions">
      <button class="act-btn" title="Duplicate frame" @click.stop="emit('duplicate')">
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
          <rect x="3" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1"/>
          <rect x="1" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1" fill="var(--bg-2)"/>
        </svg>
      </button>
      <button
        v-if="canDelete"
        class="act-btn is-danger"
        title="Delete frame"
        @click.stop="emit('delete')"
      >
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
          <path d="M2 3h6M4 3V2h2v1M4.5 5v2.5M5.5 5v2.5M3 3l.5 5h3L7 3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.frame-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background var(--ease);
  &:hover { background: var(--bg-4); }
  &:hover .frame-actions { opacity: 1; }
  &.is-active { background: var(--accent-s); }
  &.is-active .frame-icon svg { color: var(--accent); }
}
.frame-icon {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-5);
  flex-shrink: 0;
  svg { color: var(--text-3); }
}
.frame-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--text-1);
}
.frame-dims {
  font-size: 0.5625rem;
  color: var(--text-4);
  font-family: var(--mono);
  flex-shrink: 0;
}
.frame-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity var(--ease);
}
.act-btn {
  width: 1.125rem;
  height: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-3);
  cursor: pointer;
  border-radius: var(--r-sm);
  padding: 0;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-2); }
  &.is-danger:hover { color: var(--red); }
}
</style>
