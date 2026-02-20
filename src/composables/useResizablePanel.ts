import { ref, onUnmounted } from 'vue'

export function useResizablePanel(
  side: 'left' | 'right' | 'bottom',
  min: number,
  max: number,
  defaultSize: number
) {
  const size = ref(defaultSize)
  let isResizing = false
  let startPos = 0
  let startSize = 0

  function onResizeStart(e: MouseEvent) {
    isResizing = true
    startPos = side === 'bottom' ? e.clientY : e.clientX
    startSize = size.value
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = side === 'bottom' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onMove(e: MouseEvent) {
    if (!isResizing) return
    let delta = 0
    if (side === 'left') delta = e.clientX - startPos
    else if (side === 'right') delta = startPos - e.clientX
    else delta = startPos - e.clientY
    size.value = Math.min(max, Math.max(min, startSize + delta))
  }

  function onUp() {
    isResizing = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  })

  return { size, onResizeStart }
}
