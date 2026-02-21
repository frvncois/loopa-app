<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import PanelHeader from '@/components/layout/PanelHeader.vue'
import LayerItem from './LayerItem.vue'
import FrameItem from './FrameItem.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

// Frames in display order
const sortedFrames = computed(() => [...editor.frames].sort((a, b) => a.order - b.order))

// Top-level elements for the active frame, reversed for visual order
const reversedElements = computed(() => {
  if (!ui.activeFrameId) return []
  return [...editor.getTopLevelElementsForFrame(ui.activeFrameId)].reverse()
})

const expandedGroups = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedGroups.value = next
}

function isAnimated(id: string): boolean {
  return editor.keyframes.some(kf => kf.elementId === id)
}


function addFrame() {
  const newId = editor.addFrame()
  const frame = editor.frames.find(f => f.id === newId)
  if (frame) {
    ui.setActiveFrame(newId)
    timeline.syncFromFrame(frame)
  }
}

function onFrameClick(frameId: string) {
  if (ui.activeFrameId === frameId) return
  const frame = editor.frames.find(f => f.id === frameId)
  if (!frame) return
  ui.setActiveFrame(frameId)
  timeline.syncFromFrame(frame)
}

function onDeleteFrame(frameId: string) {
  const wasActive = ui.activeFrameId === frameId
  editor.deleteFrame(frameId)
  if (wasActive) {
    const first = editor.frames[0]
    if (first) {
      ui.setActiveFrame(first.id)
      timeline.syncFromFrame(first)
    }
  }
}

function onDuplicateFrame(frameId: string) {
  const newId = editor.duplicateFrame(frameId)
  const frame = editor.frames.find(f => f.id === newId)
  if (frame) {
    ui.setActiveFrame(newId)
    timeline.syncFromFrame(frame)
  }
}

function toggleVis(id: string) {
  const el = editor.getElementById(id)
  if (el) editor.updateElement(id, { visible: !el.visible })
}

// ── Drag-to-reorder ───────────────────────────────────────────
const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(id: string) {
  draggingId.value = id
}

function onDragOver(id: string) {
  if (id !== draggingId.value) dragOverId.value = id
}

function onDrop(targetId: string) {
  if (!draggingId.value || draggingId.value === targetId) return

  const elems = editor.elements
  const fromIdx = elems.findIndex(e => e.id === draggingId.value)
  const toIdx   = elems.findIndex(e => e.id === targetId)
  if (fromIdx === -1 || toIdx === -1) return

  const insertIdx = toIdx > fromIdx ? toIdx : toIdx
  editor.reorderElement(draggingId.value, insertIdx)

  draggingId.value = null
  dragOverId.value = null
}

function onDragEnd() {
  draggingId.value = null
  dragOverId.value = null
}
</script>

<template>
  <div class="panel">
    <PanelHeader title="Layers"/>

    <div class="body">
      <!-- Frames section -->
      <div class="section-head">
        <span class="section-label">Frames</span>
        <button class="adder" title="Add frame" @click="addFrame">
          <svg viewBox="0 0 10 10" width="10" height="10" fill="none">
            <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <FrameItem
        v-for="frame in sortedFrames"
        :key="frame.id"
        :frame="frame"
        :active="ui.activeFrameId === frame.id"
        :can-delete="editor.frames.length > 1"
        @click="onFrameClick(frame.id)"
        @delete="onDeleteFrame(frame.id)"
        @duplicate="onDuplicateFrame(frame.id)"
      />

      <!-- Elements for the active frame -->
      <div class="section-head" style="margin-top:0.25rem">
        <span class="section-label">Elements</span>
      </div>

      <EmptyState
        v-if="ui.activeFrameId && reversedElements.length === 0"
        title="No layers"
        subtitle="Draw a shape to get started"
      />

      <template v-for="el in reversedElements" :key="el.id">
        <LayerItem
          :element="el"
          :selected="ui.selectedIds.has(el.id)"
          :animated="isAnimated(el.id)"
          :drag-over="dragOverId === el.id"
          :expanded="expandedGroups.has(el.id)"
          :depth="0"
          @click="e => e.shiftKey ? ui.toggleSelection(el.id) : ui.select(el.id)"
          @toggle-visibility="toggleVis(el.id)"
          @toggle-expand="toggleExpand(el.id)"
          @drag-start="onDragStart"
          @drag-over="onDragOver"
          @drop="onDrop"
          @dragend="onDragEnd"
        />
        <!-- Group children shown when expanded -->
        <template v-if="el.type === 'group' && expandedGroups.has(el.id)">
          <LayerItem
            v-for="childId in [...(el as any).childIds].reverse()"
            :key="childId"
            :element="editor.getElementById(childId)!"
            :selected="ui.selectedIds.has(childId)"
            :animated="isAnimated(childId)"
            :drag-over="false"
            :depth="1"
            @click="e => e.shiftKey ? ui.toggleSelection(childId) : ui.select(childId)"
            @toggle-visibility="toggleVis(childId)"
          />
        </template>
      </template>
    </div>

    <div class="footer">
      <button class="shortcut-btn" @click="ui.openModal('shortcuts')" title="Keyboard shortcuts">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <line x1="6" y1="10" x2="6" y2="10.01" />
          <line x1="10" y1="10" x2="10" y2="10.01" />
          <line x1="14" y1="10" x2="14" y2="10.01" />
          <line x1="18" y1="10" x2="18" y2="10.01" />
          <line x1="8" y1="14" x2="16" y2="14" />
        </svg>
        Shortcuts
      </button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  flex: 1;
}
.body { flex: 1; overflow-y: auto; padding: 0.25rem; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem 0.125rem;
}
.section-label {
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-4);
}
.footer {
  padding: 0.375rem 0.5rem;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: none;
  background: none;
  color: var(--text-4);
  font-size: 0.625rem;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: color var(--ease), background var(--ease);
  &:hover {
    color: var(--text-2);
    background: var(--bg-4);
  }
}

.adder {
  width: 1.375rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-3);
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
}
</style>
