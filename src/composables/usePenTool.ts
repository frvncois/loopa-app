import { ref, computed, watch } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { PathPoint, PathElement } from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import { createDefaultElement } from '@/lib/elements/ElementFactory'
import { pathPointsToD } from '@/lib/path/PathBuilder'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

const DRAG_THRESHOLD = 5           // px in SVG space before we treat it as a smooth-point drag
const CLOSE_THRESHOLD_SCREEN = 15  // px in screen space for path closure

export function usePenTool(
  editor: EditorStore,
  ui: UiStore,
  canvas: Canvas,
  onSave: () => void
) {
  /** Points that have been permanently placed (in absolute SVG coords during drawing) */
  const currentPoints = ref<PathPoint[]>([])
  /** Whether the drawing session is active */
  const isDrawingPath = ref(false)
  /** Current mouse position in SVG coords (for preview line) */
  const previewPos = ref({ x: 0, y: 0 })
  /** Anchor position for the point currently being placed (during drag) */
  const pendingAnchor = ref<{ x: number; y: number } | null>(null)
  /** Where the out-handle is being dragged to */
  const pendingHandleOut = ref<{ x: number; y: number } | null>(null)

  /** Close threshold in SVG units — 15 screen px scaled by current zoom */
  const closeThresholdSvg = computed(() => CLOSE_THRESHOLD_SCREEN / (canvas.zoom.value || 1))

  /** True when the cursor is within close distance of the first point (used for visual indicator) */
  const isNearFirstPoint = computed(() => {
    const pts = currentPoints.value
    if (pts.length < 2) return false
    const first = pts[0]
    return Math.hypot(previewPos.value.x - first.x, previewPos.value.y - first.y) < closeThresholdSvg.value
  })

  let mouseDownSvg = { x: 0, y: 0 }
  let isDragging = false

  // Fix 1: Force-exit drawing when the tool changes away from 'pen'
  watch(() => ui.currentTool, (tool) => {
    if (tool !== 'pen') cancel()
  })

  // ── Handlers exposed to CanvasViewport ─────────────────────────

  function onCanvasMouseDown(e: MouseEvent) {
    if (ui.currentTool !== 'pen') return
    e.stopPropagation()

    const pos = canvas.screenToSvg(e.clientX, e.clientY)
    mouseDownSvg = pos
    isDragging = false
    pendingAnchor.value = pos
    isDrawingPath.value = true

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onDragMove(e: MouseEvent) {
    const pos = canvas.screenToSvg(e.clientX, e.clientY)
    const dx = pos.x - mouseDownSvg.x
    const dy = pos.y - mouseDownSvg.y

    if (!isDragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      isDragging = true
    }
    if (isDragging) {
      pendingHandleOut.value = pos
    }
  }

  function onMouseUp(e: MouseEvent) {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onMouseUp)

    const pos = canvas.screenToSvg(e.clientX, e.clientY)

    // Fix 2: single-click close at 15px screen tolerance
    if (currentPoints.value.length >= 2) {
      const first = currentPoints.value[0]
      const d = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2)
      if (d <= closeThresholdSvg.value) {
        pendingAnchor.value = null
        pendingHandleOut.value = null
        finishPath(true)
        return
      }
    }

    if (isDragging && pendingHandleOut.value) {
      // Smooth point: handle extends in drag direction, mirror for handleIn
      const hdx = pendingHandleOut.value.x - mouseDownSvg.x
      const hdy = pendingHandleOut.value.y - mouseDownSvg.y
      const pt: PathPoint = {
        id: generateId('pp'),
        x: mouseDownSvg.x,
        y: mouseDownSvg.y,
        handleOut: { x: mouseDownSvg.x + hdx, y: mouseDownSvg.y + hdy },
        handleIn:  { x: mouseDownSvg.x - hdx, y: mouseDownSvg.y - hdy },
        type: 'symmetric'
      }
      currentPoints.value = [...currentPoints.value, pt]
    } else {
      // Corner point
      currentPoints.value = [...currentPoints.value, {
        id: generateId('pp'),
        x: mouseDownSvg.x,
        y: mouseDownSvg.y,
        handleIn: null,
        handleOut: null,
        type: 'corner'
      }]
    }

    isDragging = false
    pendingAnchor.value = null
    pendingHandleOut.value = null
  }

  /** Called on every mousemove in the viewport (even when not pressing) */
  function onCanvasMouseMove(e: MouseEvent) {
    if (!isDrawingPath.value) return
    const pos = canvas.screenToSvg(e.clientX, e.clientY)
    previewPos.value = pos
  }

  /** Called on dblclick — finishes the path (open) */
  function onCanvasDblClick(e: MouseEvent) {
    if (!isDrawingPath.value) return
    e.stopPropagation()

    // Remove the last point that was added by the single-click part of this dblclick
    if (currentPoints.value.length > 0) {
      currentPoints.value = currentPoints.value.slice(0, -1)
    }

    pendingAnchor.value = null
    pendingHandleOut.value = null
    finishPath(false)
  }

  // ── Internal ────────────────────────────────────────────────────

  function finishPath(closed: boolean) {
    const absPts = [...currentPoints.value]

    if (absPts.length < 2) {
      cancel()
      return
    }

    // Fix 4: compute bounding box from anchor points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const pt of absPts) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }

    // Fix 4: normalize to relative coordinates (subtract element origin)
    const relativePts: PathPoint[] = absPts.map(pt => ({
      ...pt,
      x: pt.x - minX,
      y: pt.y - minY,
      handleIn:  pt.handleIn  ? { x: pt.handleIn.x  - minX, y: pt.handleIn.y  - minY } : null,
      handleOut: pt.handleOut ? { x: pt.handleOut.x - minX, y: pt.handleOut.y - minY } : null,
    }))

    const d = pathPointsToD(relativePts, closed)

    const base = createDefaultElement('path') as PathElement
    const el: PathElement = {
      ...base,
      points: relativePts,
      closed,
      d,
      relativePoints: true,   // Fix 4: mark as using relative coordinate system
      x: minX,
      y: minY,
      width:  Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      fills:   closed ? base.fills : [],
      strokes: [{ ...base.strokes[0], visible: true, color: '4353ff', width: 2 }]
    }

    editor.addElement(el, ui.activeFrameId ?? '')
    ui.select(el.id)
    cancel()

    if (closed) {
      // Fix 3: enter path edit mode immediately so user can add curves
      ui.enterPathEditMode(el.id)
      ui.setTool('select')
    } else {
      ui.setTool('select')
    }

    onSave()
  }

  function cancel() {
    isDrawingPath.value = false
    currentPoints.value = []
    pendingAnchor.value = null
    pendingHandleOut.value = null
    isDragging = false
  }

  return {
    isDrawingPath,
    currentPoints,
    previewPos,
    pendingAnchor,
    pendingHandleOut,
    isNearFirstPoint,
    closeThresholdSvg,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasDblClick,
    cancel
  }
}
