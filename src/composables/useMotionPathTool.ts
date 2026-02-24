import { ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import type { MotionPath, MotionPathPoint } from '@/types/motionPath'
import { pointsToSvgPath } from '@/lib/path/motionPathMath'
import { generateId } from '@/lib/utils/id'

type EditorStore    = ReturnType<typeof useEditorStore>
type UiStore        = ReturnType<typeof useUiStore>
type TimelineStore  = ReturnType<typeof useTimelineStore>

export function useMotionPathTool(
  editor: EditorStore,
  ui: UiStore,
  timeline: TimelineStore,
  _canvas: unknown,   // kept for API compat, unused (coords passed in by CanvasViewport)
  onSave: () => void
) {
  const isDrawing       = ref(false)
  // Points accumulated during drawing (exposed for rendering)
  const rawPoints       = ref<{ x: number; y: number }[]>([])
  // Per-point bezier handle data
  const penHandles      = ref<Map<number, { out: { x: number; y: number } }>>(new Map())
  const penDragging     = ref(false)
  const penDragPointIdx = ref(-1)
  const previewD        = ref('')
  const targetElementId = ref<string | null>(null)

  // Double-click detection state
  let lastClickTime = 0
  let lastClickPos  = { x: 0, y: 0 }

  // ── Public API ────────────────────────────────────────────────────────────────

  function startDrawing() {
    if (ui.selectedIds.size !== 1) return
    targetElementId.value = [...ui.selectedIds][0]
    const el = editor.getElementById(targetElementId.value)
    if (!el) return
    isDrawing.value       = true
    penHandles.value      = new Map()
    penDragging.value     = false
    penDragPointIdx.value = -1
    previewD.value        = ''
    // Pre-place first point at element center so path starts there naturally
    rawPoints.value = [{ x: el.x + el.width / 2, y: el.y + el.height / 2 }]
    ui.setTool('motion-path')
  }

  function onCanvasMouseDown(e: MouseEvent, canvasX: number, canvasY: number) {
    if (!isDrawing.value) return

    // Double-click detection: same spot within 400 ms → finish
    const now  = Date.now()
    const dist = Math.hypot(canvasX - lastClickPos.x, canvasY - lastClickPos.y)
    if (now - lastClickTime < 400 && dist < 10) {
      lastClickTime = 0
      // Remove duplicate point added on the first click of the double-tap
      if (rawPoints.value.length > 1) rawPoints.value.pop()
      finishPath()
      return
    }
    lastClickTime = now
    lastClickPos  = { x: canvasX, y: canvasY }

    // Add point
    rawPoints.value.push({ x: canvasX, y: canvasY })
    penDragging.value     = true
    penDragPointIdx.value = rawPoints.value.length - 1

    updatePenPreview()

    // Document-level mouseup ends the handle drag
    document.addEventListener('mouseup', onPenHandleMouseUp, { once: true })
  }

  function onCanvasMouseMove(e: MouseEvent, canvasX: number, canvasY: number) {
    if (!isDrawing.value) return

    // Drag after placing a point → create bezier handle
    if (penDragging.value && e.buttons === 1) {
      const ptIdx = penDragPointIdx.value
      const pt    = rawPoints.value[ptIdx]
      if (!pt) return
      penHandles.value.set(ptIdx, {
        out: { x: canvasX - pt.x, y: canvasY - pt.y },
      })
      updatePenPreview()
    }
  }

  // Called from CanvasViewport @mouseup (fallback; document listeners are the primary path)
  function onCanvasMouseUp(_e: MouseEvent) {
    if (!isDrawing.value) return
    penDragging.value = false
  }

  // Keyboard handler — registered by useShortcuts
  function onKeyDown(e: KeyboardEvent): boolean {
    if (!isDrawing.value) return false

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      finishPath()
      return true
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancel()
      return true
    }

    // Backspace removes the last pen point
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      e.stopPropagation()
      if (rawPoints.value.length > 0) {
        const last = rawPoints.value.length - 1
        rawPoints.value.pop()
        penHandles.value.delete(last)
        updatePenPreview()
      }
      return true
    }

    // Block all other shortcuts while drawing
    return true
  }

  function finishPath() {
    if (rawPoints.value.length < 2) {
      cancel()
      return
    }

    // Build control points with explicit handles
    const controlPoints: MotionPathPoint[] = rawPoints.value.map((pt, i) => {
      const handleData = penHandles.value.get(i)
      const handleOut  = handleData?.out ?? { x: 0, y: 0 }
      const handleIn   = { x: -handleOut.x, y: -handleOut.y }
      const hasHandle  = handleOut.x !== 0 || handleOut.y !== 0

      return {
        x: pt.x,
        y: pt.y,
        handleIn:  i === 0 ? { x: 0, y: 0 } : handleIn,
        handleOut: i === rawPoints.value.length - 1 ? { x: 0, y: 0 } : handleOut,
        type: (hasHandle ? 'smooth' : 'corner') as MotionPathPoint['type'],
      }
    })

    // Auto-smooth corner points between other points (Catmull-Rom style)
    for (let i = 1; i < controlPoints.length - 1; i++) {
      const cp = controlPoints[i]
      if (cp.type === 'corner') {
        const prev = controlPoints[i - 1]
        const next = controlPoints[i + 1]
        const tx = (next.x - prev.x) * 0.25
        const ty = (next.y - prev.y) * 0.25
        cp.handleIn  = { x: -tx, y: -ty }
        cp.handleOut = { x: tx, y: ty }
        cp.type = 'smooth'
      }
    }

    const elementId = targetElementId.value
    if (!elementId) { cancel(); return }

    // Convert absolute canvas points → relative offsets from element center.
    // This makes el.x/el.y changes (drag) automatically translate the path.
    const el = editor.getElementById(elementId)
    const cx = el ? el.x + el.width / 2 : 0
    const cy = el ? el.y + el.height / 2 : 0
    const relativePoints: MotionPathPoint[] = controlPoints.map(pt => ({
      ...pt,
      x: pt.x - cx,
      y: pt.y - cy,
      // handles are relative to their anchor point — no adjustment needed
    }))

    const d = pointsToSvgPath(relativePoints)

    const startFrame = Math.round(timeline.currentFrame)
    const endFrame   = Math.min(
      startFrame + Math.round(timeline.fps * 2),
      timeline.totalFrames
    )

    const motionPath: MotionPath = {
      id: generateId('mp'),
      elementId,
      d,
      points: relativePoints,
      startFrame,
      endFrame,
      easing: 'ease-in-out',
      easingCurve: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
      orientToPath: false,
      loop: false,
    }

    editor.addMotionPath(motionPath)
    // No need to reposition element — path is relative, element stays in place

    onSave()
    _reset()
  }

  function cancel() {
    _reset()
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  function _reset() {
    isDrawing.value       = false
    rawPoints.value       = []
    penHandles.value      = new Map()
    penDragging.value     = false
    penDragPointIdx.value = -1
    previewD.value        = ''
    targetElementId.value = null
    if (ui.currentTool === 'motion-path') ui.setTool('select')
  }

  function onPenHandleMouseUp() {
    penDragging.value = false
  }

  function updatePenPreview() {
    const pts = rawPoints.value
    if (pts.length === 0) { previewD.value = ''; return }
    if (pts.length === 1) { previewD.value = `M ${pts[0].x},${pts[0].y}`; return }

    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev     = pts[i - 1]
      const curr     = pts[i]
      const prevH    = penHandles.value.get(i - 1)
      const currH    = penHandles.value.get(i)

      const cp1x = prev.x + (prevH?.out.x ?? 0)
      const cp1y = prev.y + (prevH?.out.y ?? 0)
      const cp2x = curr.x - (currH?.out.x ?? 0)
      const cp2y = curr.y - (currH?.out.y ?? 0)

      if (!prevH && !currH) {
        d += ` L ${curr.x},${curr.y}`
      } else {
        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`
      }
    }
    previewD.value = d
  }

  return {
    isDrawing,
    previewD,
    rawPoints,
    penHandles,
    penDragging,
    startDrawing,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    onKeyDown,
    finishPath,
    cancel,
  }
}
