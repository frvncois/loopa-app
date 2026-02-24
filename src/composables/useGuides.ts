import { ref, type Ref } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import type { Guide } from '@/types/guides'

interface CanvasRef {
  zoom: Ref<number>
  panX: Ref<number>
  panY: Ref<number>
  screenToSvg: (cx: number, cy: number) => { x: number; y: number }
}

export function useGuides(
  viewportEl: Ref<HTMLElement | undefined>,
  canvas: CanvasRef,
  artboardW: Ref<number>,
  artboardH: Ref<number>
) {
  const ui = useUiStore()

  // ── Drag state ──
  const isDragging = ref(false)
  const dragGuideId = ref<string | null>(null)
  const dragAxis = ref<Guide['axis']>('horizontal')
  const dragPosition = ref(0) // live SVG position while dragging
  const isNewGuide = ref(false)
  const dragScreenX = ref(0)  // cursor position relative to viewportEl for tooltip
  const dragScreenY = ref(0)

  /**
   * Called on mousedown inside a ruler.
   * axis: 'horizontal' if from the top ruler, 'vertical' if from the right ruler.
   */
  function startDragFromRuler(e: MouseEvent, axis: Guide['axis']) {
    e.preventDefault()
    e.stopPropagation()

    isDragging.value = true
    dragAxis.value = axis
    isNewGuide.value = true
    dragGuideId.value = null

    const pos = canvas.screenToSvg(e.clientX, e.clientY)
    dragPosition.value = axis === 'horizontal' ? pos.y : pos.x
    updateScreenPos(e)

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  /** Called on mousedown on an existing guide overlay. */
  function startDragExistingGuide(e: MouseEvent, guide: Guide) {
    if (guide.locked) return
    e.preventDefault()
    e.stopPropagation()

    isDragging.value = true
    dragAxis.value = guide.axis
    isNewGuide.value = false
    dragGuideId.value = guide.id
    dragPosition.value = guide.position
    updateScreenPos(e)

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  function updateScreenPos(e: MouseEvent) {
    const rect = viewportEl.value?.getBoundingClientRect()
    dragScreenX.value = e.clientX - (rect?.left ?? 0)
    dragScreenY.value = e.clientY - (rect?.top ?? 0)
  }

  function onDragMove(e: MouseEvent) {
    const pos = canvas.screenToSvg(e.clientX, e.clientY)
    dragPosition.value = dragAxis.value === 'horizontal' ? pos.y : pos.x
    updateScreenPos(e)
  }

  function onDragEnd(e: MouseEvent) {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)

    const pos = canvas.screenToSvg(e.clientX, e.clientY)

    // Detect "drag back to ruler" → delete / discard
    // Top ruler: horizontal guide dragged above artboard (svgY < 0)
    // Right ruler: vertical guide dragged past right edge (svgX > artboardWidth)
    const overRuler =
      (dragAxis.value === 'horizontal' && pos.y < 0) ||
      (dragAxis.value === 'vertical' && pos.x < 0)

    if (overRuler) {
      if (!isNewGuide.value && dragGuideId.value) {
        ui.removeGuide(dragGuideId.value)
      }
    } else {
      if (isNewGuide.value) {
        ui.addGuide(dragAxis.value, dragPosition.value)
      } else if (dragGuideId.value) {
        ui.updateGuidePosition(dragGuideId.value, dragPosition.value)
      }
    }

    isDragging.value = false
    dragGuideId.value = null
  }

  /** Right-click on a guide → show context menu */
  function onGuideContextMenu(e: MouseEvent, guideId: string) {
    e.preventDefault()
    e.stopPropagation()
    ui.showGuideContextMenu(e.clientX, e.clientY, guideId)
  }

  return {
    isDragging,
    dragGuideId,
    dragAxis,
    dragPosition,
    dragScreenX,
    dragScreenY,
    isNewGuide,
    startDragFromRuler,
    startDragExistingGuide,
    onGuideContextMenu
  }
}
