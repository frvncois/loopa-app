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

const shadow = computed(() => el.value?.shadows[0] ?? null)
function updateShadow(key: string, val: any) {
  if (!el.value) return
  const shadows = [...el.value.shadows]
  shadows[0] = { ...shadows[0], [key]: val, visible: true }
  editor.updateElement(el.value.id, { shadows })
}
</script>

<template>
  <div v-if="el && shadow" class="section">
    <div class="title">Shadow</div>
    <div class="row">
      <span class="label">Offset</span>
      <input class="field is-pair" type="number" :value="shadow.x" @change="updateShadow('x', parseFloat(($event.target as HTMLInputElement).value))" />
      <input class="field is-pair" type="number" :value="shadow.y" @change="updateShadow('y', parseFloat(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="row">
      <span class="label">Blur</span>
      <input class="field" type="number" :value="shadow.blur" min="0" @change="updateShadow('blur', parseFloat(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="row">
      <span class="label">Opacity</span>
      <input class="field" type="number" :value="Math.round(shadow.opacity * 100)" min="0" max="100"
        @change="updateShadow('opacity', parseFloat(($event.target as HTMLInputElement).value) / 100)" />
    </div>
    <div class="row">
      <span class="label">Color</span>
      <ColorInput :model-value="shadow.color" @update:model-value="v => updateShadow('color', v)" />
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
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
</style>
