<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  show: boolean
  x: number
  y: number
  items: {
    label: string
    shortcut?: string
    action: () => void
    separator?: boolean
    danger?: boolean
  }[]
}>()

const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="overlay" @click="emit('close')" @contextmenu.prevent="emit('close')" />
    <div v-if="show" class="menu" role="menu" :style="{ left: `${x}px`, top: `${y}px` }">
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.separator" class="separator" role="separator" />
        <button
          v-else
          class="item"
          :class="{ 'is-danger': item.danger }"
          role="menuitem"
          @click="item.action(); emit('close')"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.shortcut" class="shortcut" aria-hidden="true">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
}
.menu {
  position: fixed;
  z-index: 901;
  background: var(--bg-3);
  border: 1px solid var(--border-l);
  border-radius: var(--r-md);
  padding: 0.25rem;
  min-width: 10rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.3125rem 0.5rem;
  border-radius: var(--r-sm);
  font-size: 0.75rem;
  color: var(--text-2);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--ease);
  text-align: left;
  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-danger {
    color: var(--red);
    &:hover { background: var(--red-s); }
  }
}
.shortcut {
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-4);
  margin-left: 1rem;
}
.separator {
  height: 1px;
  background: var(--border);
  margin: 0.1875rem 0;
}
</style>
