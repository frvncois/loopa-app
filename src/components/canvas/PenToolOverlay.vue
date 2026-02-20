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

const showPreviewLine = computed(() =>
  lastPoint.value !== null && pt.pendingAnchor.value === null
)
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

    <!-- Preview line: last placed point → cursor -->
    <line
      v-if="showPreviewLine && lastPoint"
      :x1="lastPoint.x"
      :y1="lastPoint.y"
      :x2="pt.previewPos.value.x"
      :y2="pt.previewPos.value.y"
      stroke="#4353ff"
      stroke-width="1"
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

    <!-- Placed anchor points -->
    <circle
      v-for="(p, idx) in pt.currentPoints.value"
      :key="p.id"
      :cx="p.x"
      :cy="p.y"
      r="4"
      fill="white"
      :stroke="idx === 0 && pt.currentPoints.value.length >= 3 ? '#34d399' : '#4353ff'"
      stroke-width="1.5"
    />

    <!-- Closure indicator on first point -->
    <circle
      v-if="pt.currentPoints.value.length >= 3"
      :cx="pt.currentPoints.value[0].x"
      :cy="pt.currentPoints.value[0].y"
      r="8"
      fill="none"
      stroke="#34d399"
      stroke-width="1"
      opacity="0.6"
    />
  </g>
</template>
