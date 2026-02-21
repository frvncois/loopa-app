<script setup lang="ts">
defineProps<{
  width: number
  height: number
  backgroundColor?: string
}>()
</script>

<template>
  <rect
    class="artboard"
    x="0"
    y="0"
    :width="width"
    :height="height"
    :fill="backgroundColor ? `#${backgroundColor}` : '#ffffff'"
    rx="2"
  />
</template>

<style scoped>
.artboard {
  filter: drop-shadow(0 2px 20px rgba(0,0,0,.35));
}
</style>
