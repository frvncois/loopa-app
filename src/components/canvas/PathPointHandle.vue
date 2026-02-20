<script setup lang="ts">
import type { PathElement } from '@/types/elements'
import type { usePathEditor } from '@/composables/usePathEditor'

const props = defineProps<{
  path: PathElement
  pathEditor: ReturnType<typeof usePathEditor>
}>()
</script>

<template>
  <g pointer-events="all">
    <template v-for="pt in path.points" :key="pt.id">
      <!-- HandleIn line + knob -->
      <g v-if="pt.handleIn">
        <line
          :x1="pt.x"
          :y1="pt.y"
          :x2="pt.handleIn.x"
          :y2="pt.handleIn.y"
          stroke="#4353ff"
          stroke-width="0.75"
          stroke-dasharray="3 2"
          pointer-events="none"
        />
        <circle
          :cx="pt.handleIn.x"
          :cy="pt.handleIn.y"
          r="3"
          fill="#4353ff"
          stroke="white"
          stroke-width="1"
          style="cursor: crosshair"
          @mousedown.stop="(e) => pathEditor.onHandleMouseDown(e, pt.id, 'in')"
        />
      </g>

      <!-- HandleOut line + knob -->
      <g v-if="pt.handleOut">
        <line
          :x1="pt.x"
          :y1="pt.y"
          :x2="pt.handleOut.x"
          :y2="pt.handleOut.y"
          stroke="#4353ff"
          stroke-width="0.75"
          stroke-dasharray="3 2"
          pointer-events="none"
        />
        <circle
          :cx="pt.handleOut.x"
          :cy="pt.handleOut.y"
          r="3"
          fill="#4353ff"
          stroke="white"
          stroke-width="1"
          style="cursor: crosshair"
          @mousedown.stop="(e) => pathEditor.onHandleMouseDown(e, pt.id, 'out')"
        />
      </g>

      <!-- Anchor point -->
      <rect
        :x="pt.x - 4"
        :y="pt.y - 4"
        width="8"
        height="8"
        :fill="pathEditor.editingPointId.value === pt.id ? '#4353ff' : 'white'"
        stroke="#4353ff"
        stroke-width="1.5"
        style="cursor: move"
        @mousedown.stop="(e) => pathEditor.onPointMouseDown(e, pt.id)"
        @click.stop.alt="() => pathEditor.cyclePointType(pt.id)"
      />
    </template>
  </g>
</template>
