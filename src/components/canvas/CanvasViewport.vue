<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import type { useCanvas } from '@/composables/useCanvas'
import type { useDrawTool } from '@/composables/useDrawTool'
import type { useElementDrag } from '@/composables/useElementDrag'
import type { useElementResize } from '@/composables/useElementResize'
import type { useElementRotate } from '@/composables/useElementRotate'
import type { useSelection } from '@/composables/useSelection'
import type { usePenTool } from '@/composables/usePenTool'
import type { usePathEditor } from '@/composables/usePathEditor'
import type { useCropTool } from '@/composables/useCropTool'
import type { useTransformOrigin } from '@/composables/useTransformOrigin'
import type { PathElement, GroupElement, ElementType, ImageElement } from '@/types/elements'
import { storeImage } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import CanvasArtboard from './CanvasArtboard.vue'
import CanvasGrid from './CanvasGrid.vue'
import ElementRenderer from './ElementRenderer.vue'
import MaskClipShape from './MaskClipShape.vue'
import CropOverlay from './CropOverlay.vue'
import SelectionOverlay from './SelectionOverlay.vue'
import MarqueeSelect from './MarqueeSelect.vue'
import DrawPreview from './DrawPreview.vue'
import PenToolOverlay from './PenToolOverlay.vue'
import PathPointHandle from './PathPointHandle.vue'
import IconZoomOut from '@/components/icons/IconZoomOut.vue'
import IconZoomIn from '@/components/icons/IconZoomIn.vue'

const props = defineProps<{
  canvas: ReturnType<typeof useCanvas>
  drawTool: ReturnType<typeof useDrawTool>
  elementDrag: ReturnType<typeof useElementDrag>
  elementResize: ReturnType<typeof useElementResize>
  elementRotate: ReturnType<typeof useElementRotate>
  selection: ReturnType<typeof useSelection>
  penTool: ReturnType<typeof usePenTool>
  pathEditor: ReturnType<typeof usePathEditor>
  cropTool: ReturnType<typeof useCropTool>
  transformOriginComposable?: ReturnType<typeof useTransformOrigin>
  artboardWidth: number
  artboardHeight: number
}>()

const ui = useUiStore()
const editor = useEditorStore()
const timeline = useTimelineStore()

const maskId = Math.random().toString(36).slice(2, 8)
const DRAW_TOOLS: ElementType[] = ['rect', 'circle', 'ellipse', 'line', 'polygon', 'star', 'text']

// viewportEl points to canvas-area (inset by ruler size) so that
// screenToSvg, viewBox, and fitToView all use the correct coordinate origin.
const viewportEl = ref<HTMLElement>()

// Active frame data
const activeFrame = computed(() =>
  ui.activeFrameId ? editor.frames.find(f => f.id === ui.activeFrameId) ?? null : null
)

const activeFrameTopLevel = computed(() =>
  ui.activeFrameId ? editor.getTopLevelElementsForFrame(ui.activeFrameId) : []
)

const activeFrameKeyframes = computed(() =>
  ui.activeFrameId ? editor.getKeyframesForFrame(ui.activeFrameId) : []
)

// Compute animated props per element, reactive to currentFrame
const animatedPropsMap = computed(() => {
  const frame = timeline.currentFrame
  const map = new Map<string, ReturnType<typeof computeElementAtFrame>>()
  for (const el of activeFrameTopLevel.value) {
    const kfs = activeFrameKeyframes.value.filter(kf => kf.elementId === el.id)
    if (kfs.length > 0) map.set(el.id, computeElementAtFrame(kfs, frame))
  }
  return map
})

// Animated rotation for the selection overlay — uses animated value at current frame,
// falls back to base element rotation when no rotation keyframes exist.
const selectionRotation = computed(() => {
  if (ui.selectedIds.size !== 1) return 0
  const id = [...ui.selectedIds][0]
  const animRot = animatedPropsMap.value.get(id)?.rotation
  if (animRot !== undefined) return animRot
  return props.selection.selectedElement.value?.rotation ?? 0
})

// Transform origin for single-selected element
const selectionTransformOrigin = computed(() => {
  if (ui.selectedIds.size !== 1) return undefined
  const id = [...ui.selectedIds][0]
  const anim = animatedPropsMap.value.get(id)
  const el = props.selection.selectedElement.value
  if (!el) return undefined
  return {
    x: (anim as any)?.transformOriginX ?? (el as any).transformOrigin?.x ?? 0.5,
    y: (anim as any)?.transformOriginY ?? (el as any).transformOrigin?.y ?? 0.5,
  }
})

function onOriginMouseDown(e: MouseEvent) {
  if (ui.selectedIds.size !== 1) return
  const id = [...ui.selectedIds][0]
  props.transformOriginComposable?.onOriginMouseDown(e, id)
}

// Mask elements in the active frame (for clipPath defs)
const maskElements = computed(() =>
  activeFrameTopLevel.value.filter(el => el.isMask)
)

// The element currently being cropped (for CropOverlay)
const cropElement = computed(() => {
  const id = props.cropTool.cropElementId.value
  if (!id) return null
  return editor.elements.find(e => e.id === id) ?? null
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

  // ── Shape draw tools: fire on any non-element click ──
  // Elements have @mousedown.stop so any event reaching here is not from an element.
  if (DRAW_TOOLS.includes(ui.currentTool as ElementType)) {
    props.drawTool.onCanvasDown(e)
    return
  }

  if (!isBackground) return

  // Exit group mode when clicking canvas background
  if (ui.activeGroupId) {
    ui.exitGroup()
    return
  }

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

// ── Canvas drag-drop for images ───────────────────────────────────────────────

function onDragOver(e: DragEvent) {
  const hasImage = Array.from(e.dataTransfer?.items ?? []).some(i => i.type.startsWith('image/'))
  if (hasImage) e.preventDefault()
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  const file = Array.from(e.dataTransfer?.files ?? []).find(f => f.type.startsWith('image/'))
  if (!file) return

  const frameId = ui.activeFrameId
  if (!frameId) return

  try {
    // Get natural dimensions
    const tempUrl = URL.createObjectURL(file)
    const img = new Image()
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = tempUrl
    })
    URL.revokeObjectURL(tempUrl)

    const iw = img.naturalWidth || 200
    const ih = img.naturalHeight || 200
    const frame = editor.frames.find(f => f.id === frameId)
    const fw = frame?.width ?? props.artboardWidth
    const fh = frame?.height ?? props.artboardHeight
    const scale = Math.min((fw * 0.8) / iw, (fh * 0.8) / ih, 1)
    const w = Math.round(iw * scale)
    const h = Math.round(ih * scale)

    // Drop position in SVG coordinates
    const dropPos = props.canvas.screenToSvg(e.clientX, e.clientY)
    const x = Math.round(dropPos.x - w / 2)
    const y = Math.round(dropPos.y - h / 2)

    const storageId = generateId('img')
    await storeImage(storageId, file)

    const el: ImageElement = {
      id: generateId('el'),
      type: 'image',
      name: file.name.replace(/\.[^.]+$/, ''),
      x, y, width: w, height: h,
      rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, blendMode: 'normal',
      fills: [], strokes: [], shadows: [], blur: 0,
      visible: true, locked: false, flipX: false, flipY: false,
      imageStorageId: storageId,
      imageFileName: file.name,
      imageFileSize: file.size,
      imageWidth: iw,
      imageHeight: ih,
      objectFit: 'contain',
    }
    editor.addElement(el, frameId)
    ui.select(el.id)
  } catch {
    // silently ignore drop errors
  }
}

function onElementMouseDown(e: MouseEvent, id: string) {
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasMouseDown(e)
    return
  }
  if (ui.pathEditMode) return
  if (DRAW_TOOLS.includes(ui.currentTool as ElementType)) {
    props.drawTool.onCanvasDown(e)
    return
  }
  props.elementDrag.onElementMouseDown(e, id)
}

function findChildAtPoint(group: GroupElement, pt: { x: number; y: number }): string | null {
  for (const childId of [...group.childIds].reverse()) {
    const child = editor.elements.find(c => c.id === childId)
    if (!child) continue
    if (pt.x >= child.x && pt.x <= child.x + child.width &&
        pt.y >= child.y && pt.y <= child.y + child.height) {
      return childId
    }
  }
  return null
}

function onElementDblClick(e: MouseEvent, id: string) {
  const el = editor.elements.find(el => el.id === id)
  if (el?.type === 'path') {
    e.stopPropagation()
    ui.select(id)
    ui.enterPathEditMode(id)
  } else if (el?.type === 'group') {
    e.stopPropagation()
    ui.enterGroup(id)
    const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
    const childId = findChildAtPoint(el as GroupElement, pos)
    if (childId) ui.select(childId)
  }
}

// Provide event handlers so nested ElementRenderer components can delegate child events
provide('onElementMouseDown', onElementMouseDown)
provide('onElementDblClick', onElementDblClick)

defineExpose({ viewportEl })
</script>

<template>
  <!-- Outer wrapper: captures wheel events everywhere (including over rulers) -->
  <div class="c-viewport" @wheel.prevent="canvas.onWheel">

    <!-- Canvas area: mouse interaction + SVG -->
    <div
      ref="viewportEl"
      class="canvas-area"
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
      @contextmenu="onContextMenu"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <svg
        :viewBox="canvas.viewBox.value"
        xmlns="http://www.w3.org/2000/svg"
        style="position:absolute;inset:0;width:100%;height:100%"
      >
        <CanvasArtboard
          :width="activeFrame?.width ?? artboardWidth"
          :height="activeFrame?.height ?? artboardHeight"
          :background-color="activeFrame?.backgroundColor"
        />
        <CanvasGrid
          v-if="ui.showGrid"
          :artboard-width="activeFrame?.width ?? artboardWidth"
          :artboard-height="activeFrame?.height ?? artboardHeight"
        />

        <!-- Mask clipPath defs -->
        <defs v-if="maskElements.length > 0">
          <clipPath
            v-for="mask in maskElements"
            :key="mask.id"
            :id="`mask-clip-${mask.id}`"
            clipPathUnits="userSpaceOnUse"
          >
            <MaskClipShape :element="mask" />
          </clipPath>
        </defs>

        <!-- Elements (top-level only; groups render their children recursively) -->
        <template v-for="el in activeFrameTopLevel" :key="el.id">
          <!-- Masked element: wrapped in clip-path group -->
          <g v-if="el.maskedById" :clip-path="`url(#mask-clip-${el.maskedById})`">
            <ElementRenderer
              :element="el"
              :animated-props="animatedPropsMap.get(el.id)"
              @mousedown.stop="(e: MouseEvent) => onElementMouseDown(e, el.id)"
              @dblclick.stop="(e: MouseEvent) => onElementDblClick(e, el.id)"
            />
          </g>
          <!-- Normal element -->
          <ElementRenderer
            v-else
            :element="el"
            :animated-props="animatedPropsMap.get(el.id)"
            @mousedown.stop="(e: MouseEvent) => onElementMouseDown(e, el.id)"
            @dblclick.stop="(e: MouseEvent) => onElementDblClick(e, el.id)"
          />
        </template>

        <!-- Dim overlay outside artboard -->
        <defs>
          <mask :id="`outside-${maskId}`">
            <rect x="-99999" y="-99999" width="199998" height="199998" fill="white" />
            <rect
              x="0" y="0"
              :width="activeFrame?.width ?? artboardWidth"
              :height="activeFrame?.height ?? artboardHeight"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="-99999" y="-99999"
          width="199998" height="199998"
          fill="var(--bg-0)"
          opacity="0.55"
          :mask="`url(#outside-${maskId})`"
          pointer-events="none"
        />

        <!-- Crop overlay (shown when in crop mode) -->
        <CropOverlay
          v-if="cropTool.isCropMode.value && cropElement && cropTool.tempCropRect.value"
          :element="cropElement"
          :crop-rect="cropTool.tempCropRect.value"
          :on-handle-mouse-down="cropTool.onHandleMouseDown"
          :on-crop-rect-mouse-down="cropTool.onCropRectMouseDown"
        />

        <!-- Selection overlay (hidden in path edit mode or crop mode) -->
        <SelectionOverlay
          v-if="selection.selectionBounds.value && !ui.pathEditMode && !cropTool.isCropMode.value"
          :bounds="selection.selectionBounds.value"
          :rotation="selectionRotation"
          :is-rotating="elementRotate.isRotating.value"
          :rotation-deg="elementRotate.rotationDeg.value"
          :transform-origin="selectionTransformOrigin"
          @resize-start="(e, h) => elementResize.onResizeStart(e, h, [...ui.selectedIds][0])"
          @rotate-start="(e) => elementRotate.onRotateStart(e, [...ui.selectedIds], selection.selectionBounds.value!)"
          @origin-mousedown="onOriginMouseDown"
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

.canvas-area {
  position: absolute;
  inset: 0;
  overflow: hidden;
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
