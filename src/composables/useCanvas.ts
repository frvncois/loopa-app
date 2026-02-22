import { ref, computed, type Ref } from 'vue'
import { clamp } from '@/lib/utils/math'
import { useUiStore } from '@/stores/uiStore'

export function useCanvas(viewportRef: Ref<HTMLElement | null>) {
  const uiStore = useUiStore()
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)
  let panStartX = 0
  let panStartY = 0
  let panOriginX = 0
  let panOriginY = 0

  const viewBox = computed(() => {
    const el = viewportRef.value
    if (!el) return '0 0 800 600'
    const w = el.clientWidth / zoom.value
    const h = el.clientHeight / zoom.value
    const x = -panX.value / zoom.value
    const y = -panY.value / zoom.value
    return `${x} ${y} ${w} ${h}`
  })

  function screenToSvg(clientX: number, clientY: number): { x: number; y: number } {
    const el = viewportRef.value
    if (!el) return { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left) / zoom.value - panX.value / zoom.value
    const y = (clientY - rect.top) / zoom.value - panY.value / zoom.value
    return { x, y }
  }

  function svgToScreen(svgX: number, svgY: number): { x: number; y: number } {
    return {
      x: svgX * zoom.value + panX.value,
      y: svgY * zoom.value + panY.value
    }
  }

  function zoomIn() { zoom.value = clamp(zoom.value * 1.2, 0.05, 10) }
  function zoomOut() { zoom.value = clamp(zoom.value / 1.2, 0.05, 10) }
  function resetZoom() { zoom.value = 1; panX.value = 0; panY.value = 0 }

  function fitToView(artboardW: number, artboardH: number) {
    const el = viewportRef.value
    if (!el) return
    const vw = el.clientWidth - 80
    const vh = el.clientHeight - 80
    const zx = vw / artboardW
    const zy = vh / artboardH
    zoom.value = clamp(Math.min(zx, zy), 0.05, 4)
    panX.value = (el.clientWidth - artboardW * zoom.value) / 2
    panY.value = (el.clientHeight - artboardH * zoom.value) / 2
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (uiStore.isTransforming) return
    const el = viewportRef.value
    if (!el) return

    if (e.ctrlKey || e.metaKey) {
      // Zoom (ctrl+wheel or trackpad pinch — pinch sends ctrlKey=true)
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const oldZoom = zoom.value
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = clamp(oldZoom * delta, 0.05, 10)
      panX.value = mouseX - (mouseX - panX.value) * (newZoom / oldZoom)
      panY.value = mouseY - (mouseY - panY.value) * (newZoom / oldZoom)
      zoom.value = newZoom
    } else {
      // Pan (plain scroll)
      panX.value -= e.deltaX
      panY.value -= e.deltaY
    }
  }

  function startPan(e: MouseEvent) {
    isPanning.value = true
    panStartX = e.clientX
    panStartY = e.clientY
    panOriginX = panX.value
    panOriginY = panY.value
    document.addEventListener('mousemove', onPanMove)
    document.addEventListener('mouseup', onPanUp)
  }

  function onPanMove(e: MouseEvent) {
    panX.value = panOriginX + (e.clientX - panStartX)
    panY.value = panOriginY + (e.clientY - panStartY)
  }

  function onPanUp() {
    isPanning.value = false
    document.removeEventListener('mousemove', onPanMove)
    document.removeEventListener('mouseup', onPanUp)
  }

  return {
    viewBox, zoom, panX, panY, isPanning,
    screenToSvg, svgToScreen,
    zoomIn, zoomOut, resetZoom, fitToView,
    onWheel, startPan
  }
}
