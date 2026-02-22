<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { PathElement } from '@/types/elements'
import type { usePathEditor } from '@/composables/usePathEditor'
import { pathPointsToD } from '@/lib/path/PathBuilder'
import BaseToggle from '@/components/ui/BaseToggle.vue'

const editor = useEditorStore()
const ui = useUiStore()

const pathEditor = inject<ReturnType<typeof usePathEditor> | undefined>('pathEditor', undefined)

const selectedEl = computed((): PathElement | null => {
  const ids = [...ui.selectedIds]
  if (ids.length !== 1) return null
  const el = editor.elements.find(e => e.id === ids[0])
  return el?.type === 'path' ? (el as PathElement) : null
})

function toggleClosed() {
  if (!selectedEl.value) return
  const el = selectedEl.value
  const closed = !el.closed
  editor.updateElement(el.id, { closed } as any)
  editor.updateElement(el.id, { d: pathPointsToD(el.points, closed) } as any)
}

function setFillRule(val: string) {
  if (!selectedEl.value) return
  editor.updateElement(selectedEl.value.id, { fillRule: val } as any)
}

function enterEditMode() {
  if (!selectedEl.value) return
  ui.enterPathEditMode(selectedEl.value.id)
}

function exitEditMode() {
  ui.exitPathEditMode()
  if (pathEditor) pathEditor.editingPointId.value = null
}

const selectedPt = computed(() => pathEditor?.selectedPoint.value ?? null)

function updatePtX(val: number) {
  if (!selectedPt.value || !pathEditor) return
  pathEditor.updatePoint(selectedPt.value.id, { x: val })
}

function updatePtY(val: number) {
  if (!selectedPt.value || !pathEditor) return
  pathEditor.updatePoint(selectedPt.value.id, { y: val })
}

function setPtType(val: string) {
  if (!selectedPt.value || !pathEditor) return
  pathEditor.updatePoint(selectedPt.value.id, { type: val as any })
}
</script>

<template>
  <div v-if="selectedEl" class="section">
    <div class="title">Path</div>

    <div class="row">
      <span class="label">Points</span>
      <span class="meta-val">{{ selectedEl.points.length }}</span>
    </div>

    <BaseToggle :model-value="selectedEl.closed" label="Closed" @update:model-value="toggleClosed" />

    <div class="row">
      <span class="label">Fill rule</span>
      <select class="select" :value="selectedEl.fillRule" @change="e => setFillRule((e.target as HTMLSelectElement).value)">
        <option value="nonzero">Nonzero</option>
        <option value="evenodd">Even-odd</option>
      </select>
    </div>

    <div class="row" style="margin-top: 0.25rem">
      <button v-if="!ui.pathEditMode" class="edit-btn" @click="enterEditMode">Enter Edit Mode</button>
      <button v-else class="edit-btn is-active" @click="exitEditMode">Exit Edit Mode</button>
    </div>

    <template v-if="ui.pathEditMode && selectedPt && pathEditor">
      <div class="pt-divider" />
      <div class="title">Point</div>

      <div class="row">
        <span class="label">X</span>
        <input
          class="field is-pair"
          type="number"
          :value="Math.round(selectedPt.x)"
          @change="e => updatePtX(+(e.target as HTMLInputElement).value)"
        />
        <span class="label" style="padding-left: 0.375rem">Y</span>
        <input
          class="field is-pair"
          type="number"
          :value="Math.round(selectedPt.y)"
          @change="e => updatePtY(+(e.target as HTMLInputElement).value)"
        />
      </div>

      <div class="row">
        <span class="label">Type</span>
        <select class="select" :value="selectedPt.type" @change="e => setPtType((e.target as HTMLSelectElement).value)">
          <option value="corner">Corner</option>
          <option value="smooth">Smooth</option>
          <option value="symmetric">Symmetric</option>
        </select>
      </div>

      <div class="row" style="margin-top: 0.25rem">
        <button class="edit-btn is-danger" @click="pathEditor.deleteSelectedPoint()">Delete Point</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.375rem; }
.row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.375rem;
  margin-bottom: 0.125rem;
}
.label {
  font-size: 0.6875rem;
  color: var(--text-3);
  width: 3.5rem;
  flex-shrink: 0;
}
.meta-val {
  font-size: 0.6875rem;
  color: var(--text-2);
  font-family: var(--mono);
}
.field {
  height: 1.375rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-size: 0.6875rem;
  font-family: var(--mono);
  padding: 0 0.25rem;
  outline: none;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 3.5rem; flex: none; }
}
.select {
  height: 1.375rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-size: 0.6875rem;
  padding: 0 0.25rem;
  flex: 1;
  outline: none;
}
.edit-btn {
  height: 1.375rem;
  padding: 0 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-active { background: var(--accent-s); border-color: var(--accent); color: var(--accent); }
  &.is-danger { color: var(--red); border-color: transparent; background: transparent; }
  &.is-danger:hover { background: var(--red-s); }
}
.pt-divider {
  height: 1px;
  background: var(--border);
  margin: 0.5rem 0;
}
</style>
