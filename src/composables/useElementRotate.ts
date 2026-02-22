import { ref } from 'vue'
import type { Ref } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import type { Bounds } from '@/lib/elements/ElementBounds'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export function useElementRotate(
  editorStore: EditorStore,
  uiStore: UiStore,
  canvas: Canvas,
  getAnimatedEl?: (id: string) => Element | null,
  setAnimatedProp?: (id: string, props: Partial<AnimatableProps>) => void,
  isDraggingOrigin?: Ref<boolean>
) {
  const isRotating = ref(false)
  const rotationDeg = ref(0) // absolute rotation of first element, shown as label

  function onRotateStart(e: MouseEvent, ids: string[], bounds: Bounds) {
    if (isDraggingOrigin?.value) return
    e.preventDefault()
    e.stopPropagation()
    if (ids.length === 0) return

    isRotating.value = true
    uiStore.setTransforming(true)

    // For single-select: use the element's transform origin as pivot
    // For multi-select: use the group center
    let cx: number
    let cy: number
    if (ids.length === 1) {
      const el = getAnimatedEl ? getAnimatedEl(ids[0]) : editorStore.getElementById(ids[0])
      if (el) {
        const ox = (el as any).transformOriginX ?? (el as any).transformOrigin?.x ?? 0.5
        const oy = (el as any).transformOriginY ?? (el as any).transformOrigin?.y ?? 0.5
        cx = el.x + ox * el.width
        cy = el.y + oy * el.height
      } else {
        cx = bounds.x + bounds.width / 2
        cy = bounds.y + bounds.height / 2
      }
    } else {
      cx = bounds.x + bounds.width / 2
      cy = bounds.y + bounds.height / 2
    }

    // Angle from center to initial mouse position
    const startSvg = canvas.screenToSvg(e.clientX, e.clientY)
    const startAngle = Math.atan2(startSvg.y - cy, startSvg.x - cx) * (180 / Math.PI)

    // Snapshot each element's animated position and rotation at drag start
    const startStates = ids
      .map(id => {
        const el = getAnimatedEl ? getAnimatedEl(id) : editorStore.getElementById(id)
        if (!el) return null
        return {
          id,
          rotation: el.rotation ?? 0,
          cx: el.x + el.width / 2,
          cy: el.y + el.height / 2,
          width: el.width,
          height: el.height,
        }
      })
      .filter(Boolean) as { id: string; rotation: number; cx: number; cy: number; width: number; height: number }[]

    function onMove(e: MouseEvent) {
      const currentSvg = canvas.screenToSvg(e.clientX, e.clientY)
      const currentAngle = Math.atan2(currentSvg.y - cy, currentSvg.x - cx) * (180 / Math.PI)
      let delta = currentAngle - startAngle

      // Shift: snap to 15° increments
      if (e.shiftKey) delta = Math.round(delta / 15) * 15

      const rad = delta * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      for (const s of startStates) {
        // Normalize rotation to -180..180
        let newRot = s.rotation + delta
        while (newRot > 180) newRot -= 360
        while (newRot < -180) newRot += 360

        if (ids.length === 1) {
          // Single-select: only update rotation. The SVG transform uses the
          // element's transform origin as pivot, so x/y must stay unchanged.
          if (setAnimatedProp) {
            setAnimatedProp(s.id, { rotation: newRot })
          } else {
            editorStore.updateElement(s.id, { rotation: newRot })
          }
        } else {
          // Multi-select: orbit each element's center around the group center
          const ox = s.cx - cx
          const oy = s.cy - cy
          const newCx = cx + ox * cos - oy * sin
          const newCy = cy + ox * sin + oy * cos
          const newX = newCx - s.width / 2
          const newY = newCy - s.height / 2

          if (setAnimatedProp) {
            setAnimatedProp(s.id, { x: newX, y: newY, rotation: newRot })
          } else {
            editorStore.updateElement(s.id, { x: newX, y: newY, rotation: newRot })
          }
        }
      }

      // Track absolute rotation of first element for the label
      if (startStates.length > 0) {
        let labelRot = startStates[0].rotation + delta
        while (labelRot > 180) labelRot -= 360
        while (labelRot < -180) labelRot += 360
        rotationDeg.value = labelRot
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      isRotating.value = false
      uiStore.setTransforming(false)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { isRotating, rotationDeg, onRotateStart }
}
