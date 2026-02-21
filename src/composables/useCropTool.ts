import { ref, computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export function useCropTool(
  editorStore: EditorStore,
  uiStore: UiStore,
  canvas: Canvas
) {
  const cropElementId = ref<string | null>(null)
  const tempCropRect = ref<CropRect | null>(null)

  const isCropMode = computed(() => uiStore.currentTool === 'crop' && cropElementId.value !== null)

  function enterCropMode(elementId: string) {
    const el = editorStore.getElementById(elementId)
    if (!el) return
    cropElementId.value = elementId
    const existing = el.cropRect
    tempCropRect.value = existing
      ? { ...existing }
      : { x: 0, y: 0, width: el.width, height: el.height }
    uiStore.setTool('crop')
  }

  function exitCropMode(apply: boolean) {
    if (apply && cropElementId.value && tempCropRect.value) {
      editorStore.updateElement(cropElementId.value, { cropRect: { ...tempCropRect.value } })
    }
    cropElementId.value = null
    tempCropRect.value = null
    uiStore.setTool('select')
  }

  function resetCrop(elementId: string) {
    editorStore.updateElement(elementId, { cropRect: null })
  }

  // Drag a handle to resize the crop rect
  function onHandleMouseDown(e: MouseEvent, handle: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!cropElementId.value || !tempCropRect.value) return

    const elBase = editorStore.getElementById(cropElementId.value)
    if (!elBase) return

    const startSvg = canvas.screenToSvg(e.clientX, e.clientY)
    const startCrop = { ...tempCropRect.value }
    const MIN = 10
    const maxW = elBase.width
    const maxH = elBase.height

    function onMove(ev: MouseEvent) {
      const cur = canvas.screenToSvg(ev.clientX, ev.clientY)
      let dx = cur.x - startSvg.x
      let dy = cur.y - startSvg.y

      // Rotate delta into element's local coordinate space
      const rot = -(elBase.rotation ?? 0) * Math.PI / 180
      const ldx = dx * Math.cos(rot) - dy * Math.sin(rot)
      const ldy = dx * Math.sin(rot) + dy * Math.cos(rot)

      let { x, y, width, height } = startCrop

      if (handle.includes('e')) width = Math.max(MIN, Math.min(maxW - x, width + ldx))
      if (handle.includes('w')) {
        const newX = Math.max(0, Math.min(x + ldx, x + width - MIN))
        width = Math.max(MIN, width - (newX - x))
        x = newX
      }
      if (handle.includes('s')) height = Math.max(MIN, Math.min(maxH - y, height + ldy))
      if (handle.includes('n')) {
        const newY = Math.max(0, Math.min(y + ldy, y + height - MIN))
        height = Math.max(MIN, height - (newY - y))
        y = newY
      }

      tempCropRect.value = { x, y, width, height }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Drag inside crop rect to reposition it
  function onCropRectMouseDown(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!cropElementId.value || !tempCropRect.value) return

    const elBase = editorStore.getElementById(cropElementId.value)
    if (!elBase) return

    const startSvg = canvas.screenToSvg(e.clientX, e.clientY)
    const startCrop = { ...tempCropRect.value }

    function onMove(ev: MouseEvent) {
      if (!tempCropRect.value) return
      const cur = canvas.screenToSvg(ev.clientX, ev.clientY)
      let dx = cur.x - startSvg.x
      let dy = cur.y - startSvg.y

      const rot = -(elBase.rotation ?? 0) * Math.PI / 180
      const ldx = dx * Math.cos(rot) - dy * Math.sin(rot)
      const ldy = dx * Math.sin(rot) + dy * Math.cos(rot)

      const { width, height } = tempCropRect.value
      const x = Math.max(0, Math.min(elBase.width - width, startCrop.x + ldx))
      const y = Math.max(0, Math.min(elBase.height - height, startCrop.y + ldy))
      tempCropRect.value = { x, y, width, height }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return {
    cropElementId,
    tempCropRect,
    isCropMode,
    enterCropMode,
    exitCropMode,
    resetCrop,
    onHandleMouseDown,
    onCropRectMouseDown,
  }
}
