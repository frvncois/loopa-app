<script setup lang="ts">
defineProps<{
  vertical?: boolean
}>()
</script>

<template>
  <div class="divider" :class="vertical ? 'vertical' : 'horizontal'" />
</template>

<style scoped>
.divider.horizontal {
  width: 1px;
  height: 22px;
  background: var(--border);
  margin: 0 4px;
}
.divider.vertical {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}
</style>
