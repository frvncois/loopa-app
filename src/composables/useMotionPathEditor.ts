import { ref } from 'vue'
import type { Ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import { pointsToSvgPath } from '@/lib/path/motionPathMath'
import type { MotionPathPoint } from '@/types/motionPath'

/** Catmull-Rom smooth handle generation — used when inserting/deleting control points. */
function regenSmoothHandles(points: { x: number; y: number }[]): MotionPathPoint[] {
  return points.map((pt, i) => {
    const prev = points[i - 1]
    const next = points[i + 1]
    let handleIn  = { x: 0, y: 0 }
    let handleOut = { x: 0, y: 0 }
    if (prev && next) {
      const tx = (next.x - prev.x) * 0.3
      const ty = (next.y - prev.y) * 0.3
      handleIn  = { x: -tx, y: -ty }
      handleOut = { x: tx, y: ty }
    } else if (next && !prev) {
      handleOut = { x: (next.x - pt.x) * 0.3, y: (next.y - pt.y) * 0.3 }
    } else if (prev && !next) {
      handleIn = { x: -(pt.x - prev.x) * 0.3, y: -(pt.y - prev.y) * 0.3 }
    }
    return { x: pt.x, y: pt.y, handleIn, handleOut, type: 'smooth' as const }
  })
}

type EditorStore = ReturnType<typeof useEditorStore>

interface DragState {
  pathId: string
  pointIndex: number
  handleType: 'point' | 'in' | 'out'
  startMouseX: number
  startMouseY: number
  startValue: { x: number; y: number }
}

export function useMotionPathEditor(
  editor: EditorStore,
  zoom: Ref<number>,
  onSave: () => void
) {
  // Which control point is "selected" (for visual highlight and delete)
  const selectedPoint = ref<{ pathId: string; idx: number } | null>(null)

  let dragState: DragState | null = null

  function startPathPointDrag(pathId: string, pointIdx: number, e: MouseEvent) {
    e.stopPropagation()
    const mp = editor.motionPaths.find(m => m.id === pathId)
    if (!mp) return
    const pt = mp.points[pointIdx]

    selectedPoint.value = { pathId, idx: pointIdx }

    dragState = {
      pathId,
      pointIndex: pointIdx,
      handleType: 'point',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startValue: { x: pt.x, y: pt.y },
    }

    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', onDragEnd, { once: true })
  }

  function startHandleDrag(pathId: string, pointIdx: number, type: 'in' | 'out', e: MouseEvent) {
    e.stopPropagation()
    const mp = editor.motionPaths.find(m => m.id === pathId)
    if (!mp) return
    const pt = mp.points[pointIdx]
    const handle = type === 'in' ? pt.handleIn : pt.handleOut

    dragState = {
      pathId,
      pointIndex: pointIdx,
      handleType: type,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startValue: { x: handle.x, y: handle.y },
    }

    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', onDragEnd, { once: true })
  }

  function onDrag(e: MouseEvent) {
    if (!dragState) return
    const mp = editor.motionPaths.find(m => m.id === dragState!.pathId)
    if (!mp) return

    const z = zoom.value || 1
    const dx = (e.clientX - dragState.startMouseX) / z
    const dy = (e.clientY - dragState.startMouseY) / z

    const pt = mp.points[dragState.pointIndex] as MotionPathPoint

    if (dragState.handleType === 'point') {
      pt.x = dragState.startValue.x + dx
      pt.y = dragState.startValue.y + dy
    } else if (dragState.handleType === 'in') {
      pt.handleIn.x = dragState.startValue.x + dx
      pt.handleIn.y = dragState.startValue.y + dy
      if (pt.type === 'symmetric') {
        pt.handleOut.x = -pt.handleIn.x
        pt.handleOut.y = -pt.handleIn.y
      } else if (pt.type === 'smooth') {
        // Mirror direction, keep outgoing magnitude
        const outLen = Math.hypot(pt.handleOut.x, pt.handleOut.y)
        const inLen = Math.hypot(pt.handleIn.x, pt.handleIn.y)
        if (inLen > 0 && outLen > 0) {
          const scale = outLen / inLen
          pt.handleOut.x = -pt.handleIn.x * scale
          pt.handleOut.y = -pt.handleIn.y * scale
        }
      }
    } else {
      pt.handleOut.x = dragState.startValue.x + dx
      pt.handleOut.y = dragState.startValue.y + dy
      if (pt.type === 'symmetric') {
        pt.handleIn.x = -pt.handleOut.x
        pt.handleIn.y = -pt.handleOut.y
      } else if (pt.type === 'smooth') {
        const inLen = Math.hypot(pt.handleIn.x, pt.handleIn.y)
        const outLen = Math.hypot(pt.handleOut.x, pt.handleOut.y)
        if (outLen > 0 && inLen > 0) {
          const scale = inLen / outLen
          pt.handleIn.x = -pt.handleOut.x * scale
          pt.handleIn.y = -pt.handleOut.y * scale
        }
      }
    }

    // Rebuild d string
    mp.d = pointsToSvgPath(mp.points)
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDrag)
    dragState = null
    onSave()
  }

  /** Delete the currently selected control point (minimum 2 points kept). */
  function deleteSelectedPoint() {
    if (!selectedPoint.value) return
    const { pathId, idx } = selectedPoint.value
    const mp = editor.motionPaths.find(m => m.id === pathId)
    if (!mp || mp.points.length <= 2) return

    mp.points.splice(idx, 1)

    // Regenerate smooth handles
    const coords = mp.points.map(p => ({ x: p.x, y: p.y }))
    const regen = regenSmoothHandles(coords)
    for (let i = 0; i < mp.points.length; i++) {
      mp.points[i].handleIn  = regen[i].handleIn
      mp.points[i].handleOut = regen[i].handleOut
    }
    mp.d = pointsToSvgPath(mp.points)

    selectedPoint.value = null
    onSave()
  }

  /** Add a new point after afterIndex at (canvasX, canvasY). */
  function addPointOnPath(pathId: string, afterIndex: number, canvasX: number, canvasY: number) {
    const mp = editor.motionPaths.find(m => m.id === pathId)
    if (!mp) return

    const newPoint: MotionPathPoint = {
      x: canvasX,
      y: canvasY,
      handleIn:  { x: 0, y: 0 },
      handleOut: { x: 0, y: 0 },
      type: 'smooth',
    }
    mp.points.splice(afterIndex + 1, 0, newPoint)

    const coords = mp.points.map(p => ({ x: p.x, y: p.y }))
    const regen = regenSmoothHandles(coords)
    for (let i = 0; i < mp.points.length; i++) {
      mp.points[i].handleIn  = regen[i].handleIn
      mp.points[i].handleOut = regen[i].handleOut
    }
    mp.d = pointsToSvgPath(mp.points)
    onSave()
  }

  function clearSelectedPoint() {
    selectedPoint.value = null
  }

  return {
    selectedPoint,
    startPathPointDrag,
    startHandleDrag,
    deleteSelectedPoint,
    addPointOnPath,
    clearSelectedPoint,
  }
}
