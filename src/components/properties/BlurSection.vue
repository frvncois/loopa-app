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
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Blur</div>
    <div class="row">
      <span class="label">Radius</span>
      <input class="field" type="number" :value="el.blur" min="0"
        @change="setAnimatedProp([...ui.selectedIds][0], { blur: parseFloat(($event.target as HTMLInputElement).value) })" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.575rem; font-weight: 600; text-transform: uppercase; color: var(--text-2); margin-bottom: 0.5rem; letter-spacing: 0.07em;}
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
</style>
