<script setup lang="ts">
import { computed } from 'vue'
import type { usePenTool } from '@/composables/usePenTool'
import { pathPointsToD } from '@/lib/path/PathBuilder'

const props = defineProps<{
  penTool: ReturnType<typeof usePenTool>
}>()

const pt = props.penTool

/** d string for all already-placed points */
const placedD = computed(() => {
  const pts = pt.currentPoints.value
  if (pts.length < 2) return ''
  return pathPointsToD(pts, false)
})

const lastPoint = computed(() => {
  const pts = pt.currentPoints.value
  return pts.length > 0 ? pts[pts.length - 1] : null
})

/** Show rubber-band from last point to cursor only when NOT placing a new point */
const showPreviewLine = computed(() =>
  lastPoint.value !== null && pt.pendingAnchor.value === null
)

/**
 * During handle drag: show the forming curve from the last confirmed point
 * to the pending anchor using the handles being dragged.
 */
const pendingCurveD = computed(() => {
  const anchor = pt.pendingAnchor.value
  const pts    = pt.currentPoints.value
  if (!anchor || pts.length === 0) return ''
  const last = pts[pts.length - 1]
  // cp1: last confirmed point's handleOut (or point itself if corner)
  const cp1x = last.handleOut ? last.handleOut.x : last.x
  const cp1y = last.handleOut ? last.handleOut.y : last.y
  // cp2: mirror of pendingHandleOut (= handleIn of the point being placed)
  const hOut = pt.pendingHandleOut.value
  const cp2x = hOut ? anchor.x * 2 - hOut.x : anchor.x
  const cp2y = hOut ? anchor.y * 2 - hOut.y : anchor.y
  return `M ${last.x},${last.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${anchor.x},${anchor.y}`
})
</script>

<template>
  <g pointer-events="none">
    <!-- Path drawn so far -->
    <path
      v-if="placedD"
      :d="placedD"
      fill="none"
      stroke="#4353ff"
      stroke-width="1.5"
      stroke-linecap="round"
    />

    <!-- Rubber-band: curve from last placed point to cursor (free movement only) -->
    <path
      v-if="showPreviewLine && lastPoint"
      :d="`M ${lastPoint.x},${lastPoint.y} C ${lastPoint.handleOut ? lastPoint.handleOut.x : lastPoint.x},${lastPoint.handleOut ? lastPoint.handleOut.y : lastPoint.y} ${pt.previewPos.value.x},${pt.previewPos.value.y} ${pt.previewPos.value.x},${pt.previewPos.value.y}`"
      fill="none"
      stroke="#4353ff"
      stroke-width="1"
      stroke-dasharray="4 3"
      opacity="0.7"
    />

    <!-- Forming curve: last placed point → pending anchor (during handle drag) -->
    <path
      v-if="pendingCurveD"
      :d="pendingCurveD"
      fill="none"
      stroke="#4353ff"
      stroke-width="1.5"
      stroke-dasharray="4 3"
      opacity="0.7"
    />

    <!-- Smooth-point drag: anchor + handles -->
    <g v-if="pt.pendingAnchor.value && pt.pendingHandleOut.value">
      <!-- Out-handle line -->
      <line
        :x1="pt.pendingAnchor.value.x"
        :y1="pt.pendingAnchor.value.y"
        :x2="pt.pendingHandleOut.value.x"
        :y2="pt.pendingHandleOut.value.y"
        stroke="#4353ff"
        stroke-width="1"
        stroke-dasharray="3 2"
      />
      <!-- In-handle line (mirror) -->
      <line
        :x1="pt.pendingAnchor.value.x"
        :y1="pt.pendingAnchor.value.y"
        :x2="pt.pendingAnchor.value.x * 2 - pt.pendingHandleOut.value.x"
        :y2="pt.pendingAnchor.value.y * 2 - pt.pendingHandleOut.value.y"
        stroke="#4353ff"
        stroke-width="1"
        stroke-dasharray="3 2"
      />
      <!-- Anchor circle -->
      <circle
        :cx="pt.pendingAnchor.value.x"
        :cy="pt.pendingAnchor.value.y"
        r="4"
        fill="white"
        stroke="#4353ff"
        stroke-width="1.5"
      />
      <!-- Out-handle knob -->
      <circle
        :cx="pt.pendingHandleOut.value.x"
        :cy="pt.pendingHandleOut.value.y"
        r="3"
        fill="#4353ff"
        stroke="white"
        stroke-width="1"
      />
      <!-- In-handle knob (mirror) -->
      <circle
        :cx="pt.pendingAnchor.value.x * 2 - pt.pendingHandleOut.value.x"
        :cy="pt.pendingAnchor.value.y * 2 - pt.pendingHandleOut.value.y"
        r="3"
        fill="#4353ff"
        stroke="white"
        stroke-width="1"
      />
    </g>

    <!-- Placed anchor points (first turns green when near-close) -->
    <circle
      v-for="(p, idx) in pt.currentPoints.value"
      :key="p.id"
      :cx="p.x"
      :cy="p.y"
      r="4"
      fill="white"
      :stroke="idx === 0 && pt.isNearFirstPoint.value ? '#34d399' : '#4353ff'"
      stroke-width="1.5"
    />

    <!-- Close indicator ring: only shown when cursor is within close distance -->
    <circle
      v-if="pt.isNearFirstPoint.value"
      :cx="pt.currentPoints.value[0].x"
      :cy="pt.currentPoints.value[0].y"
      :r="pt.closeThresholdSvg.value"
      fill="none"
      stroke="#34d399"
      stroke-width="1.5"
      opacity="0.7"
    />
  </g>
</template>
