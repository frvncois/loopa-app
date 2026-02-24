<script setup lang="ts">
import { ref, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  direction: 'horizontal' | 'vertical'
  zoom: number
  unit: 'px' | '%'
  artboardLength: number
}>()

const emit = defineEmits<{
  dragstart: [e: MouseEvent]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)

function getTickInterval(zoom: number): { minor: number; major: number } {
  if (zoom < 0.25) return { minor: 200, major: 1000 }
  if (zoom < 0.5)  return { minor: 100, major: 500 }
  if (zoom < 1)    return { minor: 50,  major: 100 }
  if (zoom < 2)    return { minor: 25,  major: 100 }
  if (zoom < 4)    return { minor: 10,  major: 50 }
  return { minor: 5, major: 25 }
}

function formatLabel(coord: number): string {
  if (props.unit === '%') {
    const pct = props.artboardLength > 0 ? Math.round(coord / props.artboardLength * 100) : 0
    return pct + '%'
  }
  return String(coord)
}

function draw() {
  const cv = canvasEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const cssW = cv.offsetWidth
  const cssH = cv.offsetHeight
  if (!cssW || !cssH) return

  cv.width  = cssW * dpr
  cv.height = cssH * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, cssW, cssH)

  // Background
  const bgColor = getComputedStyle(cv).getPropertyValue('--bg-2').trim() || '#17171b'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, cssW, cssH)

  const { minor, major } = getTickInterval(props.zoom)
  const length = props.direction === 'horizontal' ? cssW : cssH
  const thick  = props.direction === 'horizontal' ? cssH : cssW

  const tickColor = '#6b6b7e'
  ctx.strokeStyle = tickColor
  ctx.fillStyle   = tickColor
  ctx.font        = `9px "JetBrains Mono", monospace`
  ctx.lineWidth   = 1

  // Ticks start at 0 (artboard origin) — ruler width = artboard × zoom
  const endCoord = Math.ceil((length / props.zoom) / minor) * minor

  for (let coord = 0; coord <= endCoord; coord += minor) {
    const pos = Math.round(coord * props.zoom) + 0.5
    if (pos < -1 || pos > length + 1) continue

    const isMajor = coord % major === 0
    const tickLen = isMajor ? 8 : 4

    ctx.beginPath()
    if (props.direction === 'horizontal') {
      ctx.moveTo(pos, thick)
      ctx.lineTo(pos, thick - tickLen)
    } else {
      ctx.moveTo(thick, pos)
      ctx.lineTo(thick - tickLen, pos)
    }
    ctx.stroke()

    if (isMajor) {
      const label = formatLabel(coord)
      ctx.save()
      if (props.direction === 'horizontal') {
        ctx.fillText(label, pos + 2, thick - 9)
      } else {
        ctx.translate(thick - 2, pos - 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(label, 0, 0)
      }
      ctx.restore()
    }
  }

  // Border line along the artboard edge
  ctx.strokeStyle = '#3a3a4a'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (props.direction === 'horizontal') {
    ctx.moveTo(0, cssH - 0.5)
    ctx.lineTo(cssW, cssH - 0.5)
  } else {
    ctx.moveTo(0.5, 0)
    ctx.lineTo(0.5, cssH)
  }
  ctx.stroke()
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  emit('dragstart', e)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver(() => draw())
  if (canvasEl.value) ro.observe(canvasEl.value)
  nextTick(() => draw())
})

onUnmounted(() => {
  ro?.disconnect()
})

watchEffect(draw, { flush: 'post' })
</script>

<template>
  <canvas
    ref="canvasEl"
    class="ruler"
    :class="direction === 'horizontal' ? 'is-horizontal' : 'is-vertical'"
    @mousedown="onMouseDown"
  />
</template>

<style scoped>
.ruler {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;

  &.is-horizontal { cursor: s-resize; }
  &.is-vertical { cursor: e-resize; }
}
</style>
