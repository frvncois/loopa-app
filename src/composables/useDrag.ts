import { ref, onUnmounted } from 'vue'

interface DragOptions {
  onStart?: (e: MouseEvent) => void
  onMove?: (e: MouseEvent, dx: number, dy: number) => void
  onEnd?: (e: MouseEvent) => void
}

export function useDrag(options: DragOptions) {
  const isDragging = ref(false)
  let startX = 0
  let startY = 0

  function startDrag(e: MouseEvent) {
    isDragging.value = true
    startX = e.clientX
    startY = e.clientY
    options.onStart?.(e)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onMove(e: MouseEvent) {
    options.onMove?.(e, e.clientX - startX, e.clientY - startY)
  }

  function onUp(e: MouseEvent) {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    options.onEnd?.(e)
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  })

  return { isDragging, startDrag }
}
