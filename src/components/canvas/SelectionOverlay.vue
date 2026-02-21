<script setup lang="ts">
import { computed } from 'vue'
import type { Bounds } from '@/lib/elements/ElementBounds'

const props = defineProps<{
  bounds: Bounds
  rotation?: number     // element rotation in degrees (single-select only; 0 for multi)
  isRotating?: boolean
  rotationDeg?: number
  transformOrigin?: { x: number; y: number }
}>()

const emit = defineEmits<{
  resizeStart: [e: MouseEvent, handle: string]
  rotateStart: [e: MouseEvent]
  'origin-mousedown': [e: MouseEvent]
}>()

const HANDLES = [
  { id: 'nw', x: -4, y: -4 },
  { id: 'ne', x: 1,  y: -4 },
  { id: 'sw', x: -4, y: 1  },
  { id: 'se', x: 1,  y: 1  },
]

const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
const ROT_ZONE = 16

const rot = computed(() => props.rotation ?? 0)

// Origin position in SVG space (within bounds)
const originX = computed(() => {
  const ox = props.transformOrigin?.x ?? 0.5
  return props.bounds.x + ox * props.bounds.width
})
const originY = computed(() => {
  const oy = props.transformOrigin?.y ?? 0.5
  return props.bounds.y + oy * props.bounds.height
})

// SVG rotate(deg, cx, cy) — rotates around the element's transform origin
const groupTransform = computed(() => {
  if (!rot.value) return undefined
  return `rotate(${rot.value}, ${originX.value}, ${originY.value})`
})

// Rotation zones: 16×16, just outside each corner (in element-local space)
function rotZone(corner: string): { x: number; y: number } {
  const { x, y, width, height } = props.bounds
  switch (corner) {
    case 'nw': return { x: x - ROT_ZONE,   y: y - ROT_ZONE    }
    case 'ne': return { x: x + width,       y: y - ROT_ZONE    }
    case 'sw': return { x: x - ROT_ZONE,   y: y + height       }
    case 'se': return { x: x + width,       y: y + height       }
    default:   return { x: 0, y: 0 }
  }
}

// Rotate the resize cursor to match the visually rotated handle direction
const BASE_ANGLES: Record<string, number> = { nw: -135, ne: -45, se: 45, sw: 135 }

function getResizeCursor(handle: string): string {
  const norm = (((BASE_ANGLES[handle] ?? 0) + rot.value) % 360 + 360) % 360
  if (norm >= 337.5 || norm < 22.5)  return 'ew-resize'
  if (norm < 67.5)                   return 'nwse-resize'
  if (norm < 112.5)                  return 'ns-resize'
  if (norm < 157.5)                  return 'nesw-resize'
  if (norm < 202.5)                  return 'ew-resize'
  if (norm < 247.5)                  return 'nwse-resize'
  if (norm < 292.5)                  return 'ns-resize'
  return 'nesw-resize'
}

function onOriginHit(e: MouseEvent) {
  if (e.metaKey || e.ctrlKey) {
    e.stopPropagation()
    e.preventDefault()
    emit('origin-mousedown', e)
  }
}
</script>

<template>
  <g class="selection-overlay">
    <!--
      Single wrapper <g> that carries the rotation transform.
      When rotation=0 (or multi-select), groupTransform is undefined → no transform.
      Rotation zones, handles, and the dashed outline all move together.
    -->
    <g :transform="groupTransform">
      <!-- Dashed bounding rect -->
      <rect
        :x="bounds.x - 1"
        :y="bounds.y - 1"
        :width="bounds.width + 2"
        :height="bounds.height + 2"
        class="sel-box"
      />

      <!-- Rotation zones (behind handles in z-order) -->
      <rect
        v-for="corner in CORNERS"
        :key="`rot-${corner}`"
        :x="rotZone(corner).x"
        :y="rotZone(corner).y"
        :width="ROT_ZONE"
        :height="ROT_ZONE"
        fill="transparent"
        pointer-events="all"
        style="cursor: alias"
        @mousedown.stop="emit('rotateStart', $event)"
      />

      <!-- Corner resize handles -->
      <rect
        v-for="h in HANDLES"
        :key="h.id"
        :x="bounds.x + (h.x < 0 ? 0 : bounds.width) + h.x"
        :y="bounds.y + (h.y < 0 ? 0 : bounds.height) + h.y"
        width="8"
        height="8"
        rx="1.5"
        class="sel-handle"
        :style="{ cursor: getResizeCursor(h.id) }"
        @mousedown.stop="emit('resizeStart', $event, h.id)"
      />

      <!-- Rotation angle label (inside rotated group = above element in local space) -->
      <text
        v-if="isRotating"
        :x="bounds.x + bounds.width / 2"
        :y="bounds.y - 8"
        class="rot-label"
        text-anchor="middle"
      >{{ Math.round(rotationDeg ?? 0) }}°</text>

      <!-- Transform origin crosshair (shown for single-select) -->
      <g v-if="transformOrigin">
        <circle :cx="originX" :cy="originY" r="6" class="origin-outer" />
        <circle :cx="originX" :cy="originY" r="2" class="origin-inner" />
        <line :x1="originX - 8" :y1="originY" :x2="originX + 8" :y2="originY" class="origin-cross" />
        <line :x1="originX" :y1="originY - 8" :x2="originX" :y2="originY + 8" class="origin-cross" />
        <!-- Hit area for Cmd+drag -->
        <circle
          :cx="originX"
          :cy="originY"
          r="10"
          fill="transparent"
          style="cursor: move"
          @mousedown="onOriginHit"
        />
      </g>
    </g>
  </g>
</template>

<style scoped>
.sel-box {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 5 4;
  pointer-events: none;
}
.sel-handle {
  fill: #fff;
  stroke: var(--accent);
  stroke-width: 1.5;
}
.sel-handle:hover { fill: var(--accent); }
.rot-label {
  font-family: var(--mono);
  font-size: 0.625em;
  fill: var(--accent);
  pointer-events: none;
}
.origin-outer {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5px;
  pointer-events: none;
}
.origin-inner {
  fill: var(--accent);
  pointer-events: none;
}
.origin-cross {
  stroke: var(--accent);
  stroke-width: 1px;
  pointer-events: none;
}
</style>
