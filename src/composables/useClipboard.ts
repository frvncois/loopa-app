import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import type { GroupElement } from '@/types/elements'

export function useClipboard(
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>
) {
  const clipboard = useClipboardStore()

  function copy() {
    const ids = [...ui.selectedIds]
    if (ids.length === 0) return

    // Expand selection to include group children recursively
    const allIds = new Set<string>(ids)
    function collectChildren(id: string) {
      const el = editor.elements.find(e => e.id === id)
      if (el?.type === 'group') {
        for (const childId of (el as GroupElement).childIds ?? []) {
          if (!allIds.has(childId)) {
            allIds.add(childId)
            collectChildren(childId)
          }
        }
      }
    }
    for (const id of ids) collectChildren(id)

    const elements = editor.elements.filter(el => allIds.has(el.id))
    const keyframes = editor.keyframes.filter(kf => allIds.has(kf.elementId))
    clipboard.copy(elements, keyframes, editor.projectId ?? '')
  }

  function cut() {
    copy()
    const ids = [...ui.selectedIds]
    editor.deleteElements(ids)
    ui.clearSelection()
  }

  function paste() {
    if (!clipboard.hasPasteData) return
    const { elements, keyframes } = clipboard.paste(editor.projectId ?? '')
    const frameId = ui.activeFrameId ?? ''
    for (const el of elements) editor.addElement(el, frameId)
    for (const kf of keyframes) editor.addKeyframe(kf)
    ui.selectAll(elements.map(el => el.id))
  }

  const canPaste = computed(() => clipboard.hasPasteData)

  return { copy, cut, paste, canPaste }
}
