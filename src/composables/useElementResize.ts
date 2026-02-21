import { ref } from 'vue'
import type { Ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { clamp } from '@/lib/utils/math'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export function useElementResize(
  editorStore: EditorStore,
  _uiStore: UiStore,
  canvas: Canvas,
  getAnimatedEl?: (id: string) => Element | null,
  setAnimatedProp?: (id: string, props: Partial<AnimatableProps>) => void,
  isDraggingOrigin?: Ref<boolean>
) {
  const isResizing = ref(false)
  let handle = ''
  let startSvg = { x: 0, y: 0 }
  let startEl = { x: 0, y: 0, width: 0, height: 0, rotation: 0 }
  let targetId = ''

  function onResizeStart(e: MouseEvent, h: string, id: string) {
    if (isDraggingOrigin?.value) return
    e.stopPropagation()
    e.preventDefault()
    handle = h
    targetId = id
    isResizing.value = true
    startSvg = canvas.screenToSvg(e.clientX, e.clientY)

    const el = getAnimatedEl ? getAnimatedEl(id) : editorStore.getElementById(id)
    if (el) {
      startEl = {
        x: el.x, y: el.y,
        width: el.width, height: el.height,
        rotation: el.rotation ?? 0,
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onMove(e: MouseEvent) {
    const cur = canvas.screenToSvg(e.clientX, e.clientY)
    const dx = cur.x - startSvg.x
    const dy = cur.y - startSvg.y

    // Rotate the SVG-space delta into the element's local coordinate space.
    const rad = -startEl.rotation * Math.PI / 180
    const localDx = dx * Math.cos(rad) - dy * Math.sin(rad)
    const localDy = dx * Math.sin(rad) + dy * Math.cos(rad)

    let { x, y, width, height } = startEl

    if (handle.includes('e')) width  = clamp(width  + localDx, 1, Infinity)
    if (handle.includes('w')) { x   += localDx; width  = clamp(width  - localDx, 1, Infinity) }
    if (handle.includes('s')) height = clamp(height + localDy, 1, Infinity)
    if (handle.includes('n')) { y   += localDy; height = clamp(height - localDy, 1, Infinity) }

    if (setAnimatedProp) {
      setAnimatedProp(targetId, { x, y, width, height })
    } else {
      editorStore.updateElement(targetId, { x, y, width, height })
    }
  }

  function onUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  return { onResizeStart, isResizing }
}
