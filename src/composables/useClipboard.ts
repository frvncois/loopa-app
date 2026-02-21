import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import { useClipboardStore } from '@/stores/clipboardStore'

export function useClipboard(
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>
) {
  const clipboard = useClipboardStore()

  function copy() {
    const ids = [...ui.selectedIds]
    if (ids.length === 0) return
    const elements = editor.elements.filter(el => ids.includes(el.id))
    const keyframes = editor.keyframes.filter(kf => ids.includes(kf.elementId))
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
