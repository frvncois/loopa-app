<script setup lang="ts">
defineProps<{
  width: number
  height: number
}>()
</script>

<template>
  <rect
    class="artboard"
    x="0"
    y="0"
    :width="width"
    :height="height"
    rx="2"
  />
</template>

<style scoped>
.artboard {
  fill: #fff;
  filter: drop-shadow(0 2px 20px rgba(0,0,0,.35));
}
</style>
