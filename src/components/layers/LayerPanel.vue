<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import PanelHeader from '@/components/layout/PanelHeader.vue'
import LayerItem from './LayerItem.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { createDefaultElement } from '@/lib/elements/ElementFactory'
import type { ElementType } from '@/types/elements'
import IconRect from '@/components/icons/IconRect.vue'
import IconCircle from '@/components/icons/IconCircle.vue'
import IconText from '@/components/icons/IconText.vue'
import IconPen from '@/components/icons/IconPen.vue'

const editor = useEditorStore()
const ui = useUiStore()

// Reverse order so top layers appear first (index 0 = visually on top)
const reversedElements = computed(() => [...editor.elements].reverse())

function isAnimated(id: string): boolean {
  return editor.keyframes.some(kf => kf.elementId === id)
}

function addQuick(type: ElementType) {
  const el = createDefaultElement(type)
  editor.addElement(el)
  ui.select(el.id)
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

  // LayerPanel shows elements in REVERSE order.
  // editor.elements[0] is bottom-most layer.
  // "drop on targetId" means: place draggingId ABOVE targetId in visual list
  // = place at lower array index than targetId.
  const elems = editor.elements
  const fromIdx = elems.findIndex(e => e.id === draggingId.value)
  const toIdx   = elems.findIndex(e => e.id === targetId)
  if (fromIdx === -1 || toIdx === -1) return

  // In reversed display: drag-over = insert ABOVE target visually = higher index in array
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
    <PanelHeader title="Layers">
      <div style="display:flex;gap:0.125rem">
        <button class="adder" title="Add Rectangle" @click="addQuick('rect')">
          <IconRect />
        </button>
        <button class="adder" title="Add Circle" @click="addQuick('circle')">
          <IconCircle />
        </button>
        <button class="adder" title="Add Text" @click="addQuick('text')">
          <IconText />
        </button>
        <button class="adder" title="Add Path" @click="addQuick('path')">
          <IconPen />
        </button>
      </div>
    </PanelHeader>

    <div class="body">
      <EmptyState v-if="editor.elements.length === 0" title="No layers" subtitle="Draw a shape to get started" />

      <LayerItem
        v-for="el in reversedElements"
        :key="el.id"
        :element="el"
        :selected="ui.selectedIds.has(el.id)"
        :animated="isAnimated(el.id)"
        :drag-over="dragOverId === el.id"
        @click="e => e.shiftKey ? ui.toggleSelection(el.id) : ui.select(el.id)"
        @toggle-visibility="toggleVis(el.id)"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drop="onDrop"
        @dragend="onDragEnd"
      />
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
