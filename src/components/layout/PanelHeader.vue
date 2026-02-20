<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="header">
    <span>{{ title }}</span>
    <slot />
  </div>
</template>

<style scoped>
.header {
  height: 2.125rem;
  min-height: 2.125rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.625rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
}
</style>
