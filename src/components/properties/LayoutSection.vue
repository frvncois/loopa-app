<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  const id = [...ui.selectedIds][0]
  return editor.getElementById(id) ?? null
})

function update(key: string, val: string) {
  const id = [...ui.selectedIds][0]
  const num = parseFloat(val)
  if (!isNaN(num)) editor.updateElement(id, { [key]: num })
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Layout</div>

    <div class="row">
      <span class="label">Position</span>
      <input class="field is-pair" type="number" :value="Math.round(el.x)" @change="update('x', ($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="Math.round(el.y)" @change="update('y', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Size</span>
      <input class="field is-pair" type="number" :value="Math.round(el.width)" @change="update('width', ($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="Math.round(el.height)" @change="update('height', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Angle</span>
      <input class="field is-pair" type="number" :value="Math.round(el.rotation)" @change="update('rotation', ($event.target as HTMLInputElement).value)" />
    </div>
    <div v-if="el.type === 'rect'" class="row">
      <span class="label">Corner radius</span>
      <input class="field is-pair" type="number" :value="(el as any).rx ?? 0" @change="e => { update('rx', (e.target as HTMLInputElement).value); update('ry', (e.target as HTMLInputElement).value) }" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; white-space: nowrap; }
.field {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-family: var(--mono);
  font-size: 0.6875rem;
  outline: none;
  transition: border-color var(--ease);
  min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
</style>
