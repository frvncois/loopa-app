import { ref, reactive } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useCanvas } from '@/composables/useCanvas'
import { createDefaultElement } from '@/lib/elements/ElementFactory'
import { snapToGrid } from '@/lib/utils/math'
import type { ElementType } from '@/types/elements'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type Canvas = ReturnType<typeof useCanvas>

const DRAW_TOOLS: ElementType[] = ['rect', 'circle', 'ellipse', 'line', 'polygon', 'star', 'text']

export function useDrawTool(
  editorStore: EditorStore,
  uiStore: UiStore,
  canvas: Canvas
) {
  const isDrawing = ref(false)
  const drawPreview = reactive({ x: 0, y: 0, width: 0, height: 0, visible: false })
  let startSvg = { x: 0, y: 0 }

  function onCanvasDown(e: MouseEvent) {
    const tool = uiStore.currentTool
    if (!DRAW_TOOLS.includes(tool as ElementType)) return
    e.stopPropagation()

    let pos = canvas.screenToSvg(e.clientX, e.clientY)
    if (uiStore.snapToGrid) {
      pos.x = snapToGrid(pos.x, uiStore.gridSize)
      pos.y = snapToGrid(pos.y, uiStore.gridSize)
    }

    isDrawing.value = true
    startSvg = { ...pos }
    Object.assign(drawPreview, { x: pos.x, y: pos.y, width: 0, height: 0, visible: true })

    document.addEventListener('mousemove', onCanvasMove)
    document.addEventListener('mouseup', onCanvasUp)
  }

  function onCanvasMove(e: MouseEvent) {
    if (!isDrawing.value) return
    let pos = canvas.screenToSvg(e.clientX, e.clientY)
    if (uiStore.snapToGrid) {
      pos.x = snapToGrid(pos.x, uiStore.gridSize)
      pos.y = snapToGrid(pos.y, uiStore.gridSize)
    }

    drawPreview.x = Math.min(startSvg.x, pos.x)
    drawPreview.y = Math.min(startSvg.y, pos.y)
    drawPreview.width = Math.abs(pos.x - startSvg.x)
    drawPreview.height = Math.abs(pos.y - startSvg.y)
  }

  function onCanvasUp() {
    document.removeEventListener('mousemove', onCanvasMove)
    document.removeEventListener('mouseup', onCanvasUp)

    if (!isDrawing.value) return
    isDrawing.value = false
    drawPreview.visible = false

    const type = uiStore.currentTool as ElementType
    const minSize = 4
    const frameId = uiStore.activeFrameId ?? ''
    if (drawPreview.width < minSize && drawPreview.height < minSize) {
      // Click without drag: use default size centered at click
      const el = createDefaultElement(type)
      editorStore.addElement({ ...el, x: startSvg.x - 50, y: startSvg.y - 50 }, frameId)
      uiStore.select(el.id)
      uiStore.setTool('select')
    } else {
      const el = createDefaultElement(type)
      editorStore.addElement({
        ...el,
        x: drawPreview.x,
        y: drawPreview.y,
        width: drawPreview.width || 100,
        height: drawPreview.height || 100
      }, frameId)
      uiStore.select(el.id)
      uiStore.setTool('select')
    }
  }

  return { onCanvasDown, onCanvasMove, onCanvasUp, drawPreview, isDrawing }
}
