<script setup lang="ts">
import { ref, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  direction: 'horizontal' | 'vertical'
  zoom: number
  panX?: number
  panY?: number
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
  ctx.fillStyle = getComputedStyle(cv).getPropertyValue('--bg-1').trim() || '#0c0c0f'
  ctx.fillRect(0, 0, cssW, cssH)

  const { minor, major } = getTickInterval(props.zoom)
  const pan    = props.direction === 'horizontal' ? (props.panX ?? 0) : (props.panY ?? 0)
  const length = props.direction === 'horizontal' ? cssW : cssH
  const thick  = props.direction === 'horizontal' ? cssH : cssW

  const tickColor = '#6b6b7e'
  ctx.strokeStyle = tickColor
  ctx.fillStyle   = tickColor
  ctx.font        = `9px "JetBrains Mono", monospace`
  ctx.lineWidth   = 1

  const startCoord = Math.floor((-pan / props.zoom) / minor) * minor
  const endCoord   = Math.ceil(((length - pan) / props.zoom) / minor) * minor

  for (let coord = startCoord; coord <= endCoord; coord += minor) {
    const pos = Math.round(coord * props.zoom + pan) + 0.5
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
      const label = String(coord)
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
}

let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver(() => draw())
  if (canvasEl.value) ro.observe(canvasEl.value)
  // Ensure draw happens after browser layout is complete
  nextTick(() => draw())
})

onUnmounted(() => {
  ro?.disconnect()
})

watchEffect(draw, { flush: 'post' })
</script>

<template>
  <canvas ref="canvasEl" class="ruler" :class="direction === 'horizontal' ? 'is-horizontal' : 'is-vertical'" />
</template>

<style scoped>
.ruler {
  display: block;
  position: absolute;
  z-index: 5;
  pointer-events: none;

  &.is-horizontal {
    top: 0;
    left: 1.25rem;
    right: 0;
    height: 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  &.is-vertical {
    top: 1.25rem;
    left: 0;
    bottom: 0;
    width: 1.25rem;
    border-right: 1px solid var(--border);
  }
}
</style>
