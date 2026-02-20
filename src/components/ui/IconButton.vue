<script setup lang="ts">
defineProps<{
  title?: string
  size?: 'xs' | 'sm' | 'md'
  active?: boolean
  ghost?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="icon-btn"
    :class="[
      size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md',
      ghost ? 'ghost' : '',
      active ? 'active' : ''
    ]"
    :title="title"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  cursor: pointer;
  transition: all var(--ease);
  flex-shrink: 0;
}
.icon-btn:hover:not(:disabled) { background: var(--bg-5); color: var(--text-1); border-color: var(--border-l); }
.icon-btn.active { background: var(--accent-s); color: var(--accent); border-color: var(--accent); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.icon-btn.ghost { border-color: transparent; background: transparent; }
.icon-btn.ghost:hover:not(:disabled) { background: var(--bg-4); border-color: transparent; }

.icon-btn.md { width: 28px; height: 26px; }
.icon-btn.sm { width: 26px; height: 24px; }
.icon-btn.xs { width: 22px; height: 20px; }
</style>
