<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { GroupElement } from '@/types/elements'
import PanelHeader from '@/components/layout/PanelHeader.vue'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

interface LayerTreeItem {
  id: string
  rowType: 'frame' | 'element' | 'empty'
  frameId: string
  depth: number
  isLast: boolean
  parentIsLast: boolean[]
}

// ── Frames ────────────────────────────────────────────────────
const sortedFrames = computed(() => [...editor.frames].sort((a, b) => a.order - b.order))

const expandedGroups = ref<Set<string>>(new Set())
const expandedFrames = ref<Set<string>>(new Set())

watch(() => ui.activeFrameId, (id) => {
  if (id) {
    const s = new Set(expandedFrames.value)
    s.add(id)
    expandedFrames.value = s
  }
}, { immediate: true })

function toggleFrameExpand(frameId: string) {
  const s = new Set(expandedFrames.value)
  if (s.has(frameId)) s.delete(frameId)
  else s.add(frameId)
  expandedFrames.value = s
}

function toggleExpand(id: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedGroups.value = next
}

function getTopLevelForFrame(frameId: string) {
  return [...editor.getTopLevelElementsForFrame(frameId)].reverse()
}

function isAnimated(id: string): boolean {
  return editor.keyframes.some(kf => kf.elementId === id)
}

function isMaskGroup(id: string): boolean {
  const el = editor.getElementById(id)
  return el?.type === 'group' && (el as GroupElement).hasMask === true
}

function isMaskShape(id: string): boolean {
  return editor.elements.some(
    g => g.type === 'group' && (g as GroupElement).hasMask && (g as GroupElement).childIds[0] === id
  )
}

function addFrame() {
  const newId = editor.addFrame()
  const frame = editor.frames.find(f => f.id === newId)
  if (frame) { ui.setActiveFrame(newId); timeline.syncFromFrame(frame) }
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
    if (first) { ui.setActiveFrame(first.id); timeline.syncFromFrame(first) }
  }
}

function onDuplicateFrame(frameId: string) {
  const newId = editor.duplicateFrame(frameId)
  const frame = editor.frames.find(f => f.id === newId)
  if (frame) { ui.setActiveFrame(newId); timeline.syncFromFrame(frame) }
}

function onElementClick(elId: string, frameId: string, e: MouseEvent) {
  if (ui.activeFrameId !== frameId) {
    const frame = editor.frames.find(f => f.id === frameId)
    if (frame) { ui.setActiveFrame(frameId); timeline.syncFromFrame(frame) }
  }
  if (e.shiftKey) ui.toggleSelection(elId)
  else ui.select(elId)
}

function toggleVis(id: string) {
  const el = editor.getElementById(id)
  if (el) editor.updateElement(id, { visible: !el.visible })
}

// ── Drag-to-reorder ───────────────────────────────────────────
const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(id: string) { draggingId.value = id }
function onDragOver(id: string) { if (id !== draggingId.value) dragOverId.value = id }
function onDragEnd() { draggingId.value = null; dragOverId.value = null }

function onDrop(targetId: string) {
  if (!draggingId.value || draggingId.value === targetId) return
  const elems = editor.elements
  const fromIdx = elems.findIndex(e => e.id === draggingId.value)
  const toIdx   = elems.findIndex(e => e.id === targetId)
  if (fromIdx === -1 || toIdx === -1) return
  editor.reorderElement(draggingId.value, toIdx)
  draggingId.value = null
  dragOverId.value = null
}

// ── Layer tree (flat list with depth metadata) ────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenElements(elements: any[], frameId: string, depth: number, parentIsLast: boolean[], result: LayerTreeItem[]) {
  elements.forEach((el, idx) => {
    const isLast = idx === elements.length - 1
    result.push({ id: el.id, rowType: 'element', frameId, depth, isLast, parentIsLast: [...parentIsLast] })
    if (el.type === 'group' && expandedGroups.value.has(el.id)) {
      const children = [...(el as GroupElement).childIds]
        .reverse()
        .map((id: string) => editor.getElementById(id))
        .filter(Boolean)
      flattenElements(children, frameId, depth + 1, [...parentIsLast, isLast], result)
    }
  })
}

const layerTree = computed<LayerTreeItem[]>(() => {
  const result: LayerTreeItem[] = []
  sortedFrames.value.forEach((frame, frameIdx) => {
    result.push({
      id: frame.id,
      rowType: 'frame',
      frameId: frame.id,
      depth: 0,
      isLast: frameIdx === sortedFrames.value.length - 1,
      parentIsLast: [],
    })
    if (expandedFrames.value.has(frame.id)) {
      const topLevel = getTopLevelForFrame(frame.id)
      if (topLevel.length === 0) {
        result.push({ id: `empty-${frame.id}`, rowType: 'empty', frameId: frame.id, depth: 1, isLast: true, parentIsLast: [] })
      } else {
        flattenElements(topLevel, frame.id, 1, [], result)
      }
    }
  })
  return result
})

// ── Type icons (inline SVG strings, v-html safe — hardcoded) ──
const TYPE_ICONS: Record<string, string> = {
  rect:    `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1"/></svg>`,
  circle:  `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1"/></svg>`,
  ellipse: `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3" stroke="currentColor" stroke-width="1"/></svg>`,
  text:    `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 3h8M6 3v6M4 9h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  path:    `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 9C3 6 5 3 6 3C7 3 9 6 10 9" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/></svg>`,
  group:   `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><rect x="1.5" y="1.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1"/><rect x="6.5" y="1.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1"/><rect x="1.5" y="6.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1"/></svg>`,
  line:    `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 10L10 2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  polygon: `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M6 1.5L10.5 9.5H1.5Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`,
  star:    `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M6 1.5l1.1 3.4H10.6L8 7.1l.9 3.4L6 8.7l-2.9 1.8.9-3.4L1.4 4.9H4.9Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`,
  image:   `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1"/><circle cx="4" cy="4.5" r="1" fill="currentColor"/><path d="M1.5 8l2.5-2.5 2 2 1.5-1.5 2.5 2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  video:   `<svg viewBox="0 0 12 12" width="10" height="10" fill="none"><rect x="1" y="2.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/><path d="M8 5l3-1.5v5L8 7" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}

function typeIcon(elType: string): string {
  return TYPE_ICONS[elType] ?? TYPE_ICONS.rect
}
</script>

<template>
  <div class="panel">
    <PanelHeader title="Layers"/>

    <div class="body">
      <div class="section-head">
        <span class="section-label">Frames</span>
        <button class="adder" title="Add frame" @click="addFrame">
          <svg viewBox="0 0 10 10" width="10" height="10" fill="none">
            <path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <template v-for="item in layerTree" :key="item.id">

        <!-- ── Frame row ─────────────────────────────────────── -->
        <div
          v-if="item.rowType === 'frame'"
          class="frame-header"
          :class="{ 'is-active': item.id === ui.activeFrameId }"
          @click="onFrameClick(item.id)"
        >
          <button class="expand-btn" @click.stop="toggleFrameExpand(item.id)">
            <svg
              :class="{ 'is-open': expandedFrames.has(item.id) }"
              width="8" height="8" viewBox="0 0 8 8" fill="none"
            >
              <path d="M2 1.5L6 4L2 6.5" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <svg class="frame-icon" viewBox="0 0 12 12" width="10" height="10" fill="none">
            <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1"/>
          </svg>
          <span class="frame-name">{{ editor.frames.find(f => f.id === item.id)?.name }}</span>
          <span class="frame-dims">
            {{ editor.frames.find(f => f.id === item.id)?.width }}×{{ editor.frames.find(f => f.id === item.id)?.height }}
          </span>
          <button class="frame-action" title="Duplicate frame" @click.stop="onDuplicateFrame(item.id)">
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
              <rect x="3" y="1" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1"/>
              <rect x="1" y="3" width="8" height="8" rx="1" fill="var(--bg-2)" stroke="currentColor" stroke-width="1"/>
            </svg>
          </button>
          <button
            v-if="editor.frames.length > 1"
            class="frame-action is-danger"
            title="Delete frame"
            @click.stop="onDeleteFrame(item.id)"
          >
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
              <path d="M2 3h8M5 3V2h2v1M5 5v4M7 5v4M3 3l.5 7h5l.5-7"
                    stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- ── Empty frame hint ──────────────────────────────── -->
        <div v-else-if="item.rowType === 'empty'" class="empty-hint">
          No layers — draw a shape to start
        </div>

        <!-- ── Element row ───────────────────────────────────── -->
        <div
          v-else
          class="tree-row"
          :class="{
            'is-selected': ui.selectedIds.has(item.id),
            'is-drag-over': dragOverId === item.id,
            'is-mask-group': isMaskGroup(item.id),
          }"
          :draggable="item.depth === 1 && item.frameId === ui.activeFrameId ? 'true' : 'false'"
          @click="onElementClick(item.id, item.frameId, $event)"
          @dragstart="item.depth === 1 && item.frameId === ui.activeFrameId ? onDragStart(item.id) : undefined"
          @dragover.prevent="item.depth === 1 && item.frameId === ui.activeFrameId ? onDragOver(item.id) : undefined"
          @drop.prevent="item.depth === 1 && item.frameId === ui.activeFrameId ? onDrop(item.id) : undefined"
          @dragend="onDragEnd"
        >
          <!-- Tree connector lines -->
          <div class="tree-lines">
            <div
              v-for="d in item.depth - 1"
              :key="d"
              class="tree-indent"
              :class="{ 'has-line': !item.parentIsLast[d - 1] }"
            />
            <div class="tree-branch" :class="{ 'is-last': item.isLast }" />
          </div>

          <!-- Expand toggle (groups) or fixed-width spacer -->
          <button
            v-if="editor.getElementById(item.id)?.type === 'group'"
            class="expand-btn"
            @click.stop="toggleExpand(item.id)"
          >
            <svg
              :class="{ 'is-open': expandedGroups.has(item.id) }"
              width="8" height="8" viewBox="0 0 8 8" fill="none"
            >
              <path d="M2 1.5L6 4L2 6.5" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-else class="expand-spacer" />

          <!-- Type icon -->
          <span
            class="el-icon"
            :class="{ 'is-mask-shape': isMaskShape(item.id) }"
            v-html="typeIcon(editor.getElementById(item.id)?.type ?? 'rect')"
          />

          <!-- Layer name -->
          <span class="el-name">{{ editor.getElementById(item.id)?.name }}</span>

          <!-- Animated indicator dot -->
          <span v-if="isAnimated(item.id)" class="anim-dot" title="Has keyframes" />

          <!-- Visibility button -->
          <button
            class="vis-btn"
            :class="{ 'is-hidden': !editor.getElementById(item.id)?.visible }"
            :title="editor.getElementById(item.id)?.visible ? 'Hide layer' : 'Show layer'"
            @click.stop="toggleVis(item.id)"
          >
            <svg v-if="editor.getElementById(item.id)?.visible !== false" viewBox="0 0 12 12" width="10" height="10" fill="none">
              <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" stroke-width="1"/>
              <circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1"/>
            </svg>
            <svg v-else viewBox="0 0 12 12" width="10" height="10" fill="none">
              <path d="M2 2l8 8M4.5 3.3C5 3.1 5.5 3 6 3c3 0 5 3 5 3s-.7 1.2-1.9 2.1M7.5 8.7C7 8.9 6.5 9 6 9c-3 0-5-3-5-3s.7-1.2 1.9-2.1"
                    stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

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
  position: relative;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

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

/* ── Footer ─────────────────────────────────────────────────── */
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
  &:hover { color: var(--text-2); background: var(--bg-4); }
}

/* ── Add frame button ────────────────────────────────────────── */
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

/* ── Frame rows ──────────────────────────────────────────────── */
.frame-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.875rem;
  padding: 0 0.25rem 0 0.375rem;
  cursor: pointer;
  transition: background var(--ease);
  &:hover { background: var(--bg-4); }
  &:hover .frame-action { opacity: 1; }
  &.is-active { background: var(--accent-s); }
  &.is-active .frame-name { color: var(--text-1); }
}

.expand-btn {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-4);
  display: flex;
  align-items: center;
  justify-content: center;
  svg { transition: transform 150ms var(--ease); }
  svg.is-open { transform: rotate(90deg); }
}

.frame-icon { color: var(--text-4); flex-shrink: 0; }

.frame-name {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.frame-dims {
  font-size: 0.5625rem;
  color: var(--text-4);
  font-family: var(--mono);
  flex-shrink: 0;
}

.frame-action {
  opacity: 0;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-danger:hover { color: var(--red); }
}

/* ── Empty frame hint ────────────────────────────────────────── */
.empty-hint {
  padding: 0.375rem 0.5rem 0.375rem 1.375rem;
  font-size: 0.5625rem;
  color: var(--text-4);
  font-style: italic;
}

/* ── Element tree rows ───────────────────────────────────────── */
.tree-row {
  display: flex;
  align-items: center;
  height: 1.75rem;
  padding-right: 0.25rem;
  cursor: pointer;
  transition: background var(--ease);
  user-select: none;
  &:hover { background: var(--bg-3); }
  &:hover .vis-btn { opacity: 1; }
  &.is-selected { background: var(--accent-s); }
  &.is-selected .el-name { color: var(--text-1); }
  &.is-drag-over { background: var(--bg-5); outline: 1px solid var(--accent); outline-offset: -1px; }
}

/* ── Tree connector lines ────────────────────────────────────── */
.tree-lines {
  display: flex;
  flex-shrink: 0;
  align-self: stretch;
  /* Left margin so the root-level branch starts a bit from the left edge */
  margin-left: 0.625rem;
}

.tree-indent {
  width: 0.75rem;
  flex-shrink: 0;
  position: relative;
  /* │ line when ancestor is not last */
  &.has-line::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }
}

.tree-branch {
  width: 0.75rem;
  flex-shrink: 0;
  position: relative;
  /* Vertical segment of ├─ or └─ */
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    width: 1px;
    background: var(--border);
  }
  /* ├─ not last: full vertical line */
  &:not(.is-last)::before { bottom: 0; }
  /* └─ last: line goes only to midpoint */
  &.is-last::before { bottom: 50%; }
  /* Horizontal connector →  */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: calc(50% - 0.5px);
    right: 0;
    height: 1px;
    background: var(--border);
  }
}

/* ── Element row contents ────────────────────────────────────── */
.expand-spacer {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.el-icon {
  flex-shrink: 0;
  color: var(--text-4);
  display: flex;
  align-items: center;
  margin-left: 0.125rem;
  margin-right: 0.25rem;
  &.is-mask-shape { color: var(--accent); }
}

.el-name {
  flex: 1;
  font-size: 0.6875rem;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.anim-dot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-right: 0.125rem;
}

.vis-btn {
  opacity: 0;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  transition: all var(--ease);
  &.is-hidden { opacity: 1; color: var(--text-4); }
  &:hover { color: var(--text-1); background: var(--bg-5); }
}
</style>
