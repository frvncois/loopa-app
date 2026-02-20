import { ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import { clamp } from '@/lib/utils/math'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export function useElementResize(
  editorStore: EditorStore,
  uiStore: UiStore,
  canvas: Canvas
) {
  const isResizing = ref(false)
  let handle = ''
  let startSvg = { x: 0, y: 0 }
  let startEl = { x: 0, y: 0, width: 0, height: 0 }
  let targetId = ''

  function onResizeStart(e: MouseEvent, h: string, id: string) {
    e.stopPropagation()
    e.preventDefault()
    handle = h
    targetId = id
    isResizing.value = true
    startSvg = canvas.screenToSvg(e.clientX, e.clientY)

    const el = editorStore.getElementById(id)
    if (el) startEl = { x: el.x, y: el.y, width: el.width, height: el.height }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onMove(e: MouseEvent) {
    const cur = canvas.screenToSvg(e.clientX, e.clientY)
    const dx = cur.x - startSvg.x
    const dy = cur.y - startSvg.y

    let { x, y, width, height } = startEl

    if (handle.includes('e')) width = clamp(width + dx, 1, Infinity)
    if (handle.includes('w')) { x = x + dx; width = clamp(width - dx, 1, Infinity) }
    if (handle.includes('s')) height = clamp(height + dy, 1, Infinity)
    if (handle.includes('n')) { y = y + dy; height = clamp(height - dy, 1, Infinity) }

    editorStore.updateElement(targetId, { x, y, width, height })
  }

  function onUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  return { onResizeStart, isResizing }
}
