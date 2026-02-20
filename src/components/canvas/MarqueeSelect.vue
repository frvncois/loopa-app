<script setup lang="ts">
defineProps<{
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}>()
</script>

<template>
  <rect
    v-if="visible"
    :x="width < 0 ? x + width : x"
    :y="height < 0 ? y + height : y"
    :width="Math.abs(width)"
    :height="Math.abs(height)"
    class="marquee"
  />
</template>

<style scoped>
.marquee {
  fill: var(--accent-s);
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  pointer-events: none;
}
</style>
