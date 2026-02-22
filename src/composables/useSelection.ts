import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { Element, GroupElement } from '@/types/elements'
import { getMultiBounds } from '@/lib/elements/ElementBounds'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>

export function useSelection(
  editorStore: EditorStore,
  uiStore: UiStore,
  getAnimatedEl?: (id: string) => Element | null
) {
  const selectedElements = computed(() =>
    editorStore.elements.filter(el => uiStore.selectedIds.has(el.id))
  )

  const selectedElement = computed(() =>
    uiStore.selectedIds.size === 1
      ? selectedElements.value[0] ?? null
      : null
  )

  const isMultiSelect = computed(() => uiStore.selectedIds.size > 1)

  const selectionBounds = computed(() => {
    if (selectedElements.value.length === 0) return null

    const elsForBounds: Element[] = []
    for (const el of selectedElements.value) {
      const animated = getAnimatedEl ? (getAnimatedEl(el.id) ?? el) : el

      // For a mask group selected from outside: use only the mask shape's bounds.
      // The mask shape (first child) defines the visible clipping region.
      if (
        animated.type === 'group' &&
        (animated as GroupElement).hasMask &&
        (animated as GroupElement).childIds.length > 0
      ) {
        const maskShapeId = (animated as GroupElement).childIds[0]
        const maskShape = getAnimatedEl
          ? (getAnimatedEl(maskShapeId) ?? editorStore.getElementById(maskShapeId))
          : editorStore.getElementById(maskShapeId)
        if (maskShape) {
          elsForBounds.push(maskShape)
          continue
        }
      }

      elsForBounds.push(animated)
    }

    if (elsForBounds.length === 0) return null
    return getMultiBounds(elsForBounds)
  })

  function select(id: string) { uiStore.select(id) }
  function selectAll() {
    const frameId = uiStore.activeFrameId
    const els = frameId
      ? editorStore.getTopLevelElementsForFrame(frameId)
      : editorStore.elements
    uiStore.selectAll(els.map(el => el.id))
  }
  function clearSelection() { uiStore.clearSelection() }
  function toggleSelection(id: string) { uiStore.toggleSelection(id) }

  function marqueeSelect(rect: { x: number; y: number; width: number; height: number }) {
    const rx = rect.width < 0 ? rect.x + rect.width : rect.x
    const ry = rect.height < 0 ? rect.y + rect.height : rect.y
    const rw = Math.abs(rect.width)
    const rh = Math.abs(rect.height)

    const frameId = uiStore.activeFrameId
    const pool = frameId
      ? editorStore.getTopLevelElementsForFrame(frameId)
      : editorStore.elements

    const ids = pool
      .filter(el => {
        const aEl = getAnimatedEl ? (getAnimatedEl(el.id) ?? el) : el
        return aEl.x < rx + rw && aEl.x + aEl.width > rx &&
               aEl.y < ry + rh && aEl.y + aEl.height > ry
      })
      .map(el => el.id)

    uiStore.selectedIds = new Set(ids)
  }

  return {
    selectedElements, selectedElement, isMultiSelect, selectionBounds,
    select, selectAll, clearSelection, toggleSelection, marqueeSelect
  }
}
