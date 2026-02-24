<script setup lang="ts">
import { ref, computed, provide, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import { computeMotionPathPosition, getPointOnPath } from '@/lib/path/motionPathMath'
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
import type { useMotionPathTool } from '@/composables/useMotionPathTool'
import type { useMotionPathEditor } from '@/composables/useMotionPathEditor'
import type { PathElement, GroupElement, ElementType, ImageElement, TextElement } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { storeImage } from '@/lib/utils/videoStorage'
import { generateId } from '@/lib/utils/id'
import CanvasArtboard from './CanvasArtboard.vue'
import CanvasGrid from './CanvasGrid.vue'
import ElementRenderer from './ElementRenderer.vue'
import CropOverlay from './CropOverlay.vue'
import SelectionOverlay from './SelectionOverlay.vue'
import MarqueeSelect from './MarqueeSelect.vue'
import DrawPreview from './DrawPreview.vue'
import PenToolOverlay from './PenToolOverlay.vue'
import PathPointHandle from './PathPointHandle.vue'
import IconZoomOut from '@/components/icons/IconZoomOut.vue'
import IconZoomIn from '@/components/icons/IconZoomIn.vue'
import CanvasRuler from './CanvasRuler.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import { useGuides } from '@/composables/useGuides'

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
  motionPathTool?: ReturnType<typeof useMotionPathTool>
  motionPathEditor?: ReturnType<typeof useMotionPathEditor>
  artboardWidth: number
  artboardHeight: number
}>()

const ui = useUiStore()
const editor = useEditorStore()
const timeline = useTimelineStore()

const maskId = Math.random().toString(36).slice(2, 8)
const RULER_SIZE = 20 // px — matches CanvasRuler CSS
const rulerUnit = ref<'px' | '%'>('px')
const DRAW_TOOLS: ElementType[] = ['rect', 'ellipse', 'line', 'polygon', 'star', 'text']

// viewportEl points to the canvas-area div; screenToSvg uses its bounding rect.
const viewportEl = ref<HTMLElement>()

// Active frame data
const activeFrame = computed(() =>
  ui.activeFrameId ? editor.frames.find(f => f.id === ui.activeFrameId) ?? null : null
)

// ── Artboard dimensions (used by rulers + guides) ──
const abW = computed(() => activeFrame.value?.width ?? props.artboardWidth)
const abH = computed(() => activeFrame.value?.height ?? props.artboardHeight)

// ── Guides ──
const guidesComposable = useGuides(viewportEl, props.canvas, abW, abH)

const activeFrameTopLevel = computed(() =>
  ui.activeFrameId ? editor.getTopLevelElementsForFrame(ui.activeFrameId) : []
)

const activeFrameKeyframes = computed(() =>
  ui.activeFrameId ? editor.getKeyframesForFrame(ui.activeFrameId) : []
)

// All elements in the active frame (including group children) — needed for animated props
const activeFrameAllElements = computed(() =>
  ui.activeFrameId ? editor.getElementsForFrame(ui.activeFrameId) : []
)

// Compute animated props per element, reactive to currentFrame.
// Covers ALL frame elements (including group children) so mask group children get animated props too.
// Also applies motion path overrides (override x/y and optionally rotation).
const animatedPropsMap = computed(() => {
  const frame = timeline.currentFrame
  const map = new Map<string, AnimatableProps>()
  for (const el of activeFrameAllElements.value) {
    const kfs = activeFrameKeyframes.value.filter(kf => kf.elementId === el.id)
    let props: AnimatableProps = kfs.length > 0 ? computeElementAtFrame(kfs, frame) : {}

    // Motion path offset (relative, added to base element position)
    const mp = editor.motionPaths.find(m => m.elementId === el.id)
    if (mp) {
      const override = computeMotionPathPosition(mp, frame)
      if (override) {
        props = { ...props, x: el.x + override.x, y: el.y + override.y }
        if (override.rotation !== undefined) props = { ...props, rotation: override.rotation }
      }
    }

    if (Object.keys(props).length > 0) map.set(el.id, props)
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

// ── Inline text editing ───────────────────────────────────────────────────────

const editingTextId = ref<string | null>(null)
const editingTextValue = ref('')
const editingTextOriginal = ref('')

function startTextEditing(id: string) {
  const el = editor.elements.find(e => e.id === id)
  if (!el || el.type !== 'text') return
  const textEl = el as TextElement
  editingTextId.value = id
  editingTextValue.value = textEl.text || ''
  editingTextOriginal.value = textEl.text || ''
  ui.select(id)
  nextTick(() => {
    const input = document.getElementById('canvas-text-editor') as HTMLElement | null
    if (input) {
      input.innerText = textEl.text || ''
      input.focus()
      try {
        const range = document.createRange()
        range.selectNodeContents(input)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch { /* ignore */ }
    }
  })
}

function commitTextEdit() {
  if (!editingTextId.value) return
  const id = editingTextId.value
  // Read final text from DOM (innerText correctly converts <br>/<div> to \n)
  const editorEl = document.getElementById('canvas-text-editor') as HTMLElement | null
  let finalText = editorEl?.innerText ?? editingTextValue.value
  // Strip only leading/trailing blank lines; preserve internal line breaks
  finalText = finalText.replace(/^\n+/, '').replace(/\n+$/, '')
  if (!finalText.trim()) finalText = 'Text'
  editingTextId.value = null
  editingTextValue.value = ''
  editingTextOriginal.value = ''
  editor.updateElement(id, { text: finalText })
  measureAndUpdateTextBounds(id)
}

function cancelTextEdit() {
  if (!editingTextId.value) return
  const id = editingTextId.value
  const original = editingTextOriginal.value
  editingTextId.value = null
  editingTextValue.value = ''
  editingTextOriginal.value = ''
  // Restore original text (since we live-update during typing)
  editor.updateElement(id, { text: original })
  measureAndUpdateTextBounds(id)
}

function onTextEditorInput(e: Event) {
  const text = (e.target as HTMLElement).innerText
  editingTextValue.value = text
  if (!editingTextId.value) return
  // Live-update element so properties panel stays in sync
  editor.updateElement(editingTextId.value, { text })
  measureAndUpdateTextBounds(editingTextId.value)
}

function onTextEditorKeyDown(e: KeyboardEvent) {
  e.stopPropagation()
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelTextEdit()
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    commitTextEdit()
    return
  }
  // Enter creates line breaks naturally — don't intercept it
}

function measureAndUpdateTextBounds(id: string) {
  const el = editor.elements.find(e => e.id === id)
  if (!el || el.type !== 'text') return
  const textEl = el as TextElement
  const text = textEl.text || 'Text'
  const fontSize = textEl.fontSize ?? 24
  const fontFamily = textEl.fontFamily ?? 'DM Sans'
  const fontWeight = textEl.fontWeight ?? 400
  const lineHeight = fontSize * 1.25
  const lines = text.split('\n')

  // Accurate measurement via hidden SVG text element
  const measurer = document.getElementById('svg-text-measurer') as SVGTextElement | null
  if (measurer) {
    measurer.setAttribute('font-size', String(fontSize))
    measurer.setAttribute('font-family', fontFamily)
    measurer.setAttribute('font-weight', String(fontWeight))
    let maxWidth = 0
    for (const line of lines) {
      measurer.textContent = line || '\u00A0'
      try {
        const bbox = measurer.getBBox()
        if (bbox.width > maxWidth) maxWidth = bbox.width
      } catch { /* ignore */ }
    }
    if (maxWidth > 0) {
      editor.updateElement(id, {
        width: Math.ceil(maxWidth),
        height: Math.ceil(lines.length * lineHeight),
      })
      return
    }
  }

  // Fallback estimate
  const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '')
  editor.updateElement(id, {
    width: Math.ceil(Math.max(longestLine.length * fontSize * 0.6, 30)),
    height: Math.ceil(lines.length * lineHeight),
  })
}

// Exit text editing when tool changes
watch(() => ui.currentTool, () => {
  if (editingTextId.value) commitTextEdit()
})

// Exit text editing when selection moves away from the editing element
watch(() => ui.selectedIds.size, () => {
  if (editingTextId.value && !ui.selectedIds.has(editingTextId.value)) {
    commitTextEdit()
  }
})

// Hint for selected (but not yet editing) text elements
const selectedTextForHint = computed((): TextElement | null => {
  if (ui.selectedIds.size !== 1 || editingTextId.value) return null
  const id = [...ui.selectedIds][0]
  const el = editor.elements.find(e => e.id === id)
  return el?.type === 'text' ? (el as TextElement) : null
})

// Listen for text-edit trigger from draw tool (text placed via toolbar click)
function onStartTextEditEvent(e: Event) {
  const id = (e as CustomEvent<{ id: string }>).detail?.id
  if (id) startTextEditing(id)
}
// Listen for measurement requests from properties panel property changes
function onRemeasureTextEvent(e: Event) {
  const id = (e as CustomEvent<{ id: string }>).detail?.id
  if (id) measureAndUpdateTextBounds(id)
}
onMounted(() => {
  window.addEventListener('loopa:startTextEdit', onStartTextEditEvent)
  window.addEventListener('loopa:remeasureText', onRemeasureTextEvent)
})
onBeforeUnmount(() => {
  window.removeEventListener('loopa:startTextEdit', onStartTextEditEvent)
  window.removeEventListener('loopa:remeasureText', onRemeasureTextEvent)
})

function onOriginMouseDown(e: MouseEvent) {
  if (ui.selectedIds.size !== 1) return
  const id = [...ui.selectedIds][0]
  props.transformOriginComposable?.onOriginMouseDown(e, id)
}

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

// ── Motion path helpers ───────────────────────────────────────────────────────

const visibleMotionPaths = computed(() =>
  editor.motionPaths.filter(mp => ui.selectedIds.has(mp.elementId) && !timeline.isPlaying)
)

function isPathEditable(mpId: string): boolean {
  const mp = editor.motionPaths.find(m => m.id === mpId)
  if (!mp) return false
  return ui.selectedIds.has(mp.elementId) && !timeline.isPlaying && ui.currentTool === 'select'
}

// Returns the element center for a given motion path — used as the translate
// origin for the guide overlay so that path relative coords render correctly.
function mpElementCenter(elementId: string): { x: number; y: number } {
  const el = editor.getElementById(elementId)
  if (!el) return { x: 0, y: 0 }
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 }
}

// Returns the progress-dot position as a RELATIVE offset (inside the translated group)
function progressDot(mpId: string): { x: number; y: number } | null {
  const mp = editor.motionPaths.find(m => m.id === mpId)
  if (!mp || mp.points.length < 2) return null
  const frame = timeline.currentFrame
  if (frame < mp.startFrame || frame > mp.endFrame) return null
  const t = (frame - mp.startFrame) / (mp.endFrame - mp.startFrame)
  return getPointOnPath(mp.points, t)
}

function onMouseDown(e: MouseEvent) {
  const target = e.target as SVGElement
  const isBackground = target === viewportEl.value?.querySelector('svg')
    || target.classList.contains('artboard')

  // ── Motion path drawing tool — intercepts ALL clicks while drawing ──
  if (props.motionPathTool?.isDrawing.value) {
    const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
    props.motionPathTool.onCanvasMouseDown(e, pos.x, pos.y)
    return
  }

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
    if (editingTextId.value) commitTextEdit()
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
  if (ui.currentTool === 'motion-path' && props.motionPathTool) {
    props.motionPathTool.onCanvasMouseMove(e, pos.x, pos.y)
  }
}

function onDblClick(e: MouseEvent) {
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasDblClick(e)
  }
  // Motion path pen mode: double-click is detected internally via time+distance threshold in onCanvasMouseDown
}

function onCanvasMouseUp(e: MouseEvent) {
  props.motionPathTool?.onCanvasMouseUp(e)
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  ui.showContextMenu(e.clientX, e.clientY)
}

// ── Guide context menu items ──
const guideContextItems = computed(() => {
  const gid = ui.guideContextMenu.guideId
  const guide = ui.guides.find((g: { id: string }) => g.id === gid)
  if (!guide) return []
  return [
    {
      label: guide.locked ? 'Unlock guide' : 'Lock guide',
      action: () => ui.toggleGuideLock(gid)
    },
    {
      label: 'Remove guide',
      action: () => ui.removeGuide(gid),
      danger: true
    }
  ]
})

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
  // When drawing motion path, element clicks must also route to the tool
  if (props.motionPathTool?.isDrawing.value) {
    const pos = props.canvas.screenToSvg(e.clientX, e.clientY)
    props.motionPathTool.onCanvasMouseDown(e, pos.x, pos.y)
    return
  }
  if (ui.currentTool === 'pen') {
    props.penTool.onCanvasMouseDown(e)
    return
  }
  if (ui.pathEditMode) return
  if (DRAW_TOOLS.includes(ui.currentTool as ElementType)) {
    props.drawTool.onCanvasDown(e)
    return
  }
  // Don't start drag if we're inline-editing this text element
  if (editingTextId.value === id) return
  // If editing a different element's text, commit it first
  if (editingTextId.value && editingTextId.value !== id) {
    commitTextEdit()
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
  if (el?.type === 'text') {
    e.stopPropagation()
    startTextEditing(id)
    return
  }
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

// Resize handler: for mask groups, target the mask shape and scale content siblings proportionally
function onSelectionResizeStart(e: MouseEvent, h: string) {
  if (ui.selectedIds.size !== 1) return
  const id = [...ui.selectedIds][0]
  const el = editor.getElementById(id)
  if (el?.type === 'group' && (el as GroupElement).hasMask && (el as GroupElement).childIds.length > 0) {
    const childIds = (el as GroupElement).childIds
    props.elementResize.onResizeStart(e, h, childIds[0], childIds.slice(1))
  } else {
    props.elementResize.onResizeStart(e, h, id)
  }
}

// Provide event handlers and animated props map so nested ElementRenderer components can use them
provide('onElementMouseDown', onElementMouseDown)
provide('onElementDblClick', onElementDblClick)
provide('animatedPropsMap', animatedPropsMap)
provide('textEditState', {
  editingTextId,
  editingTextValue,
  commitTextEdit,
  cancelTextEdit,
  onTextEditorInput,
  onTextEditorKeyDown,
  measureAndUpdateTextBounds,
})

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
      @mouseup="onCanvasMouseUp"
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

        <!-- Hidden text measurer — always in DOM for accurate getBBox() measurement -->
        <text id="svg-text-measurer" x="-99999" y="-99999" style="visibility:hidden;pointer-events:none" />

        <!-- Elements (top-level only; groups render their children recursively) -->
        <ElementRenderer
          v-for="el in activeFrameTopLevel"
          :key="el.id"
          :element="el"
          :animated-props="animatedPropsMap.get(el.id)"
          @mousedown.stop="(e: MouseEvent) => onElementMouseDown(e, el.id)"
          @dblclick.stop="(e: MouseEvent) => onElementDblClick(e, el.id)"
        />

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

        <!-- Selection overlay (hidden in path edit mode, crop mode, or text editing) -->
        <SelectionOverlay
          v-if="selection.selectionBounds.value && !ui.pathEditMode && !cropTool.isCropMode.value && !editingTextId"
          :bounds="selection.selectionBounds.value"
          :rotation="selectionRotation"
          :is-rotating="elementRotate.isRotating.value"
          :rotation-deg="elementRotate.rotationDeg.value"
          :transform-origin="selectionTransformOrigin"
          @resize-start="(e, h) => onSelectionResizeStart(e, h)"
          @rotate-start="(e) => elementRotate.onRotateStart(e, [...ui.selectedIds], selection.selectionBounds.value!)"
          @origin-mousedown="onOriginMouseDown"
        />

        <!-- Hint: double-click to edit selected text element -->
        <text
          v-if="selectedTextForHint"
          :x="selectedTextForHint.x + (selectedTextForHint.width ?? 100) / 2"
          :y="selectedTextForHint.y - 10"
          text-anchor="middle"
          fill="var(--accent)"
          font-size="14"
          opacity="0.7"
          pointer-events="none"
          style="font-family: system-ui, sans-serif; user-select: none"
        >Double-click to edit</text>

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

        <!-- Motion path guides (path points are relative to element center) -->
        <template v-for="mp in visibleMotionPaths" :key="mp.id">
          <!-- Translate group so relative coords render at element center -->
          <g :transform="`translate(${mpElementCenter(mp.elementId).x},${mpElementCenter(mp.elementId).y})`">
            <g class="mp-guide" pointer-events="none">
              <!-- Dotted guide line -->
              <path
                :d="mp.d"
                fill="none"
                stroke="var(--accent)"
                stroke-width="1.5"
                stroke-dasharray="6 4"
                opacity="0.65"
                pointer-events="none"
              />
              <!-- Progress dot (relative position inside translated group) -->
              <circle
                v-if="progressDot(mp.id)"
                :cx="progressDot(mp.id)!.x"
                :cy="progressDot(mp.id)!.y"
                r="5"
                fill="var(--accent)"
                opacity="0.85"
                pointer-events="none"
              />
            </g>
            <!-- Editable control points + handles (only when element selected + not playing) -->
            <g v-if="isPathEditable(mp.id)" class="mp-edit" pointer-events="all">
              <template v-for="(pt, i) in mp.points" :key="'h-' + i">
                <!-- Handle-in line + dot -->
                <template v-if="pt.handleIn.x !== 0 || pt.handleIn.y !== 0">
                  <line
                    :x1="pt.x" :y1="pt.y"
                    :x2="pt.x + pt.handleIn.x" :y2="pt.y + pt.handleIn.y"
                    stroke="var(--accent)" stroke-width="1" opacity="0.5"
                    pointer-events="none"
                  />
                  <circle
                    :cx="pt.x + pt.handleIn.x" :cy="pt.y + pt.handleIn.y"
                    r="3" fill="white" stroke="var(--accent)" stroke-width="1.5"
                    style="cursor: grab"
                    @mousedown.stop="motionPathEditor?.startHandleDrag(mp.id, i, 'in', $event)"
                  />
                </template>
                <!-- Handle-out line + dot -->
                <template v-if="pt.handleOut.x !== 0 || pt.handleOut.y !== 0">
                  <line
                    :x1="pt.x" :y1="pt.y"
                    :x2="pt.x + pt.handleOut.x" :y2="pt.y + pt.handleOut.y"
                    stroke="var(--accent)" stroke-width="1" opacity="0.5"
                    pointer-events="none"
                  />
                  <circle
                    :cx="pt.x + pt.handleOut.x" :cy="pt.y + pt.handleOut.y"
                    r="3" fill="white" stroke="var(--accent)" stroke-width="1.5"
                    style="cursor: grab"
                    @mousedown.stop="motionPathEditor?.startHandleDrag(mp.id, i, 'out', $event)"
                  />
                </template>
              </template>
              <!-- Control point diamonds -->
              <circle
                v-for="(pt, i) in mp.points"
                :key="'pt-' + i"
                :cx="pt.x" :cy="pt.y"
                r="5"
                :fill="motionPathEditor?.selectedPoint.value?.pathId === mp.id && motionPathEditor?.selectedPoint.value?.idx === i ? 'white' : 'var(--accent)'"
                :stroke="motionPathEditor?.selectedPoint.value?.pathId === mp.id && motionPathEditor?.selectedPoint.value?.idx === i ? 'var(--accent)' : 'white'"
                stroke-width="1.5"
                style="cursor: grab"
                @mousedown.stop="motionPathEditor?.startPathPointDrag(mp.id, i, $event)"
              />
            </g>
          </g>
        </template>

        <!-- Motion path drawing preview -->
        <template v-if="motionPathTool?.isDrawing.value">
          <!-- Preview path line -->
          <path
            v-if="motionPathTool.previewD.value"
            :d="motionPathTool.previewD.value"
            fill="none"
            stroke="var(--accent)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
            opacity="0.7"
            pointer-events="none"
          />
          <!-- Anchor points + bezier handle lines/dots -->
          <template>
            <template v-for="(pt, i) in motionPathTool.rawPoints.value" :key="'ph-' + i">
              <template v-if="motionPathTool.penHandles.value.get(i)">
                <!-- Handle out -->
                <line
                  :x1="pt.x" :y1="pt.y"
                  :x2="pt.x + motionPathTool.penHandles.value.get(i)!.out.x"
                  :y2="pt.y + motionPathTool.penHandles.value.get(i)!.out.y"
                  stroke="var(--accent)" stroke-width="1" opacity="0.5"
                  pointer-events="none"
                />
                <circle
                  :cx="pt.x + motionPathTool.penHandles.value.get(i)!.out.x"
                  :cy="pt.y + motionPathTool.penHandles.value.get(i)!.out.y"
                  r="3" fill="white" stroke="var(--accent)" stroke-width="1.5"
                  pointer-events="none"
                />
                <!-- Handle in (mirrored) -->
                <line
                  :x1="pt.x" :y1="pt.y"
                  :x2="pt.x - motionPathTool.penHandles.value.get(i)!.out.x"
                  :y2="pt.y - motionPathTool.penHandles.value.get(i)!.out.y"
                  stroke="var(--accent)" stroke-width="1" opacity="0.5"
                  pointer-events="none"
                />
                <circle
                  :cx="pt.x - motionPathTool.penHandles.value.get(i)!.out.x"
                  :cy="pt.y - motionPathTool.penHandles.value.get(i)!.out.y"
                  r="3" fill="white" stroke="var(--accent)" stroke-width="1.5"
                  pointer-events="none"
                />
              </template>
            </template>
            <!-- Anchor point circles (green ring on first = start) -->
            <circle
              v-for="(pt, i) in motionPathTool.rawPoints.value"
              :key="'pp-' + i"
              :cx="pt.x" :cy="pt.y"
              r="4"
              :fill="i === 0 ? 'none' : 'var(--accent)'"
              :stroke="i === 0 ? '#22c55e' : 'white'"
              :stroke-width="i === 0 ? 2.5 : 1.5"
              pointer-events="none"
            />
          </template>
        </template>
      </svg>

      <!-- Motion path drawing status hint -->
      <div
        v-if="motionPathTool?.isDrawing.value"
        class="mp-hint"
      >
        Click to add · Click+drag for smooth · Double-click or ↩ to finish · Esc to cancel
      </div>

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

      <!-- ── Artboard-edge rulers ── -->
      <!-- Top ruler (horizontal, above artboard) -->
      <div
        v-if="ui.showRulers"
        class="ruler-wrap"
        :style="{
          left: canvas.panX.value + 'px',
          top: (canvas.panY.value - RULER_SIZE) + 'px',
          width: (abW * canvas.zoom.value) + 'px',
          height: RULER_SIZE + 'px'
        }"
      >
        <CanvasRuler
          direction="horizontal"
          :zoom="canvas.zoom.value"
          :unit="rulerUnit"
          :artboard-length="abW"
          @dragstart="(e: MouseEvent) => guidesComposable.startDragFromRuler(e, 'horizontal')"
        />
      </div>
      <!-- Left ruler (vertical, left of artboard) -->
      <div
        v-if="ui.showRulers"
        class="ruler-wrap"
        :style="{
          left: (canvas.panX.value - RULER_SIZE) + 'px',
          top: canvas.panY.value + 'px',
          width: RULER_SIZE + 'px',
          height: (abH * canvas.zoom.value) + 'px'
        }"
      >
        <CanvasRuler
          direction="vertical"
          :zoom="canvas.zoom.value"
          :unit="rulerUnit"
          :artboard-length="abH"
          @dragstart="(e: MouseEvent) => guidesComposable.startDragFromRuler(e, 'vertical')"
        />
      </div>
      <!-- Ruler corner toggle (px ↔ %) -->
      <div
        v-if="ui.showRulers"
        class="ruler-corner"
        :style="{
          left: (canvas.panX.value - RULER_SIZE) + 'px',
          top: (canvas.panY.value - RULER_SIZE) + 'px',
          width: RULER_SIZE + 'px',
          height: RULER_SIZE + 'px'
        }"
        @click="rulerUnit = rulerUnit === 'px' ? '%' : 'px'"
      >
        <span :class="{ 'is-active': rulerUnit === 'px' }">px</span>
        <span :class="{ 'is-active': rulerUnit === '%' }">%</span>
      </div>

      <!-- ── Guide interaction overlays (hit area + visual via ::after) ── -->
      <template v-for="guide in ui.guides" :key="guide.id">
        <div
          v-if="guide.axis === 'horizontal' && !(guidesComposable.isDragging.value && guidesComposable.dragGuideId.value === guide.id)"
          class="guide-overlay guide-h"
          :class="{ 'is-locked': guide.locked }"
          :style="{ top: (guide.position * canvas.zoom.value + canvas.panY.value) + 'px' }"
          @mousedown="(e: MouseEvent) => guidesComposable.startDragExistingGuide(e, guide)"
          @contextmenu="(e: MouseEvent) => guidesComposable.onGuideContextMenu(e, guide.id)"
        />
        <div
          v-if="guide.axis === 'vertical' && !(guidesComposable.isDragging.value && guidesComposable.dragGuideId.value === guide.id)"
          class="guide-overlay guide-v"
          :class="{ 'is-locked': guide.locked }"
          :style="{ left: (guide.position * canvas.zoom.value + canvas.panX.value) + 'px' }"
          @mousedown="(e: MouseEvent) => guidesComposable.startDragExistingGuide(e, guide)"
          @contextmenu="(e: MouseEvent) => guidesComposable.onGuideContextMenu(e, guide.id)"
        />
      </template>

      <!-- Drag-preview guide (shown while dragging from ruler) -->
      <div
        v-if="guidesComposable.isDragging.value && guidesComposable.dragAxis.value === 'horizontal'"
        class="guide-overlay guide-h guide-preview"
        :style="{ top: (guidesComposable.dragPosition.value * canvas.zoom.value + canvas.panY.value) + 'px' }"
      />
      <div
        v-if="guidesComposable.isDragging.value && guidesComposable.dragAxis.value === 'vertical'"
        class="guide-overlay guide-v guide-preview"
        :style="{ left: (guidesComposable.dragPosition.value * canvas.zoom.value + canvas.panX.value) + 'px' }"
      />

      <!-- Guide position tooltip -->
      <div
        v-if="guidesComposable.isDragging.value"
        class="guide-tooltip"
        :style="{
          left: (guidesComposable.dragScreenX.value + 14) + 'px',
          top: (guidesComposable.dragScreenY.value - 28) + 'px'
        }"
      >
        <span>{{ Math.round(guidesComposable.dragPosition.value) }}px</span>
        <span class="sep">/</span>
        <span>{{ Math.round(guidesComposable.dragPosition.value / (guidesComposable.dragAxis.value === 'horizontal' ? abH : abW) * 100) }}%</span>
      </div>

    </div>

    <!-- Guide context menu -->
    <ContextMenu
      :show="ui.guideContextMenu.show"
      :x="ui.guideContextMenu.x"
      :y="ui.guideContextMenu.y"
      :items="guideContextItems"
      @close="ui.hideGuideContextMenu()"
    />
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

.mp-hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6875rem;
  color: var(--text-3);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 0.25rem 0.625rem;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Artboard-edge ruler wrappers ── */
.ruler-wrap {
  position: absolute;
  z-index: 5;
  overflow: hidden;
  pointer-events: auto;
}

.ruler-corner {
  position: absolute;
  z-index: 6;
  background: var(--bg-2);
  border-right: 1px solid #3a3a4a;
  border-bottom: 1px solid #3a3a4a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  user-select: none;
  &:hover { background: var(--bg-3); }
  span {
    font-size: 0.4375rem;
    font-family: var(--mono);
    color: var(--text-4);
    line-height: 1;
    &.is-active { color: var(--text-1); }
  }
}

/* ── Guide overlays (hit area + visual line via ::after, z-index above rulers) ── */
.guide-overlay {
  position: absolute;
  z-index: 6;
}
.guide-overlay.guide-h {
  left: 0;
  right: 0;
  height: 5px;
  margin-top: -2px;
  cursor: ns-resize;
  &::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: 2px;
    height: 1px;
    background: #00d4ff;
  }
}
.guide-overlay.guide-v {
  top: 0;
  bottom: 0;
  width: 5px;
  margin-left: -2px;
  cursor: ew-resize;
  &::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    left: 2px;
    width: 1px;
    background: #00d4ff;
  }
}
.guide-overlay.is-locked {
  cursor: default;
  &::after { opacity: 0.5; }
}
.guide-overlay.guide-preview {
  pointer-events: none;
  &::after { opacity: 0.5; }
}

.guide-tooltip {
  position: absolute;
  z-index: 10;
  background: var(--bg-4);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 2px 6px;
  font-size: 0.625rem;
  font-family: var(--mono);
  color: var(--text-1);
  pointer-events: none;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  .sep { color: var(--text-4); }
}
</style>
