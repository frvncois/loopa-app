<script setup lang="ts">
import { computed } from 'vue'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'

const props = defineProps<{
  element: Element
  animatedProps?: AnimatableProps
  selected?: boolean
}>()

const el = computed(() => ({
  ...props.element,
  ...props.animatedProps
}))

const fillAttr = computed(() => {
  const fills = props.element.fills.filter(f => f.visible && f.type !== 'none')
  return fills.length > 0 ? `#${fills[0].color}` : 'none'
})

const fillOpacity = computed(() => {
  const fills = props.element.fills.filter(f => f.visible && f.type !== 'none')
  return fills.length > 0 ? fills[0].opacity : 1
})

const strokeAttr = computed(() => {
  const strokes = props.element.strokes.filter(s => s.visible)
  return strokes.length > 0 ? `#${strokes[0].color}` : 'none'
})

const strokeWidth = computed(() => {
  const strokes = props.element.strokes.filter(s => s.visible)
  return strokes.length > 0 ? strokes[0].width : 0
})

const transform = computed(() => {
  const e = el.value
  const cx = e.x + e.width / 2
  const cy = e.y + e.height / 2
  const parts = []
  if (e.rotation) parts.push(`rotate(${e.rotation} ${cx} ${cy})`)
  if (e.scaleX !== 1 || e.scaleY !== 1 || e.flipX || e.flipY) {
    const sx = (e.scaleX ?? 1) * (e.flipX ? -1 : 1)
    const sy = (e.scaleY ?? 1) * (e.flipY ? -1 : 1)
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`)
  }
  return parts.join(' ') || undefined
})

const shadowFilter = computed(() => {
  const shadow = props.element.shadows.find(s => s.visible)
  if (!shadow) return ''
  return `drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px rgba(0,0,0,${shadow.opacity}))`
})

const filterAttr = computed(() => {
  const parts = []
  if (shadowFilter.value) parts.push(shadowFilter.value)
  if (props.element.blur > 0) parts.push(`blur(${props.element.blur}px)`)
  return parts.join(' ') || undefined
})

// Star polygon points
function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const pts = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / points - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

// Polygon points
function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts = []
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}
</script>

<template>
  <g
    v-if="element.visible"
    :opacity="el.opacity"
    :transform="transform"
    :filter="filterAttr"
    :style="{ cursor: 'move' }"
  >
    <!-- Rect -->
    <rect
      v-if="element.type === 'rect'"
      :x="el.x"
      :y="el.y"
      :width="el.width"
      :height="el.height"
      :rx="(element as any).rx ?? 0"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr"
      :stroke-width="strokeWidth"
    />

    <!-- Circle -->
    <circle
      v-else-if="element.type === 'circle'"
      :cx="el.x + el.width / 2"
      :cy="el.y + el.height / 2"
      :r="Math.min(el.width, el.height) / 2"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr"
      :stroke-width="strokeWidth"
    />

    <!-- Ellipse -->
    <ellipse
      v-else-if="element.type === 'ellipse'"
      :cx="el.x + el.width / 2"
      :cy="el.y + el.height / 2"
      :rx="el.width / 2"
      :ry="el.height / 2"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr"
      :stroke-width="strokeWidth"
    />

    <!-- Line -->
    <line
      v-else-if="element.type === 'line'"
      :x1="el.x"
      :y1="el.y + el.height / 2"
      :x2="el.x + el.width"
      :y2="el.y + el.height / 2"
      :stroke="strokeAttr !== 'none' ? strokeAttr : fillAttr"
      :stroke-width="strokeWidth || 2"
      stroke-linecap="round"
    />

    <!-- Polygon -->
    <polygon
      v-else-if="element.type === 'polygon'"
      :points="polygonPoints(el.x + el.width/2, el.y + el.height/2, Math.min(el.width, el.height)/2, (element as any).sides ?? 6)"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr"
      :stroke-width="strokeWidth"
    />

    <!-- Star -->
    <polygon
      v-else-if="element.type === 'star'"
      :points="starPoints(el.x + el.width/2, el.y + el.height/2, Math.min(el.width, el.height)/2, Math.min(el.width, el.height)/2 * ((element as any).innerRadius ?? 0.4), (element as any).starPoints ?? 5)"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr"
      :stroke-width="strokeWidth"
    />

    <!-- Text -->
    <text
      v-else-if="element.type === 'text'"
      :x="el.x"
      :y="el.y + ((element as any).fontSize ?? 24)"
      :font-family="(element as any).fontFamily ?? 'DM Sans'"
      :font-size="(element as any).fontSize ?? 24"
      :font-weight="(element as any).fontWeight ?? 400"
      :fill="fillAttr"
      :fill-opacity="fillOpacity"
    >{{ (element as any).text ?? 'Text' }}</text>

    <!-- Path -->
    <path
      v-else-if="element.type === 'path' && (element as any).d"
      :d="(element as any).d"
      :fill="(element as any).closed ? fillAttr : 'none'"
      :fill-opacity="fillOpacity"
      :stroke="strokeAttr !== 'none' ? strokeAttr : (!(element as any).closed ? fillAttr : 'none')"
      :stroke-width="strokeWidth || 2"
      stroke-linecap="round"
    />
  </g>
</template>
