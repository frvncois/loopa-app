<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'accent' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  icon?: boolean
  active?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="button"
    :class="[
      variant === 'accent' ? 'is-accent' : variant === 'ghost' ? 'is-ghost' : variant === 'danger' ? 'is-danger' : '',
      size === 'xs' ? 'is-xs' : size === 'sm' ? 'is-sm' : '',
      icon ? 'is-icon' : '',
      active ? 'is-active' : ''
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.button {
  height: 1.625rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.6875rem;
  white-space: nowrap;
  transition: all var(--ease);
}
.button:hover:not(:disabled) { background: var(--bg-5); color: var(--text-1); border-color: var(--border-l); }
.button.is-active { background: var(--accent-s); color: var(--accent); border-color: var(--accent); }
.button:disabled { opacity: 0.4; cursor: not-allowed; }
.button.is-icon { width: 1.75rem; padding: 0; }
.button.is-ghost { border-color: transparent; background: transparent; }
.button.is-ghost:hover:not(:disabled) { background: var(--bg-4); border-color: transparent; }
.button.is-accent { background: var(--accent); color: #fff; border-color: var(--accent); }
.button.is-accent:hover:not(:disabled) { background: var(--accent-h); }
.button.is-sm { height: 1.5rem; padding: 0 0.4375rem; font-size: 0.6875rem; }
.button.is-sm.is-icon { width: 1.625rem; }
.button.is-xs { height: 1.25rem; padding: 0 0.3125rem; font-size: 0.625rem; }
.button.is-xs.is-icon { width: 1.375rem; }
.button.is-danger { color: var(--red); }
.button.is-danger:hover:not(:disabled) { background: var(--red-s); border-color: var(--red); }
</style>
