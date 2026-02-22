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

  function onElementMouseDown(e: MouseEvent, id: string): string {
    if (isDraggingOrigin?.value) return id
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
    const dx = current.x - startSvg.x
    const dy = current.y - startSvg.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.value = true

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
