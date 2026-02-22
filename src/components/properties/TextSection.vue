<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { TextElement, Element } from '@/types/elements'
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
  const e = getAnimatedEl([...ui.selectedIds][0])
  return e?.type === 'text' ? (e as TextElement) : null
})

function update(key: string, val: any) {
  if (!el.value) return
  if (key === 'fontSize') {
    const num = parseFloat(val)
    if (!isNaN(num)) setAnimatedProp(el.value.id, { fontSize: num })
  } else {
    editor.updateElement(el.value.id, { [key]: val })
  }
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Text</div>
    <div class="row">
      <span class="label">Content</span>
      <input class="field" type="text" :value="el.text" @change="update('text', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Font size</span>
      <input class="field is-pair" type="number" :value="el.fontSize" min="1" @change="update('fontSize', parseFloat(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="row">
      <span class="label">Weight</span>
      <select class="select" :value="String(el.fontWeight)" @change="update('fontWeight', parseInt(($event.target as HTMLSelectElement).value))">
        <option value="300">Light</option>
        <option value="400">Regular</option>
        <option value="500">Medium</option>
        <option value="600">Semibold</option>
        <option value="700">Bold</option>
      </select>
    </div>
    <div class="row">
      <span class="label">Align</span>
      <select class="select" :value="el.textAlign" @change="update('textAlign', ($event.target as HTMLSelectElement).value)">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.575rem; font-weight: 600; text-transform: uppercase; color: var(--text-2); margin-bottom: 0.5rem; letter-spacing: 0.07em;}
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
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 1.25rem 0 0.375rem; font-size: 0.75rem; outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.375rem center;
}
</style>
