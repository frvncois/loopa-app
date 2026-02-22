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
  uiStore: UiStore,
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

  // For mask group resize: content siblings scaled proportionally with the mask shape
  type SiblingState = { id: string; x: number; y: number; width: number; height: number }
  let proportionalSiblings: SiblingState[] = []

  function onResizeStart(e: MouseEvent, h: string, id: string, siblingIds?: string[]) {
    if (isDraggingOrigin?.value) return
    e.stopPropagation()
    e.preventDefault()
    handle = h
    targetId = id
    isResizing.value = true
    uiStore.setTransforming(true)
    startSvg = canvas.screenToSvg(e.clientX, e.clientY)

    const el = getAnimatedEl ? getAnimatedEl(id) : editorStore.getElementById(id)
    if (el) {
      startEl = {
        x: el.x, y: el.y,
        width: el.width, height: el.height,
        rotation: el.rotation ?? 0,
      }
    }

    // Capture start states of proportional siblings (mask group content elements)
    proportionalSiblings = []
    if (siblingIds?.length) {
      for (const sid of siblingIds) {
        const sib = getAnimatedEl ? getAnimatedEl(sid) : editorStore.getElementById(sid)
        if (sib) proportionalSiblings.push({ id: sid, x: sib.x, y: sib.y, width: sib.width, height: sib.height })
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

    // Proportional scaling for mask group content siblings.
    // Anchor = the corner/edge opposite to the dragged handle (stays fixed).
    if (proportionalSiblings.length > 0 && startEl.width > 0 && startEl.height > 0) {
      const sx = width / startEl.width
      const sy = height / startEl.height
      const anchorX = handle.includes('w') ? startEl.x + startEl.width : startEl.x
      const anchorY = handle.includes('n') ? startEl.y + startEl.height : startEl.y

      for (const sib of proportionalSiblings) {
        const newX = anchorX + (sib.x - anchorX) * sx
        const newY = anchorY + (sib.y - anchorY) * sy
        const newW = Math.max(1, sib.width * sx)
        const newH = Math.max(1, sib.height * sy)
        if (setAnimatedProp) {
          setAnimatedProp(sib.id, { x: newX, y: newY, width: newW, height: newH })
        } else {
          editorStore.updateElement(sib.id, { x: newX, y: newY, width: newW, height: newH })
        }
      }
    }
  }

  function onUp() {
    isResizing.value = false
    uiStore.setTransforming(false)
    proportionalSiblings = []
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  return { onResizeStart, isResizing }
}
