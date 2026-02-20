<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  const el = editor.getElementById([...ui.selectedIds][0])
  return el?.type === 'rect' ? el : null
})
</script>

<template>
  <div v-if="el" class="section">
    <label class="title" :class="{ 'is-collapsed': !el.clipContent }">
      <input
        type="checkbox"
        :checked="el.clipContent"
        @change="editor.updateElement(el!.id, { clipContent: ($event.target as HTMLInputElement).checked })"
      />
      Clip content
    </label>
  </div>
</template>

<style scoped>
.section { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
.title {
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.6875rem; font-weight: 600; color: var(--text-2); cursor: pointer;
  input[type="checkbox"] { width: 0.875rem; height: 0.875rem; accent-color: var(--accent); cursor: pointer; }
  &.is-collapsed { color: var(--text-3); }
}
</style>
