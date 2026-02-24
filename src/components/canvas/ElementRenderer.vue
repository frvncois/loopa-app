<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef, Ref } from 'vue'
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

// Injected text edit state for inline text editing
interface TextEditState {
  editingTextId: Ref<string | null>
  editingTextValue: Ref<string>
  commitTextEdit: () => void
  cancelTextEdit: () => void
  onTextEditorInput: (e: Event) => void
  onTextEditorKeyDown: (e: KeyboardEvent) => void
  measureAndUpdateTextBounds: (id: string) => void
}
const textEditState = inject<TextEditState>('textEditState')

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
  const base = props.element
  const origin = resolveOrigin(e)
  // Groups have children at absolute artboard coords — use the base (non-animated) position
  // as the rotation/scale center, and express position animation as a translate delta.
  // Non-group elements position themselves via their own shape attributes (x/y), so the
  // rotation center uses the animated position directly.
  const isGroup = base.type === 'group'
  const cx = isGroup ? (base.x + origin.x * base.width)  : (e.x + origin.x * e.width)
  const cy = isGroup ? (base.y + origin.y * base.height) : (e.y + origin.y * e.height)
  const parts = []
  if (isGroup) {
    const dx = e.x - base.x
    const dy = e.y - base.y
    if (dx !== 0 || dy !== 0) parts.push(`translate(${dx} ${dy})`)
  }
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

// 3D CSS transform — active when rotateX or rotateY != 0
const cssTransform3d = computed((): Record<string, string> | undefined => {
  const e = el.value
  const rx3d = (e as any).rotateX ?? 0
  const ry3d = (e as any).rotateY ?? 0
  if (rx3d === 0 && ry3d === 0) return undefined

  const p  = (e as any).perspective ?? 800
  const ox = (e as any).transformOriginX ?? (e as any).transformOrigin?.x ?? 0.5
  const oy = (e as any).transformOriginY ?? (e as any).transformOrigin?.y ?? 0.5
  const rz = (e as any).rotation ?? 0
  const sx = ((e as any).scaleX ?? 1) * ((e as any).flipX ? -1 : 1)
  const sy = ((e as any).scaleY ?? 1) * ((e as any).flipY ? -1 : 1)

  const t: string[] = [`perspective(${p}px)`]
  if (rz) t.push(`rotateZ(${rz}deg)`)
  t.push(`rotateX(${rx3d}deg)`, `rotateY(${ry3d}deg)`)
  if (sx !== 1 || sy !== 1) t.push(`scale(${sx}, ${sy})`)

  return {
    'transform-origin': `${ox * 100}% ${oy * 100}%`,
    'transform': t.join(' '),
    'transform-box': 'fill-box',
  }
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
    case 'ellipse':
      return { tag: 'ellipse', attrs: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, transform: transformAttr } }
    case 'path': {
      // Path d uses relative coords when relativePoints is set — add translate to position it
      const pathIsRelative = (mse as any).relativePoints
      const pathTranslate = pathIsRelative ? `translate(${x} ${y})` : undefined
      const pathTransform = [pathTranslate, transformAttr].filter(Boolean).join(' ') || undefined
      return { tag: 'path', attrs: { d: (anim.d as string | undefined) ?? (mse as any).d ?? '', fill: 'black', transform: pathTransform } }
    }
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
    :transform="cssTransform3d ? undefined : transform"
    :filter="filterAttr"
    :style="cssTransform3d ? { cursor: 'move', ...cssTransform3d } : { cursor: 'move' }"
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

      <!-- Text: multiline SVG (hidden while editing) + foreignObject inline editor -->
      <template v-else-if="element.type === 'text'">
        <!-- Multiline SVG text via tspan per line; dominant-baseline="hanging" → y is top of text -->
        <text
          v-if="textEditState?.editingTextId.value !== element.id"
          :data-id="element.id"
          :x="el.x"
          :y="el.y"
          :font-family="(element as any).fontFamily ?? 'DM Sans'"
          :font-size="(element as any).fontSize ?? 24"
          :font-weight="(element as any).fontWeight ?? 400"
          :fill="fillAttr"
          :fill-opacity="fillOpacity"
          dominant-baseline="hanging"
        >
          <tspan
            v-for="(line, li) in ((element as any).text ?? 'Text').split('\n')"
            :key="li"
            :x="el.x"
            :dy="li === 0 ? 0 : ((element as any).fontSize ?? 24) * 1.25"
          >{{ line || '\u00A0' }}</tspan>
        </text>

        <!-- Inline editor: foreignObject in SVG coordinate space → font size & position match exactly -->
        <foreignObject
          v-if="textEditState?.editingTextId.value === element.id"
          :x="el.x"
          :y="el.y"
          width="4000"
          height="4000"
          style="overflow: visible; pointer-events: none"
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            id="canvas-text-editor"
            contenteditable="true"
            spellcheck="false"
            :style="{
              fontSize: ((element as any).fontSize ?? 24) + 'px',
              fontFamily: (element as any).fontFamily ?? 'DM Sans',
              fontWeight: (element as any).fontWeight ?? 400,
              color: fillAttr !== 'none' ? fillAttr : '#ededf0',
              background: 'none',
              border: 'none',
              outline: '1.5px solid var(--accent, #4353ff)',
              outlineOffset: '4px',
              borderRadius: '2px',
              padding: '0',
              margin: '0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              minWidth: '20px',
              minHeight: ((element as any).fontSize ?? 24) + 'px',
              display: 'inline-block',
              lineHeight: '1.25',
              cursor: 'text',
              caretColor: 'var(--accent, #4353ff)',
              pointerEvents: 'auto',
              userSelect: 'text',
            }"
            @input="textEditState?.onTextEditorInput($event)"
            @keydown.stop="textEditState?.onTextEditorKeyDown($event as KeyboardEvent)"
            @mousedown.stop
            @click.stop
            @dblclick.stop
            @blur="textEditState?.commitTextEdit()"
          ></div>
        </foreignObject>
      </template>

      <!-- Path (relative coords: translate to el.x/el.y, d uses local space) -->
      <g
        v-else-if="element.type === 'path'"
        :transform="(element as any).relativePoints ? `translate(${el.x} ${el.y})` : undefined"
      >
        <path
          v-if="(element as any).d"
          :d="(el as any).d ?? (element as any).d"
          :fill="(element as any).closed ? fillAttr : 'none'"
          :fill-opacity="fillOpacity"
          :stroke="strokeAttr !== 'none' ? strokeAttr : (!(element as any).closed ? fillAttr : 'none')"
          :stroke-width="strokeWidth || 2"
          :stroke-dasharray="strokeDashArray"
          stroke-linecap="round"
        />
      </g>

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

        <!-- REGULAR GROUP: render all children with their own animated props -->
        <template v-else>
          <ElementRenderer
            v-for="childId in (element as GroupElement).childIds"
            :key="childId"
            :element="editorStore.getElementById(childId)!"
            :animated-props="animatedPropsMap?.get(childId)"
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
