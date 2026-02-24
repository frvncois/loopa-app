<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  defaultOpen?: boolean
  storageKey?: string
  hasActivity?: boolean
}>()

const storageId = props.storageKey || `loopa_section_${props.title.toLowerCase().replace(/\s/g, '_')}`
const stored = localStorage.getItem(storageId)
const isOpen = ref(stored !== null ? stored === 'true' : (props.defaultOpen ?? false))

function toggle() {
  isOpen.value = !isOpen.value
  localStorage.setItem(storageId, String(isOpen.value))
}
</script>

<template>
  <div class="collapsible" :class="{ 'is-open': isOpen }">
    <button class="header" @click="toggle">
      <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 2 L7 5 L3 8" />
      </svg>
      <span class="title">{{ title }}</span>
      <slot name="badge" />
      <span v-if="hasActivity" class="dot" />
    </button>
    <div v-if="isOpen" class="body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.collapsible {
  border-bottom: 1px solid var(--border);
}

.header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.4375rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-2);
  font-size: 0.6875rem;
  font-weight: 600;
  text-align: left;
  transition: color 100ms var(--ease), background 100ms var(--ease);

  &:hover {
    color: var(--text-1);
    background: var(--bg-3);
  }
}

.chevron {
  flex-shrink: 0;
  color: var(--text-4);
  transition: transform 150ms var(--ease);

  .is-open & {
    transform: rotate(90deg);
  }
}

.title {
  flex: 1;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.body {
  padding: 0;
}
</style>
