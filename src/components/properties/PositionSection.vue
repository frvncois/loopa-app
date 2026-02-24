<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'

const editor = useEditorStore()
const ui = useUiStore()

const getAnimatedEl = inject<(id: string) => Element | null>(
  'getAnimatedElement',
  (id) => editor.getElementById(id) ?? null
)
const setAnimatedProp = inject<(id: string, props: Partial<AnimatableProps>) => void>(
  'setAnimatedProperty',
  (id, props) => editor.updateElement(id, props)
)

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return getAnimatedEl([...ui.selectedIds][0]) ?? null
})

function update(key: 'x' | 'y', val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { [key]: num })
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="row">
      <span class="label">X</span>
      <input class="field" type="number" :value="Math.round(el.x)" @change="update('x', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Y</span>
      <input class="field" type="number" :value="Math.round(el.y)" @change="update('y', ($event.target as HTMLInputElement).value)" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem 0.625rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
</style>
