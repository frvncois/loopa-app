<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { PathElement } from '@/types/elements'
import type { usePathEditor } from '@/composables/usePathEditor'

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
  // Recompute d
  import('@/lib/path/PathBuilder').then(({ pathPointsToD }) => {
    editor.updateElement(el.id, { d: pathPointsToD(el.points, closed) } as any)
  })
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
  <div v-if="selectedEl" class="insp-section">
    <div class="insp-title">Path</div>

    <!-- Meta row -->
    <div class="insp-row">
      <span class="insp-label">Points</span>
      <span class="meta-val">{{ selectedEl.points.length }}</span>
    </div>

    <!-- Closed toggle -->
    <div class="insp-row">
      <span class="insp-label">Closed</span>
      <input type="checkbox" :checked="selectedEl.closed" @change="toggleClosed" />
    </div>

    <!-- Fill rule -->
    <div class="insp-row">
      <span class="insp-label">Fill rule</span>
      <select class="insp-select" :value="selectedEl.fillRule" @change="e => setFillRule((e.target as HTMLSelectElement).value)">
        <option value="nonzero">Nonzero</option>
        <option value="evenodd">Even-odd</option>
      </select>
    </div>

    <!-- Edit mode toggle -->
    <div class="insp-row" style="margin-top: 4px">
      <button v-if="!ui.pathEditMode" class="edit-btn" @click="enterEditMode">Enter Edit Mode</button>
      <button v-else class="edit-btn is-active" @click="exitEditMode">Exit Edit Mode</button>
    </div>

    <!-- Selected point details (only in edit mode with a point selected) -->
    <template v-if="ui.pathEditMode && selectedPt && pathEditor">
      <div class="pt-divider" />
      <div class="insp-title">Point</div>

      <div class="insp-row">
        <span class="insp-label">X</span>
        <input
          class="insp-input"
          type="number"
          :value="Math.round(selectedPt.x)"
          @change="e => updatePtX(+(e.target as HTMLInputElement).value)"
        />
        <span class="insp-label" style="padding-left: 6px">Y</span>
        <input
          class="insp-input"
          type="number"
          :value="Math.round(selectedPt.y)"
          @change="e => updatePtY(+(e.target as HTMLInputElement).value)"
        />
      </div>

      <div class="insp-row">
        <span class="insp-label">Type</span>
        <select class="insp-select" :value="selectedPt.type" @change="e => setPtType((e.target as HTMLSelectElement).value)">
          <option value="corner">Corner</option>
          <option value="smooth">Smooth</option>
          <option value="symmetric">Symmetric</option>
        </select>
      </div>

      <div class="insp-row" style="margin-top: 4px">
        <button class="edit-btn is-danger" @click="pathEditor.deleteSelectedPoint()">Delete Point</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.insp-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.insp-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 6px;
}
.insp-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  margin-bottom: 2px;
}
.insp-label {
  font-size: 11px;
  color: var(--text-3);
  width: 56px;
  flex-shrink: 0;
}
.meta-val {
  font-size: 11px;
  color: var(--text-2);
  font-family: var(--mono);
}
.insp-input {
  width: 56px;
  height: 22px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-size: 11px;
  font-family: var(--mono);
  padding: 0 4px;
  text-align: right;
}
.insp-select {
  height: 22px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-size: 11px;
  padding: 0 4px;
  flex: 1;
}
.edit-btn {
  height: 22px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  font-size: 11px;
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
  margin: 8px 0;
}
</style>
