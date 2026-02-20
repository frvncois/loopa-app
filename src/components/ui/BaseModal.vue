<script setup lang="ts">
import { Teleport } from 'vue'
import IconClose from '@/components/icons/IconClose.vue'

defineProps<{
  open: boolean
  title: string
  width?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" role="dialog" :aria-label="title" aria-modal="true" @click.self="emit('close')" @keydown.escape="emit('close')">
        <div class="box" :style="{ width: width ?? '26.25rem' }">
          <div class="header">
            <span class="title">{{ title }}</span>
            <button class="close" aria-label="Close dialog" @click="emit('close')">
              <IconClose />
            </button>
          </div>
          <div class="body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.box {
  background: var(--bg-2);
  border: 1px solid var(--border-l);
  border-radius: var(--r-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 80vh;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
}
.title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-1);
}
.close {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  border-radius: var(--r-sm);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
}
.body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 140ms cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-active .box,
.modal-leave-active .box {
  transition: transform 140ms cubic-bezier(0.4, 0, 0.2, 1), opacity 140ms cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .box,
.modal-leave-to .box {
  transform: scale(0.97) translateY(-4px);
  opacity: 0;
}
</style>
