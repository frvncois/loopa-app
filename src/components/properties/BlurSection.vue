<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const hasBlur = computed(() => (el.value?.blur ?? 0) > 0)
</script>

<template>
  <div v-if="el" class="section">
    <label class="title" :class="{ 'is-collapsed': !hasBlur }">
      <input
        type="checkbox"
        :checked="hasBlur"
        @change="editor.updateElement(el!.id, { blur: ($event.target as HTMLInputElement).checked ? 4 : 0 })"
      />
      Blur
    </label>
    <div v-if="hasBlur" class="row" style="margin-top:0.5rem">
      <span class="label">Radius</span>
      <input class="field" type="number" :value="el.blur" min="0"
        @change="editor.updateElement(el!.id, { blur: parseFloat(($event.target as HTMLInputElement).value) })" />
    </div>
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
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.6875rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
</style>
