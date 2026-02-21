<script setup lang="ts">
import IconEmpty from '@/components/icons/IconEmpty.vue'
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="empty">
    <div class="icon">
      <slot name="icon">
        <IconEmpty />
      </slot>
    </div>
    <p class="title">{{ title }}</p>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  gap: 0.5rem;
}
.icon { color: var(--text-4); margin-bottom: 0.25rem; }
.title { font-size: 0.75rem; font-weight: 500; color: var(--text-3); }
.subtitle { font-size: 0.75rem; color: var(--text-4); }
.action { margin-top: 0.5rem; }
</style>
