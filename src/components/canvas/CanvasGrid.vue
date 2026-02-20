<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'
import { computed } from 'vue'

const props = defineProps<{
  artboardWidth: number
  artboardHeight: number
}>()

const ui = useUiStore()
const id = Math.random().toString(36).slice(2, 8)
</script>

<template>
  <g>
    <defs>
      <pattern :id="`g10-${id}`" :width="ui.gridSize" :height="ui.gridSize" patternUnits="userSpaceOnUse">
        <path :d="`M ${ui.gridSize} 0 L 0 0 0 ${ui.gridSize}`" fill="none" class="grid-line"/>
      </pattern>
      <pattern :id="`g100-${id}`" :width="ui.gridSize * 10" :height="ui.gridSize * 10" patternUnits="userSpaceOnUse">
        <rect :width="ui.gridSize * 10" :height="ui.gridSize * 10" :fill="`url(#g10-${id})`"/>
        <path :d="`M ${ui.gridSize * 10} 0 L 0 0 0 ${ui.gridSize * 10}`" fill="none" class="grid-line-major"/>
      </pattern>
    </defs>
    <rect x="0" y="0" :width="artboardWidth" :height="artboardHeight" :fill="`url(#g100-${id})`"/>
  </g>
</template>

<style scoped>
.grid-line { stroke: #e2e2ea; stroke-width: 0.4; opacity: 0.12; }
.grid-line-major { stroke: #d0d0db; stroke-width: 0.6; opacity: 0.18; }
</style>
