<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  frame: number
  pixelsPerFrame: number
  rulerOffset: number
}>()

const x = computed(() => props.rulerOffset + props.frame * props.pixelsPerFrame)
</script>

<template>
  <div class="playhead" :style="{ left: `${x}px` }" />
</template>

<style scoped>
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--red);
  z-index: 10;
  cursor: col-resize;
}
.playhead::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -5px;
  width: 11px;
  height: 10px;
  background: var(--red);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
</style>
