<script setup lang="ts">
import { computed } from 'vue'
import type { Element, RectElement, PolygonElement, StarElement, PathElement } from '@/types/elements'

const props = defineProps<{ element: Element }>()

const el = computed(() => props.element)

// Same transform logic as ElementRenderer
const shapeTransform = computed(() => {
  const e = el.value
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

function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, n: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / n - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}
</script>

<template>
  <g :transform="shapeTransform">
    <rect
      v-if="el.type === 'rect'"
      :x="el.x" :y="el.y" :width="el.width" :height="el.height"
      :rx="(el as RectElement).rx ?? 0"
    />
    <circle
      v-else-if="el.type === 'circle'"
      :cx="el.x + el.width / 2" :cy="el.y + el.height / 2"
      :r="Math.min(el.width, el.height) / 2"
    />
    <ellipse
      v-else-if="el.type === 'ellipse'"
      :cx="el.x + el.width / 2" :cy="el.y + el.height / 2"
      :rx="el.width / 2" :ry="el.height / 2"
    />
    <polygon
      v-else-if="el.type === 'polygon'"
      :points="polygonPoints(el.x + el.width / 2, el.y + el.height / 2, Math.min(el.width, el.height) / 2, (el as PolygonElement).sides ?? 6)"
    />
    <polygon
      v-else-if="el.type === 'star'"
      :points="starPoints(el.x + el.width / 2, el.y + el.height / 2, Math.min(el.width, el.height) / 2, Math.min(el.width, el.height) / 2 * ((el as StarElement).innerRadius ?? 0.4), (el as StarElement).starPoints ?? 5)"
    />
    <path
      v-else-if="el.type === 'path' && (el as PathElement).d"
      :d="(el as PathElement).d"
    />
    <!-- Fallback: bounding rect for text/group/etc. -->
    <rect
      v-else
      :x="el.x" :y="el.y" :width="el.width" :height="el.height"
    />
  </g>
</template>
