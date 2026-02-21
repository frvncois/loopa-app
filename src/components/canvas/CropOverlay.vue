<script setup lang="ts">
import { computed } from 'vue'
import type { Element } from '@/types/elements'
import type { CropRect } from '@/composables/useCropTool'

const props = defineProps<{
  element: Element
  cropRect: CropRect
  onHandleMouseDown: (e: MouseEvent, handle: string) => void
  onCropRectMouseDown: (e: MouseEvent) => void
}>()

// Same transform as ElementRenderer outer <g>
const elTransform = computed(() => {
  const e = props.element
  const cx = e.x + e.width / 2
  const cy = e.y + e.height / 2
  const parts: string[] = []
  if (e.rotation) parts.push(`rotate(${e.rotation} ${cx} ${cy})`)
  if (e.scaleX !== 1 || e.scaleY !== 1 || e.flipX || e.flipY) {
    const sx = (e.scaleX ?? 1) * (e.flipX ? -1 : 1)
    const sy = (e.scaleY ?? 1) * (e.flipY ? -1 : 1)
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`)
  }
  return parts.join(' ') || undefined
})

const dimMaskId = computed(() => `crop-dim-${props.element.id}`)

// Crop rect in SVG (local-space coords + element position)
const cx = computed(() => props.element.x + props.cropRect.x)
const cy = computed(() => props.element.y + props.cropRect.y)
const cw = computed(() => props.cropRect.width)
const ch = computed(() => props.cropRect.height)

// 8 handles: id + cx + cy
const handles = computed(() => {
  const x0 = cx.value, y0 = cy.value
  const x1 = cx.value + cw.value / 2, y1 = cy.value + ch.value / 2
  const x2 = cx.value + cw.value, y2 = cy.value + ch.value
  return [
    { id: 'nw', x: x0, y: y0, cursor: 'nw-resize' },
    { id: 'n',  x: x1, y: y0, cursor: 'n-resize' },
    { id: 'ne', x: x2, y: y0, cursor: 'ne-resize' },
    { id: 'w',  x: x0, y: y1, cursor: 'w-resize' },
    { id: 'e',  x: x2, y: y1, cursor: 'e-resize' },
    { id: 'sw', x: x0, y: y2, cursor: 'sw-resize' },
    { id: 's',  x: x1, y: y2, cursor: 's-resize' },
    { id: 'se', x: x2, y: y2, cursor: 'se-resize' },
  ]
})

// Rule-of-thirds grid lines inside the crop rect
const thirds = computed(() => {
  const x = cx.value, y = cy.value, w = cw.value, h = ch.value
  return {
    vLines: [x + w / 3, x + (w * 2) / 3],
    hLines: [y + h / 3, y + (h * 2) / 3],
  }
})
</script>

<template>
  <g :transform="elTransform">
    <defs>
      <mask :id="dimMaskId">
        <!-- White = visible (will be dimmed) -->
        <rect :x="element.x" :y="element.y" :width="element.width" :height="element.height" fill="white"/>
        <!-- Black = excluded from dim = crop area stays bright -->
        <rect :x="cx" :y="cy" :width="cw" :height="ch" fill="black"/>
      </mask>
    </defs>

    <!-- Dim overlay outside crop rect -->
    <rect
      :x="element.x" :y="element.y"
      :width="element.width" :height="element.height"
      fill="rgba(0,0,0,0.55)"
      :mask="`url(#${dimMaskId})`"
      pointer-events="none"
    />

    <!-- Rule-of-thirds lines -->
    <line
      v-for="vx in thirds.vLines" :key="`v${vx}`"
      :x1="vx" :y1="cy" :x2="vx" :y2="cy + ch"
      stroke="rgba(255,255,255,0.3)" stroke-width="0.5" pointer-events="none"
    />
    <line
      v-for="hy in thirds.hLines" :key="`h${hy}`"
      :x1="cx" :y1="hy" :x2="cx + cw" :y2="hy"
      stroke="rgba(255,255,255,0.3)" stroke-width="0.5" pointer-events="none"
    />

    <!-- Crop border (interactive — drag to reposition) -->
    <rect
      :x="cx" :y="cy" :width="cw" :height="ch"
      fill="rgba(255,255,255,0.04)"
      stroke="white" stroke-width="1"
      style="cursor:move"
      @mousedown.stop="onCropRectMouseDown"
    />

    <!-- Corner accent marks (visual emphasis at corners) -->
    <template v-for="h in handles.filter(h => h.id.length === 2)" :key="`c-${h.id}`">
      <rect
        v-if="h.id === 'nw'"
        :x="h.x" :y="h.y" width="8" height="2"
        fill="white" pointer-events="none"
      />
      <!-- simplified corner marks rendered via handles below -->
    </template>

    <!-- Handles -->
    <rect
      v-for="h in handles"
      :key="h.id"
      :x="h.x - 4" :y="h.y - 4"
      width="8" height="8"
      rx="1.5"
      fill="white"
      stroke="var(--accent)"
      stroke-width="1.5"
      :style="{ cursor: h.cursor }"
      @mousedown.stop="onHandleMouseDown($event, h.id)"
    />
  </g>
</template>
