import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { GroupElement } from '@/types/elements'

export function useMasking() {
  const editor = useEditorStore()
  const ui = useUiStore()

  // Creates a Figma-style mask group from 2+ selected elements.
  // The bottom element (lowest z-order / earliest in elements array) becomes the mask shape (childIds[0]).
  // All other selected elements become the clipped content (childIds[1..]).
  function createMask(selectedIds: string[], _frameId: string) {
    if (selectedIds.length < 2) return

    // Sort by layer order — lowest array index = bottom of stack = mask shape
    const sorted = [...selectedIds].sort((a, b) =>
      editor.elements.findIndex(e => e.id === a) - editor.elements.findIndex(e => e.id === b)
    )

    const groupId = editor.groupElements(sorted)
    if (!groupId) return

    const maskShape = editor.getElementById(sorted[0])
    editor.updateElement(groupId, {
      hasMask: true,
      name: `${maskShape?.name ?? 'Mask'} Mask`,
    } as Partial<GroupElement>)
    ui.select(groupId)
  }

  // Releases a mask group — ungroups it, leaving all children as free elements.
  function releaseMask(groupId: string) {
    const group = editor.getElementById(groupId)
    if (!group || group.type !== 'group' || !(group as GroupElement).hasMask) return
    const childIds = editor.ungroupElements(groupId)
    ui.selectAll(childIds)
  }

  return { createMask, releaseMask }
}
