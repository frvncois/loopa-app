<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import ColorInput from '@/components/ui/ColorInput.vue'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const stroke = computed(() => el.value?.strokes[0] ?? null)
function updateStroke(key: string, val: any) {
  if (!el.value) return
  const strokes = [...el.value.strokes]
  strokes[0] = { ...strokes[0], [key]: val, visible: true }
  editor.updateElement(el.value.id, { strokes })
}
</script>

<template>
  <div v-if="el && stroke" class="section">
    <div class="title">Stroke</div>
    <div class="row">
      <span class="label">Weight</span>
      <input class="field" type="number" :value="stroke.width" min="0"
        @change="updateStroke('width', parseFloat(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="row">
      <span class="label">Color</span>
      <ColorInput :model-value="stroke.color" @update:model-value="v => updateStroke('color', v)" />
    </div>
    <div class="row">
      <span class="label">Position</span>
      <select class="select" :value="stroke.position" @change="updateStroke('position', ($event.target as HTMLSelectElement).value)">
        <option value="center">Centered</option>
        <option value="inside">Inside</option>
        <option value="outside">Outside</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 1.25rem 0 0.375rem; font-size: 0.75rem; outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.375rem center;
}
</style>
