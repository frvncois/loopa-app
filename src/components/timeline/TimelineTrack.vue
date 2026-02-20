<script setup lang="ts">
import type { Keyframe } from '@/types/animation'
import TimelineKeyframe from './TimelineKeyframe.vue'

const props = defineProps<{
  keyframes: Keyframe[]
  pixelsPerFrame: number
  rulerOffset: number
  selected: boolean
  selectedKeyframeId: string | null
}>()

const emit = defineEmits<{
  'keyframe-click': [kf: Keyframe]
  'track-click': [e: MouseEvent]
}>()

function frameToX(frame: number): number {
  return props.rulerOffset + frame * props.pixelsPerFrame
}
</script>

<template>
  <div
    class="track"
    :class="{ 'is-selected': selected }"
    @click="emit('track-click', $event)"
  >
    <TimelineKeyframe
      v-for="kf in keyframes"
      :key="kf.id"
      :keyframe="kf"
      :x="frameToX(kf.frame)"
      :selected="kf.id === selectedKeyframeId"
      @click="(k) => emit('keyframe-click', k)"
    />
  </div>
</template>

<style scoped>
.track {
  height: 1.75rem;
  border-bottom: 1px solid var(--border);
  position: relative;
  cursor: pointer;
  transition: background var(--ease);
  &:hover { background: rgba(255,255,255,.02); }
  &.is-selected { background: var(--accent-s); }
}
</style>
