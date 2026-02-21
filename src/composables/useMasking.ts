import { useEditorStore } from '@/stores/editorStore'

export function useMasking() {
  const editor = useEditorStore()

  // Designate maskElementId as the mask, clipping targetElementIds
  function createMask(maskElementId: string, targetElementIds: string[]) {
    editor.updateElement(maskElementId, {
      isMask: true,
      maskedElementIds: targetElementIds,
    })
    for (const id of targetElementIds) {
      editor.updateElement(id, { maskedById: maskElementId })
    }
  }

  // Remove all masking from a mask element and its masked elements
  function releaseMask(maskElementId: string) {
    const el = editor.getElementById(maskElementId)
    if (!el?.isMask) return
    for (const id of (el.maskedElementIds ?? [])) {
      editor.updateElement(id, { maskedById: null })
    }
    editor.updateElement(maskElementId, { isMask: false, maskedElementIds: [] })
  }

  // Remove a single element from its mask
  function removeFromMask(elementId: string) {
    const el = editor.getElementById(elementId)
    if (!el?.maskedById) return
    const maskId = el.maskedById
    const mask = editor.getElementById(maskId)
    if (mask) {
      const newMasked = (mask.maskedElementIds ?? []).filter(id => id !== elementId)
      editor.updateElement(maskId, { maskedElementIds: newMasked })
    }
    editor.updateElement(elementId, { maskedById: null })
  }

  return { createMask, releaseMask, removeFromMask }
}
