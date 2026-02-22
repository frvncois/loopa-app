<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { AnimatableProps } from '@/types/animation'
import type { Element } from '@/types/elements'
import ColorInput from '@/components/ui/ColorInput.vue'

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

const shadow = computed(() => el.value?.shadows[0] ?? null)

function updateOffsetX(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { shadowOffsetX: num })
}
function updateOffsetY(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { shadowOffsetY: num })
}
function updateBlur(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { shadowBlur: num })
}
function updateOpacity(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { shadowOpacity: num / 100 })
}
function updateColor(color: string) {
  setAnimatedProp([...ui.selectedIds][0], { shadowColor: color })
}
</script>

<template>
  <div v-if="el && shadow" class="section">
    <div class="title">Shadow</div>
    <div class="row">
      <span class="label">Offset</span>
      <input class="field is-pair" type="number" :value="shadow.x"
        @change="updateOffsetX(($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="shadow.y"
        @change="updateOffsetY(($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Blur</span>
      <input class="field" type="number" :value="shadow.blur" min="0"
        @change="updateBlur(($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Opacity</span>
      <input class="field" type="number" :value="Math.round(shadow.opacity * 100)" min="0" max="100"
        @change="updateOpacity(($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Color</span>
      <ColorInput :model-value="shadow.color" @update:model-value="updateColor" />
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
</style>
