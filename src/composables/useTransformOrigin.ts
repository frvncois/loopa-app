import { ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { useHistory } from '@/composables/useHistory'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>
type History = ReturnType<typeof useHistory>

const SNAP_POINTS = [0, 0.25, 0.5, 0.75, 1]

function snapOrigin(v: number): number {
  for (const s of SNAP_POINTS) {
    if (Math.abs(v - s) < 0.05) return s
  }
  return v
}

export function useTransformOrigin(
  _editor: EditorStore,
  uiStore: UiStore,
  canvas: Canvas,
  getAnimatedElement: (id: string) => Element | null,
  setAnimatedProperty: (id: string, props: Partial<AnimatableProps>) => void,
  history: History
) {
  const isDraggingOrigin = ref(false)

  function onOriginMouseDown(e: MouseEvent, elementId: string) {
    e.preventDefault()
    e.stopPropagation()
    isDraggingOrigin.value = true
    uiStore.setTransforming(true)

    const el = getAnimatedElement(elementId)
    if (!el) {
      isDraggingOrigin.value = false
      uiStore.setTransforming(false)
      return
    }

    // Snapshot element state at drag start
    const startEl = {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation ?? 0,
    }

    function onMove(mv: MouseEvent) {
      const svgPt = canvas.screenToSvg(mv.clientX, mv.clientY)

      // Rotate the SVG point into element-local space (inverse rotation)
      const rad = -(startEl.rotation * Math.PI) / 180
      const ecx = startEl.x + startEl.width / 2
      const ecy = startEl.y + startEl.height / 2
      const dx = svgPt.x - ecx
      const dy = svgPt.y - ecy
      const lx = ecx + dx * Math.cos(rad) - dy * Math.sin(rad)
      const ly = ecy + dx * Math.sin(rad) + dy * Math.cos(rad)

      // Normalize to 0-1 within element bounds
      let nx = (lx - startEl.x) / startEl.width
      let ny = (ly - startEl.y) / startEl.height

      // Clamp and snap
      nx = Math.max(0, Math.min(1, nx))
      ny = Math.max(0, Math.min(1, ny))
      nx = snapOrigin(nx)
      ny = snapOrigin(ny)

      setAnimatedProperty(elementId, { transformOriginX: nx, transformOriginY: ny })
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      isDraggingOrigin.value = false
      uiStore.setTransforming(false)
      history.save()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { isDraggingOrigin, onOriginMouseDown }
}
