<script setup lang="ts">
import IconDragHandle from '@/components/icons/IconDragHandle.vue'
defineEmits<{ dragStart: [e: MouseEvent] }>()
</script>

<template>
  <div class="drag-handle" @mousedown.stop="$emit('dragStart', $event)">
    <IconDragHandle />
  </div>
</template>

<style scoped>
.drag-handle {
  width: 16px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-4);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--ease);
}
.drag-handle:hover { color: var(--text-3); }
</style>
