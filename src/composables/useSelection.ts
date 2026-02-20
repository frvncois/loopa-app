import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import { getMultiBounds } from '@/lib/elements/ElementBounds'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>

export function useSelection(editorStore: EditorStore, uiStore: UiStore) {
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
    return getMultiBounds(selectedElements.value)
  })

  function select(id: string) { uiStore.select(id) }
  function selectAll() { uiStore.selectAll(editorStore.elements.map(el => el.id)) }
  function clearSelection() { uiStore.clearSelection() }
  function toggleSelection(id: string) { uiStore.toggleSelection(id) }

  function marqueeSelect(rect: { x: number; y: number; width: number; height: number }) {
    const rx = rect.width < 0 ? rect.x + rect.width : rect.x
    const ry = rect.height < 0 ? rect.y + rect.height : rect.y
    const rw = Math.abs(rect.width)
    const rh = Math.abs(rect.height)

    const ids = editorStore.elements
      .filter(el => {
        return el.x < rx + rw && el.x + el.width > rx &&
               el.y < ry + rh && el.y + el.height > ry
      })
      .map(el => el.id)

    uiStore.selectedIds = new Set(ids)
  }

  return {
    selectedElements, selectedElement, isMultiSelect, selectionBounds,
    select, selectAll, clearSelection, toggleSelection, marqueeSelect
  }
}
