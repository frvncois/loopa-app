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

</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Blur</div>
    <div class="row">
      <span class="label">Radius</span>
      <input class="field" type="number" :value="el.blur" min="0"
        @change="editor.updateElement(el!.id, { blur: parseFloat(($event.target as HTMLInputElement).value) })" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
</style>
