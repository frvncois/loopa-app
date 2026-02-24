import { ref } from 'vue'
import type { Ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { snapToGrid } from '@/lib/utils/math'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export function useElementDrag(
  editorStore: EditorStore,
  uiStore: UiStore,
  canvas: Canvas,
  getAnimatedEl?: (id: string) => Element | null,
  setAnimatedProp?: (id: string, props: Partial<AnimatableProps>) => void,
  isDraggingOrigin?: Ref<boolean>
) {
  const isDragging = ref(false)
  let startSvg = { x: 0, y: 0 }
  let startPositions = new Map<string, { x: number; y: number }>()

  // ── Ctrl+drag: 3D rotate ─────────────────────────────────────────────────
  let rotate3dId = ''
  let rotate3dMouseX = 0
  let rotate3dMouseY = 0
  let rotate3dStartRX = 0
  let rotate3dStartRY = 0

  function start3dRotate(e: MouseEvent, id: string) {
    const el = getAnimatedEl ? getAnimatedEl(id) : editorStore.getElementById(id)
    if (!el) return
    rotate3dId = id
    rotate3dMouseX = e.clientX
    rotate3dMouseY = e.clientY
    rotate3dStartRX = (el as any).rotateX ?? 0
    rotate3dStartRY = (el as any).rotateY ?? 0
    uiStore.setTransforming(true)
    document.addEventListener('mousemove', on3dMove)
    document.addEventListener('mouseup', on3dUp)
  }

  function on3dMove(e: MouseEvent) {
    const dx = e.clientX - rotate3dMouseX
    const dy = e.clientY - rotate3dMouseY
    const newRY = Math.max(-90, Math.min(90, Math.round(rotate3dStartRY + dx * 0.5)))
    const newRX = Math.max(-90, Math.min(90, Math.round(rotate3dStartRX - dy * 0.5)))
    if (setAnimatedProp) {
      setAnimatedProp(rotate3dId, { rotateX: newRX, rotateY: newRY })
    } else {
      editorStore.updateElement(rotate3dId, { rotateX: newRX, rotateY: newRY } as any)
    }
  }

  function on3dUp() {
    document.removeEventListener('mousemove', on3dMove)
    document.removeEventListener('mouseup', on3dUp)
    uiStore.setTransforming(false)
  }

  function onElementMouseDown(e: MouseEvent, id: string): string {
    if (isDraggingOrigin?.value) return id

    // Ctrl+drag (without Meta/Alt): 3D rotate mode
    if (e.ctrlKey && !e.metaKey && !e.altKey) {
      e.stopPropagation()
      uiStore.select(id)
      start3dRotate(e, id)
      return id
    }

    e.stopPropagation()

    // Group bubble-up: if clicking on a child, select the parent group (unless we're inside it)
    const parentGroupId = editorStore.childToGroupMap.get(id)
    const effectiveId = (parentGroupId && uiStore.activeGroupId !== parentGroupId) ? parentGroupId : id

    if (e.shiftKey) uiStore.toggleSelection(effectiveId)
    else if (!uiStore.selectedIds.has(effectiveId)) uiStore.select(effectiveId)

    isDragging.value = false
    startSvg = canvas.screenToSvg(e.clientX, e.clientY)

    if (e.altKey) {
      // Alt+drag: duplicate selected elements and drag the copies.
      // Originals stay in place; duplicates appear at the same position and follow the cursor.
      const originalIds = [...uiStore.selectedIds]

      // Capture original positions before duplicating
      const origPositions = new Map<string, { x: number; y: number }>()
      for (const selId of originalIds) {
        const el = getAnimatedEl ? getAnimatedEl(selId) : editorStore.getElementById(selId)
        if (el) origPositions.set(selId, { x: el.x, y: el.y })
      }

      // Duplicate all selected elements (returns new IDs in same order)
      const newIds = editorStore.duplicateElements(originalIds)

      // Reset duplicates to original positions (duplicateElements applies a +20 offset by default)
      // and build startPositions for the drag using the new IDs.
      startPositions = new Map()
      for (let i = 0; i < originalIds.length; i++) {
        const newId = newIds[i]
        const origPos = origPositions.get(originalIds[i])
        if (!newId || !origPos) continue
        // Move duplicate back to exact original position (also propagates to group children)
        editorStore.updateElement(newId, { x: origPos.x, y: origPos.y })
        startPositions.set(newId, { x: origPos.x, y: origPos.y })
      }

      // Select the duplicates, originals become deselected
      uiStore.selectAll(newIds.filter(Boolean))
    } else {
      // Normal drag: track start positions of all selected elements
      startPositions = new Map()
      for (const selId of uiStore.selectedIds) {
        const el = getAnimatedEl ? getAnimatedEl(selId) : editorStore.getElementById(selId)
        if (el) startPositions.set(selId, { x: el.x, y: el.y })
      }
    }

    uiStore.setTransforming(true)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return effectiveId
  }

  function onMove(e: MouseEvent) {
    const current = canvas.screenToSvg(e.clientX, e.clientY)
    let dx = current.x - startSvg.x
    let dy = current.y - startSvg.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.value = true

    // Shift: lock to dominant axis (total delta from drag start, not per-frame — no flicker)
    if (e.shiftKey) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0
      else dx = 0
    }

    for (const [id, pos] of startPositions) {
      let nx = pos.x + dx
      let ny = pos.y + dy
      if (uiStore.snapToGrid) {
        nx = snapToGrid(nx, uiStore.gridSize)
        ny = snapToGrid(ny, uiStore.gridSize)
      }
      if (setAnimatedProp) {
        setAnimatedProp(id, { x: nx, y: ny })
      } else {
        editorStore.updateElement(id, { x: nx, y: ny })
      }
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    uiStore.setTransforming(false)
    setTimeout(() => { isDragging.value = false }, 10)
  }

  return { onElementMouseDown, isDragging }
}
