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

const fill = computed(() => el.value?.fills[0] ?? null)

function updateColor(color: string) {
  if (!el.value || !fill.value) return
  const fills = [...el.value.fills]
  fills[0] = { ...fills[0], color, visible: true }
  editor.updateElement(el.value.id, { fills })
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
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row { display: flex; align-items: center; gap: 0.375rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
</style>
