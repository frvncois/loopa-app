import { ref } from 'vue'
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

const DRAG_THRESHOLD = 5  // px in SVG space before we treat it as a smooth-point drag
const CLOSE_THRESHOLD = 10 // px to snap-close path to first point

export function usePenTool(
  editor: EditorStore,
  ui: UiStore,
  canvas: Canvas,
  onSave: () => void
) {
  /** Points that have been permanently placed */
  const currentPoints = ref<PathPoint[]>([])
  /** Whether the drawing session is active */
  const isDrawingPath = ref(false)
  /** Current mouse position in SVG coords (for preview line) */
  const previewPos = ref({ x: 0, y: 0 })
  /** Anchor position for the point currently being placed (during drag) */
  const pendingAnchor = ref<{ x: number; y: number } | null>(null)
  /** Where the out-handle is being dragged to */
  const pendingHandleOut = ref<{ x: number; y: number } | null>(null)

  let mouseDownSvg = { x: 0, y: 0 }
  let isDragging = false

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

    // Check for path closure: clicked near the first point
    if (currentPoints.value.length >= 3) {
      const first = currentPoints.value[0]
      const d = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2)
      if (d <= CLOSE_THRESHOLD) {
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
    const pts = [...currentPoints.value]

    if (pts.length < 2) {
      cancel()
      return
    }

    const d = pathPointsToD(pts, closed)

    // Bounding box from anchor points only (handles omitted for simplicity)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const pt of pts) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }

    const base = createDefaultElement('path') as PathElement
    const el: PathElement = {
      ...base,
      points: pts,
      closed,
      d,
      x: minX,
      y: minY,
      width:  Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      fills:   closed ? base.fills : [],
      strokes: [{ ...base.strokes[0], visible: true, color: '4353ff', width: 2 }]
    }

    editor.addElement(el, ui.activeFrameId ?? '')
    ui.select(el.id)
    ui.setTool('select')
    onSave()
    cancel()
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
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasDblClick,
    cancel
  }
}
