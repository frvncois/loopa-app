import { ref, computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { PathPoint, PathElement } from '@/types/elements'
import { pathPointsToD } from '@/lib/path/PathBuilder'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export function usePathEditor(
  editor: EditorStore,
  ui: UiStore,
  canvas: Canvas,
  onSave: () => void
) {
  /** The currently-selected anchor point ID in the editor */
  const editingPointId = ref<string | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────

  function getEditingPath(): PathElement | null {
    if (!ui.editingPathId) return null
    const el = editor.elements.find(e => e.id === ui.editingPathId)
    if (!el || el.type !== 'path') return null
    return el as PathElement
  }

  function commitPoints(points: PathPoint[]) {
    const el = getEditingPath()
    if (!el) return
    const d = pathPointsToD(points, el.closed)
    editor.updateElement(el.id, { points, d } as any)
  }

  // ── Point dragging ───────────────────────────────────────────────

  function onPointMouseDown(e: MouseEvent, pointId: string) {
    e.stopPropagation()
    editingPointId.value = pointId

    const el = getEditingPath()
    if (!el) return
    const pt = el.points.find(p => p.id === pointId)
    if (!pt) return

    const startSvg = canvas.screenToSvg(e.clientX, e.clientY)
    const startX = pt.x, startY = pt.y
    const startIn  = pt.handleIn  ? { ...pt.handleIn  } : null
    const startOut = pt.handleOut ? { ...pt.handleOut } : null

    function onMove(ev: MouseEvent) {
      const cur = canvas.screenToSvg(ev.clientX, ev.clientY)
      const dx = cur.x - startSvg.x
      const dy = cur.y - startSvg.y
      const path = getEditingPath()
      if (!path) return
      commitPoints(path.points.map(p => {
        if (p.id !== pointId) return p
        return {
          ...p,
          x: startX + dx,
          y: startY + dy,
          handleIn:  startIn  ? { x: startIn.x  + dx, y: startIn.y  + dy } : null,
          handleOut: startOut ? { x: startOut.x + dx, y: startOut.y + dy } : null,
        }
      }))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      onSave()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Handle dragging ──────────────────────────────────────────────

  function onHandleMouseDown(e: MouseEvent, pointId: string, handle: 'in' | 'out') {
    e.stopPropagation()
    const el = getEditingPath()
    if (!el) return
    const pt = el.points.find(p => p.id === pointId)
    if (!pt) return

    const isAlt = e.altKey
    const startSvg = canvas.screenToSvg(e.clientX, e.clientY)
    const current = handle === 'in' ? pt.handleIn : pt.handleOut
    const startH = current ? { ...current } : { x: pt.x, y: pt.y }

    function onMove(ev: MouseEvent) {
      const cur = canvas.screenToSvg(ev.clientX, ev.clientY)
      const dx = cur.x - startSvg.x
      const dy = cur.y - startSvg.y
      const hx = startH.x + dx
      const hy = startH.y + dy
      const path = getEditingPath()
      if (!path) return

      commitPoints(path.points.map(p => {
        if (p.id !== pointId) return p
        // Mirror the opposite handle for symmetric/smooth types (unless Alt held)
        if (!isAlt && (p.type === 'symmetric' || p.type === 'smooth')) {
          const mirrorDx = p.x - hx
          const mirrorDy = p.y - hy
          if (handle === 'in') {
            return { ...p, handleIn: { x: hx, y: hy }, handleOut: { x: p.x + mirrorDx, y: p.y + mirrorDy } }
          } else {
            return { ...p, handleOut: { x: hx, y: hy }, handleIn: { x: p.x + mirrorDx, y: p.y + mirrorDy } }
          }
        }
        // Alt held: break tangent → corner type
        if (handle === 'in')  return { ...p, handleIn:  { x: hx, y: hy }, type: isAlt ? 'corner' as const : p.type }
        return { ...p, handleOut: { x: hx, y: hy }, type: isAlt ? 'corner' as const : p.type }
      }))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      onSave()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Point type cycling (Alt+click on anchor) ─────────────────────

  function cyclePointType(pointId: string) {
    const el = getEditingPath()
    if (!el) return
    commitPoints(el.points.map(p => {
      if (p.id !== pointId) return p
      const types: PathPoint['type'][] = ['symmetric', 'smooth', 'corner']
      const next = types[(types.indexOf(p.type) + 1) % types.length]
      if (next === 'corner') return { ...p, handleIn: null, handleOut: null, type: next }
      return { ...p, type: next }
    }))
    onSave()
  }

  // ── Delete selected point ────────────────────────────────────────

  function deleteSelectedPoint() {
    if (!editingPointId.value) return
    const el = getEditingPath()
    if (!el) return
    const newPoints = el.points.filter(p => p.id !== editingPointId.value)
    editingPointId.value = null
    if (newPoints.length < 2) {
      editor.deleteElements([el.id])
      ui.exitPathEditMode()
    } else {
      commitPoints(newPoints)
    }
    onSave()
  }

  // ── Update individual point fields (used by PathSection) ─────────

  function updatePoint(pointId: string, updates: Partial<PathPoint>) {
    const el = getEditingPath()
    if (!el) return
    commitPoints(el.points.map(p => p.id === pointId ? { ...p, ...updates } : p))
  }

  // ── Computed ─────────────────────────────────────────────────────

  const editingPath = computed(() => getEditingPath())

  const selectedPoint = computed((): PathPoint | null => {
    if (!editingPointId.value) return null
    return editingPath.value?.points.find(p => p.id === editingPointId.value) ?? null
  })

  return {
    editingPointId,
    editingPath,
    selectedPoint,
    onPointMouseDown,
    onHandleMouseDown,
    cyclePointType,
    deleteSelectedPoint,
    updatePoint
  }
}
