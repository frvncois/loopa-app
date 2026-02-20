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

const hasFill = computed(() => fill.value?.visible ?? false)

function toggleFill(checked: boolean) {
  if (!el.value || !fill.value) return
  const fills = [...el.value.fills]
  fills[0] = { ...fills[0], visible: checked }
  editor.updateElement(el.value.id, { fills })
}

function updateColor(color: string) {
  if (!el.value || !fill.value) return
  const fills = [...el.value.fills]
  fills[0] = { ...fills[0], color }
  editor.updateElement(el.value.id, { fills })
}
</script>

<template>
  <div v-if="el && fill" class="section">
    <label class="title" :class="{ 'is-collapsed': !hasFill }">
      <input type="checkbox" :checked="hasFill" @change="toggleFill(($event.target as HTMLInputElement).checked)" />
      Fill
    </label>
    <div v-if="hasFill" class="row" style="margin-top:0.5rem">
      <span class="label">Color</span>
      <ColorInput :model-value="fill.color" @update:model-value="updateColor" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 0;
  cursor: pointer;
  input[type="checkbox"] { width: 0.875rem; height: 0.875rem; accent-color: var(--accent); cursor: pointer; }
  &.is-collapsed { color: var(--text-3); }
}
.row { display: flex; align-items: center; gap: 0.375rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
</style>
