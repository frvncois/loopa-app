<script setup lang="ts">
import type { useKeyframes } from '@/composables/useKeyframes'
import TimelineControls from './TimelineControls.vue'
import TimelineTrackList from './TimelineTrackList.vue'

defineProps<{
  keyframeOps: ReturnType<typeof useKeyframes>
}>()
</script>

<template>
  <div class="timeline">
    <TimelineControls @add-keyframe="keyframeOps.addKeyframeForSelected()" />
    <TimelineTrackList />
  </div>
</template>

<style scoped>
.timeline {
  height: 100%;
  background: var(--bg-2);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
