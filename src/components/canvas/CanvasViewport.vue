<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import type { useCanvas } from '@/composables/useCanvas'
import type { useDrawTool } from '@/composables/useDrawTool'
import type { useElementDrag } from '@/composables/useElementDrag'
import type { useElementResize } from '@/composables/useElementResize'
import type { useSelection } from '@/composables/useSelection'
import type { usePenTool } from '@/composables/usePenTool'
import type { usePathEditor } from '@/composables/usePathEditor'
import type { PathElement } from '@/types/elements'
import CanvasArtboard from './CanvasArtboard.vue'
import CanvasGrid from './CanvasGrid.vue'
import ElementRenderer from './ElementRenderer.vue'
import SelectionOverlay from './SelectionOverlay.vue'
import MarqueeSelect from './MarqueeSelect.vue'
import DrawPreview from './DrawPreview.vue'
import OnionSkinLayer from './OnionSkinLayer.vue'
import PenToolOverlay from './PenToolOverlay.vue'
import PathPointHandle from './PathPointHandle.vue'
import IconZoomOut from '@/components/icons/IconZoomOut.vue'
import IconZoomIn from '@/components/icons/IconZoomIn.vue'

const props = defineProps<{
  canvas: ReturnType<typeof useCanvas>
  drawTool: ReturnType<typeof useDrawTool>
  elementDrag: ReturnType<typeof useElementDrag>
  elementResize: ReturnType<typeof useElementResize>
  selection: ReturnType<typeof useSelection>
  penTool: ReturnType<typeof usePenTool>
  pathEditor: ReturnType<typeof usePathEditor>
  artboardWidth: number
  artboardHeight: number
}>()

const ui = useUiStore()
const editor = useEditorStore()
const timeline = useTimelineStore()

const viewportEl = ref<HTMLElement>()

// Compute animated props per element, reactive to currentFrame
const animatedPropsMap = computed(() => {
  const frame = timeline.currentFrame
  const map = new Map<string, ReturnType<typeof computeElementAtFrame>>()
  for (const el of editor.elements) {
    const kfs = editor.keyframes.filter(kf => kf.elementId === el.id)
    if (kfs.length > 0) map.set(el.id, computeElementAtFrame(kfs, frame))
  }
  return map
})

const cursorX = ref(0)
const cursorY = ref(0)

// Marquee state
const marquee = ref({ x: 0, y: 0, width: 0, height: 0, visible: false })
let marqueeStart = { x: 0, y: 0 }

// Path being edited
const editingPath = computed((): PathElement | null => {
  if (!ui.pathEditMode || !ui.editingPathId) return null
  const el = editor.elements.find(e => e.id === ui.editingPathId)
  return el?.type === 'path' ? (el as PathElement) : null
})

function onMouseDown(e: MouseEvent) {
  const target = e.target as SVGElement
  const isBackground = target === viewportEl.value?.querySelector('svg')
    || target.classList.contains('artboard')

  // ── Pen tool: delegate ALL clicks ──
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasMouseDown(e)
    return
  }

  // ── Path edit mode: clicks on background deselect point ──
  if (ui.pathEditMode) {
    if (isBackground) {
      props.pathEditor.editingPointId.value = null
    }
    return
  }

  if (!isBackground) return

  if (ui.currentTool === 'hand') {
    props.canvas.startPan(e)
    return
  }

  if (ui.currentTool === 'select') {
    ui.clearSelection()
    const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
    marqueeStart = pos
    marquee.value = { x: pos.x, y: pos.y, width: 0, height: 0, visible: true }
    document.addEventListener('mousemove', onMarqueeMove)
    document.addEventListener('mouseup', onMarqueeUp)
    return
  }

  // Shape draw tools
  props.drawTool.onCanvasDown(e)
}

function onMarqueeMove(e: MouseEvent) {
  const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
  marquee.value.width  = pos.x - marqueeStart.x
  marquee.value.height = pos.y - marqueeStart.y
}

function onMarqueeUp() {
  document.removeEventListener('mousemove', onMarqueeMove)
  document.removeEventListener('mouseup', onMarqueeUp)
  if (Math.abs(marquee.value.width) > 4 || Math.abs(marquee.value.height) > 4) {
    props.selection.marqueeSelect({
      x: marqueeStart.x,
      y: marqueeStart.y,
      width:  marquee.value.width,
      height: marquee.value.height
    })
  }
  marquee.value.visible = false
}

function onMouseMove(e: MouseEvent) {
  const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
  cursorX.value = pos.x
  cursorY.value = pos.y
  props.penTool.onCanvasMouseMove(e)
}

function onDblClick(e: MouseEvent) {
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasDblClick(e)
  }
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  ui.showContextMenu(e.clientX, e.clientY)
}

function onElementMouseDown(e: MouseEvent, id: string) {
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasMouseDown(e)
    return
  }
  if (ui.pathEditMode) return
  props.elementDrag.onElementMouseDown(e, id)
  onElementClick(e, id)
}

function onElementDblClick(e: MouseEvent, id: string) {
  const el = editor.elements.find(el => el.id === id)
  if (el?.type === 'path') {
    e.stopPropagation()
    ui.select(id)
    ui.enterPathEditMode(id)
  }
}

function onElementClick(e: MouseEvent, id: string) {
  if (e.shiftKey) ui.toggleSelection(id)
  else ui.select(id)
}

defineExpose({ viewportEl })
</script>

<template>
  <div
    ref="viewportEl"
    class="c-viewport"
    :style="{
      cursor: ui.currentTool === 'hand'
        ? 'grab'
        : ui.currentTool === 'pen' || ui.pathEditMode
          ? 'crosshair'
          : ui.currentTool === 'select'
            ? 'default'
            : 'crosshair'
    }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @dblclick="onDblClick"
    @wheel.prevent="canvas.onWheel"
    @contextmenu="onContextMenu"
  >
    <svg
      :viewBox="canvas.viewBox.value"
      xmlns="http://www.w3.org/2000/svg"
      style="position:absolute;inset:0;width:100%;height:100%"
    >
      <CanvasArtboard :width="artboardWidth" :height="artboardHeight" />
      <CanvasGrid v-if="ui.showGrid" :artboard-width="artboardWidth" :artboard-height="artboardHeight" />

      <!-- Onion skin ghost frames (below elements) -->
      <OnionSkinLayer />

      <!-- Elements -->
      <ElementRenderer
        v-for="el in editor.elements"
        :key="el.id"
        :element="el"
        :animated-props="animatedPropsMap.get(el.id)"
        @mousedown.stop="(e: MouseEvent) => onElementMouseDown(e, el.id)"
        @dblclick.stop="(e: MouseEvent) => onElementDblClick(e, el.id)"
      />

      <!-- Selection overlay (hidden in path edit mode) -->
      <SelectionOverlay
        v-if="selection.selectionBounds.value && !ui.pathEditMode"
        :bounds="selection.selectionBounds.value"
        @resize-start="(e, h) => elementResize.onResizeStart(e, h, [...ui.selectedIds][0])"
      />

      <!-- Marquee -->
      <MarqueeSelect v-bind="marquee" />

      <!-- Shape draw preview -->
      <DrawPreview v-bind="drawTool.drawPreview" />

      <!-- Pen tool overlay -->
      <PenToolOverlay
        v-if="ui.currentTool === 'pen' && penTool.isDrawingPath.value"
        :pen-tool="penTool"
      />

      <!-- Path edit handles -->
      <PathPointHandle
        v-if="ui.pathEditMode && editingPath"
        :path="editingPath"
        :path-editor="pathEditor"
      />
    </svg>

    <!-- HUD overlays -->
    <div class="c-info">
      <span>{{ Math.round(canvas.zoom.value * 100) }}%</span>
      <span>{{ Math.round(cursorX) }}, {{ Math.round(cursorY) }}</span>
    </div>
    <div class="c-zoom">
      <button class="z-btn" @click="canvas.zoomOut">
        <IconZoomOut />
      </button>
      <button class="z-btn z-pct" @click="canvas.resetZoom">{{ Math.round(canvas.zoom.value * 100) }}%</button>
      <button class="z-btn" @click="canvas.zoomIn">
        <IconZoomIn />
      </button>
    </div>
  </div>
</template>

<style scoped>
.c-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(67, 83, 255, .04) 0%, transparent 65%),
    var(--bg-1);
  user-select: none;
}
.c-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--mono);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 3px 9px;
  pointer-events: none;
}
.c-zoom {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 1px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 2px;
}
.z-btn {
  height: 20px;
  padding: 0 5px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-family: var(--mono);
  transition: all var(--ease);
}
.z-btn:hover { background: var(--bg-4); color: var(--text-1); }
.z-pct { min-width: 40px; }
</style>
