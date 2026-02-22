<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import type { Element, GroupElement } from '@/types/elements'
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
  maskOutline?: boolean
}>()

// Injected from CanvasViewport: animated props for ALL frame elements (including group children)
const animatedPropsMap = inject<ComputedRef<Map<string, AnimatableProps>>>('animatedPropsMap')

// Injected from CanvasViewport to delegate child events when inside an entered group
const onElementMouseDown = inject<(e: MouseEvent, id: string) => void>('onElementMouseDown')
const onElementDblClick = inject<(e: MouseEvent, id: string) => void>('onElementDblClick')

const el = computed(() => ({
  ...props.element,
  ...props.animatedProps
}))

const fillAttr = computed(() => {
  if (props.maskOutline) return 'none'
  if (props.animatedProps?.fillColor) return `#${props.animatedProps.fillColor}`
  const fills = props.element.fills.filter(f => f.visible && f.type !== 'none')
  return fills.length > 0 ? `#${fills[0].color}` : 'none'
})

const fillOpacity = computed(() => {
  if (props.maskOutline) return 0
  if (props.animatedProps?.fillOpacity !== undefined) return props.animatedProps.fillOpacity
  const fills = props.element.fills.filter(f => f.visible && f.type !== 'none')
  return fills.length > 0 ? fills[0].opacity : 1
})

const strokeAttr = computed(() => {
  if (props.maskOutline) return 'var(--accent)'
  if (props.animatedProps?.strokeColor) return `#${props.animatedProps.strokeColor}`
  const strokes = props.element.strokes.filter(s => s.visible)
  return strokes.length > 0 ? `#${strokes[0].color}` : 'none'
})

const strokeWidth = computed(() => {
  if (props.maskOutline) return 1
  if (props.animatedProps?.strokeWidth !== undefined) return props.animatedProps.strokeWidth
  const strokes = props.element.strokes.filter(s => s.visible)
  return strokes.length > 0 ? strokes[0].width : 0
})

const strokeDashArray = computed(() => props.maskOutline ? '5 3' : undefined)

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
  if (props.maskOutline) return ''
  const shadow = props.element.shadows.find(s => s.visible)
  if (!shadow) return ''
  const x = props.animatedProps?.shadowOffsetX ?? shadow.x
  const y = props.animatedProps?.shadowOffsetY ?? shadow.y
  const blur = props.animatedProps?.shadowBlur ?? shadow.blur
  const opacity = props.animatedProps?.shadowOpacity ?? shadow.opacity
  return `drop-shadow(${x}px ${y}px ${blur}px rgba(0,0,0,${opacity}))`
})

const filterAttr = computed(() => {
  if (props.maskOutline) return undefined
  const parts = []
  if (shadowFilter.value) parts.push(shadowFilter.value)
  const blurVal = props.animatedProps?.blur ?? props.element.blur
  if (blurVal > 0) parts.push(`blur(${blurVal}px)`)
  return parts.join(' ') || undefined
})

const displayOpacity = computed(() => {
  if (props.maskOutline) return 0.7
  return el.value.opacity * (props.isDimmed ? 0.4 : 1)
})

// Crop rect clipping
const cropClipId = computed(() =>
  props.element.cropRect ? `crop-el-${props.element.id}` : null
)

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

// ── Mask group helpers ────────────────────────────────────────────────────────

// First child of a hasMask group = the clip shape
const maskShapeEl = computed(() => {
  const group = props.element as GroupElement
  if (!group.hasMask || !group.childIds.length) return null
  return editorStore.getElementById(group.childIds[0]) ?? null
})

type ClipShape = { tag: string; attrs: Record<string, unknown> }

const maskClipShape = computed((): ClipShape | null => {
  const mse = maskShapeEl.value
  if (!mse) return null
  const anim = (animatedPropsMap?.value?.get(mse.id) ?? {}) as AnimatableProps & Record<string, unknown>
  const x = (anim.x as number | undefined) ?? mse.x
  const y = (anim.y as number | undefined) ?? mse.y
  const w = (anim.width as number | undefined) ?? mse.width
  const h = (anim.height as number | undefined) ?? mse.height
  const rot = (anim.rotation as number | undefined) ?? mse.rotation ?? 0
  const oxN = (anim.transformOriginX as number | undefined) ?? (mse as any).transformOrigin?.x ?? 0.5
  const oyN = (anim.transformOriginY as number | undefined) ?? (mse as any).transformOrigin?.y ?? 0.5
  const cx = x + oxN * w
  const cy = y + oyN * h
  const transformAttr = rot ? `rotate(${rot} ${cx} ${cy})` : undefined

  switch (mse.type) {
    case 'rect':
      return { tag: 'rect', attrs: { x, y, width: w, height: h, rx: (mse as any).rx ?? 0, transform: transformAttr } }
    case 'circle':
      return { tag: 'circle', attrs: { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2, transform: transformAttr } }
    case 'ellipse':
      return { tag: 'ellipse', attrs: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, transform: transformAttr } }
    case 'path':
      return { tag: 'path', attrs: { d: (anim.d as string | undefined) ?? (mse as any).d ?? '', fill: 'black', transform: transformAttr } }
    case 'polygon':
      return { tag: 'polygon', attrs: { points: polygonPoints(x + w/2, y + h/2, Math.min(w, h)/2, (mse as any).sides ?? 6), transform: transformAttr } }
    case 'star':
      return { tag: 'polygon', attrs: { points: starPoints(x + w/2, y + h/2, Math.min(w, h)/2, Math.min(w, h)/2 * ((mse as any).innerRadius ?? 0.4), (mse as any).starPoints ?? 5), transform: transformAttr } }
    default:
      return { tag: 'rect', attrs: { x, y, width: w, height: h, transform: transformAttr } }
  }
})

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
    :style="{ cursor: 'move' }"
  >
    <!-- Crop clipPath definition — must be a sibling of (not inside) the element that references it -->
    <defs v-if="cropClipId && element.cropRect">
      <clipPath :id="cropClipId" clipPathUnits="userSpaceOnUse">
        <rect
          :x="el.x + element.cropRect.x"
          :y="el.y + element.cropRect.y"
          :width="element.cropRect.width"
          :height="element.cropRect.height"
        />
      </clipPath>
    </defs>

    <!-- Shape content (cropped when cropRect is set) -->
    <g :clip-path="cropClipId ? `url(#${cropClipId})` : undefined">
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
        :stroke-dasharray="strokeDashArray"
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
        :stroke-dasharray="strokeDashArray"
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
        :stroke-dasharray="strokeDashArray"
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
        :stroke-dasharray="strokeDashArray"
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
        :stroke-dasharray="strokeDashArray"
      />

      <!-- Star -->
      <polygon
        v-else-if="element.type === 'star'"
        :points="starPoints(el.x + el.width/2, el.y + el.height/2, Math.min(el.width, el.height)/2, Math.min(el.width, el.height)/2 * ((element as any).innerRadius ?? 0.4), (element as any).starPoints ?? 5)"
        :fill="fillAttr"
        :fill-opacity="fillOpacity"
        :stroke="strokeAttr"
        :stroke-width="strokeWidth"
        :stroke-dasharray="strokeDashArray"
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
        :stroke-dasharray="strokeDashArray"
        stroke-linecap="round"
      />

      <!-- Video -->
      <CanvasVideo
        v-else-if="element.type === 'video'"
        :element="(element as any)"
      />

      <!-- Image -->
      <CanvasImage
        v-else-if="element.type === 'image'"
        :element="(element as any)"
      />

      <!-- Group -->
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

        <!-- MASK GROUP: first child clips all other children -->
        <template v-if="(element as GroupElement).hasMask && maskShapeEl && maskClipShape">
          <!-- ClipPath definition from mask shape geometry -->
          <defs>
            <clipPath :id="`mask-${element.id}`" clipPathUnits="userSpaceOnUse">
              <component :is="maskClipShape.tag" v-bind="maskClipShape.attrs" />
            </clipPath>
          </defs>

          <!-- Mask shape: dashed outline indicator -->
          <ElementRenderer
            :element="maskShapeEl"
            :animated-props="animatedPropsMap?.get(maskShapeEl.id)"
            :mask-outline="true"
            :is-dimmed="ui.activeGroupId === element.id && !ui.selectedIds.has(maskShapeEl.id) && ui.selectedIds.size > 0"
            @mousedown="handleChildMouseDown($event, maskShapeEl.id)"
            @dblclick="handleChildDblClick($event, maskShapeEl.id)"
          />

          <!-- Clipped content: all children except the mask shape -->
          <g :clip-path="`url(#mask-${element.id})`">
            <ElementRenderer
              v-for="childId in (element as GroupElement).childIds.slice(1)"
              :key="childId"
              :element="editorStore.getElementById(childId)!"
              :animated-props="animatedPropsMap?.get(childId)"
              :is-dimmed="ui.activeGroupId === element.id && !ui.selectedIds.has(childId) && ui.selectedIds.size > 0"
              @mousedown="handleChildMouseDown($event, childId)"
              @dblclick="handleChildDblClick($event, childId)"
            />
          </g>
        </template>

        <!-- REGULAR GROUP: render all children -->
        <template v-else>
          <ElementRenderer
            v-for="childId in (element as GroupElement).childIds"
            :key="childId"
            :element="editorStore.getElementById(childId)!"
            :is-dimmed="ui.activeGroupId === element.id && !ui.selectedIds.has(childId) && ui.selectedIds.size > 0"
            @mousedown="handleChildMouseDown($event, childId)"
            @dblclick="handleChildDblClick($event, childId)"
          />
        </template>
      </template>
    </g>
  </g>
</template>

<style scoped>
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
