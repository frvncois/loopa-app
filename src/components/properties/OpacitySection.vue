<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { AnimatableProps } from '@/types/animation'
import type { Element } from '@/types/elements'

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
  return getAnimatedEl([...ui.selectedIds][0])
})

const blendModes = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
]

function updateOpacity(val: string) {
  const num = Math.min(100, Math.max(0, parseFloat(val)))
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { opacity: num / 100 })
}

function updateBlendMode(val: string) {
  if (!el.value) return
  editor.updateElement(el.value.id, { blendMode: val })
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="row">
      <span class="label is-bold">Opacity</span>
      <input
        class="field"
        type="number"
        min="0" max="100"
        :value="Math.round((el.opacity ?? 1) * 100)"
        style="width:3.5rem;min-width:3.5rem;flex:none"
        @change="updateOpacity(($event.target as HTMLInputElement).value)"
      />
      <select
        class="blend-select"
        :value="el.blendMode ?? 'normal'"
        @change="updateBlendMode(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="m in blendModes" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.row { display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem; }
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: var(--text-3);
  font-weight: 500;
  &.is-bold { font-weight: 600; color: var(--text-2); }
}
.field {
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
}
.blend-select {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.25rem;
  font-size: 0.75rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.25rem center;
  padding-right: 1.25rem;
  min-width: 0;
}
</style>
