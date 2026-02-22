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

const fill = computed(() => el.value?.fills[0] ?? null)

function updateColor(color: string) {
  if (!el.value || !fill.value) return
  setAnimatedProp([...ui.selectedIds][0], { fillColor: color })
}
</script>

<template>
  <div v-if="el && fill" class="section">
    <div class="title">Fill</div>
    <div class="row">
      <span class="label">Color</span>
      <ColorInput :model-value="fill.color" @update:model-value="updateColor" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.575rem; font-weight: 600; text-transform: uppercase; color: var(--text-2); margin-bottom: 0.5rem; letter-spacing: 0.07em;}
.row { display: flex; align-items: center; gap: 0.375rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
</style>
