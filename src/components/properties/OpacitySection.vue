<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import IconBlend from '@/components/icons/IconBlend.vue'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

function updateOpacity(val: string) {
  const num = Math.min(100, Math.max(0, parseFloat(val)))
  if (!isNaN(num)) editor.updateElement([...ui.selectedIds][0], { opacity: num / 100 })
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
      <button class="blend" title="Blend mode">
        <IconBlend />
      </button>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.row { display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem; }
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.6875rem;
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
  font-size: 0.6875rem;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
}
.blend {
  width: 1.75rem;
  height: 1.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
}
</style>
