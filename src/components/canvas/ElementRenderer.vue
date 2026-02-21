<script setup lang="ts">
import { computed, inject } from 'vue'
import type { Element, GroupElement, VideoElement, ImageElement } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
// Self-reference for recursive group rendering — Vue 3 supports this via the file name
import ElementRenderer from './ElementRenderer.vue'
import CanvasVideo from './CanvasVideo.vue'
import CanvasImage from './CanvasImage.vue'

const editorStore = useEditorStore()
const ui = useUiStore()

const props = defineProps<{
  element: Element
  animatedProps?: AnimatableProps
  selected?: boolean
  isDimmed?: boolean
}>()

// Injected from CanvasViewport to delegate child events when inside an entered group
const onElementMouseDown = inject<(e: MouseEvent, id: string) => void>('onElementMouseDown')
const onElementDblClick = inject<(e: MouseEvent, id: string) => void>('onElementDblClick')

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

function resolveOrigin(e: typeof el.value) {
  return {
    x: (e as any).transformOriginX ?? (e as any).transformOrigin?.x ?? 0.5,
    y: (e as any).transformOriginY ?? (e as any).transformOrigin?.y ?? 0.5,
  }
}

const transform = computed(() => {
  const e = el.value
  const origin = resolveOrigin(e)
  const cx = e.x + origin.x * e.width
  const cy = e.y + origin.y * e.height
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

const displayOpacity = computed(() =>
  el.value.opacity * (props.isDimmed ? 0.4 : 1) * (props.element.isMask ? 0.5 : 1)
)

// Crop rect clipping
const cropClipId = computed(() =>
  props.element.cropRect ? `crop-el-${props.element.id}` : null
)

const cropClipTransform = computed(() => {
  const e = el.value
  const origin = resolveOrigin(e)
  const cx = e.x + origin.x * e.width
  const cy = e.y + origin.y * e.height
  const parts: string[] = []
  if (e.rotation) parts.push(`rotate(${e.rotation} ${cx} ${cy})`)
  if (e.scaleX !== 1 || e.scaleY !== 1 || e.flipX || e.flipY) {
    const sx = (e.scaleX ?? 1) * (e.flipX ? -1 : 1)
    const sy = (e.scaleY ?? 1) * (e.flipY ? -1 : 1)
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`)
  }
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

// When a group is entered, delegate child mouse events to the canvas handler
function handleChildMouseDown(e: MouseEvent, childId: string) {
  if (ui.activeGroupId !== props.element.id) return
  e.stopPropagation()
  onElementMouseDown?.(e, childId)
}

function handleChildDblClick(e: MouseEvent, childId: string) {
  if (ui.activeGroupId !== props.element.id) return
  e.stopPropagation()
  onElementDblClick?.(e, childId)
}
</script>

<template>
  <g
    v-if="element.visible"
    :opacity="displayOpacity"
    :transform="transform"
    :filter="filterAttr"
    :clip-path="cropClipId ? `url(#${cropClipId})` : undefined"
    :style="{ cursor: 'move' }"
  >
    <!-- Crop clipPath definition (in element's rotated coordinate space) -->
    <defs v-if="cropClipId && element.cropRect">
      <clipPath :id="cropClipId" clipPathUnits="userSpaceOnUse">
        <g :transform="cropClipTransform">
          <rect
            :x="el.x + element.cropRect.x"
            :y="el.y + element.cropRect.y"
            :width="element.cropRect.width"
            :height="element.cropRect.height"
          />
        </g>
      </clipPath>
    </defs>

    <!-- isMask dashed outline indicator -->
    <rect
      v-if="element.isMask"
      :x="el.x - 1" :y="el.y - 1"
      :width="el.width + 2" :height="el.height + 2"
      class="mask-outline"
      pointer-events="none"
    />
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

    <!-- Video -->
    <CanvasVideo
      v-else-if="element.type === 'video'"
      :element="(element as VideoElement)"
    />

    <!-- Image -->
    <CanvasImage
      v-else-if="element.type === 'image'"
      :element="(element as ImageElement)"
    />

    <!-- Group: render children recursively -->
    <template v-else-if="element.type === 'group'">
      <!-- Dashed outline indicating this group is entered for editing -->
      <rect
        v-if="ui.activeGroupId === element.id"
        :x="element.x - 1"
        :y="element.y - 1"
        :width="element.width + 2"
        :height="element.height + 2"
        class="group-outline is-entered"
      />

      <ElementRenderer
        v-for="childId in (element as GroupElement).childIds"
        :key="childId"
        :element="editorStore.getElementById(childId)!"
        :is-dimmed="ui.activeGroupId === element.id && !ui.selectedIds.has(childId) && ui.selectedIds.size > 0"
        @mousedown="handleChildMouseDown($event, childId)"
        @dblclick="handleChildDblClick($event, childId)"
      />
    </template>
  </g>
</template>

<style scoped>
.mask-outline {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1px;
  stroke-dasharray: 5 3;
  opacity: 0.7;
}

.group-outline {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1px;
  stroke-dasharray: 4 3;
  opacity: 0.4;
  pointer-events: none;

  &.is-entered {
    opacity: 0.8;
  }
}
</style>
