<script setup lang="ts">
import { useResizablePanel } from '@/composables/useResizablePanel'
import { useUiStore } from '@/stores/uiStore'
import { watch } from 'vue'

const props = defineProps<{
  side: 'left' | 'right' | 'bottom'
  min: number
  max: number
  defaultSize: number
}>()

const uiStore = useUiStore()
const { size, onResizeStart } = useResizablePanel(props.side, props.min, props.max, props.defaultSize)

// Sync to uiStore
watch(size, val => {
  if (props.side === 'left') uiStore.setPanelWidth('left', val)
  else if (props.side === 'right') uiStore.setPanelWidth('right', val)
  else uiStore.setPanelWidth('bottomHeight', val)
}, { immediate: true })
</script>

<template>
  <div
    class="wrap"
    :class="`is-${side}`"
    :style="side === 'bottom'
      ? { height: `${size}px`, minHeight: `${size}px` }
      : { width: `${size}px`, minWidth: `${size}px` }"
  >
    <slot />
    <div
      class="handle"
      :class="`is-${side}`"
      @mousedown.prevent="onResizeStart"
    />
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &.is-left { flex-direction: row; }
  &.is-right { flex-direction: row; }
}

.handle {
  position: absolute;
  z-index: 10;
  transition: background var(--ease);
  &:hover, &:active { background: var(--accent); }
  &.is-left { top: 0; right: 0; width: 0.25rem; height: 100%; cursor: col-resize; }
  &.is-right { top: 0; left: 0; width: 0.25rem; height: 100%; cursor: col-resize; }
  &.is-bottom { top: 0; left: 0; right: 0; height: 0.25rem; cursor: row-resize; }
}
</style>
