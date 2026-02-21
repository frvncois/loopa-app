<script setup lang="ts">
import type { Keyframe } from '@/types/animation'
import TimelineKeyframe from './TimelineKeyframe.vue'

const props = defineProps<{
  keyframes: Keyframe[]
  pixelsPerFrame: number
  rulerOffset: number
  selected: boolean
  selectedKeyframeIds: Set<string>
  dragFrameOffset: number
  draggingIds: Set<string>
  // Optional: video trim metadata for bar visualization
  videoTrim?: { trimStart: number; trimEnd: number; fps: number }
}>()

const emit = defineEmits<{
  'keyframe-mousedown': [kf: Keyframe, e: MouseEvent]
  'track-click': [e: MouseEvent]
}>()

function frameToX(kf: Keyframe): number {
  const offset = props.draggingIds.has(kf.id) ? props.dragFrameOffset : 0
  return props.rulerOffset + (kf.frame + offset) * props.pixelsPerFrame
}

function trimBarStyle() {
  if (!props.videoTrim) return null
  const { trimStart, trimEnd, fps } = props.videoTrim
  const startPx = props.rulerOffset + Math.round(trimStart * fps) * props.pixelsPerFrame
  const endPx   = props.rulerOffset + Math.round(trimEnd   * fps) * props.pixelsPerFrame
  return {
    left: `${startPx}px`,
    width: `${Math.max(0, endPx - startPx)}px`,
  }
}
</script>

<template>
  <div
    class="track"
    :class="{ 'is-selected': selected, 'is-video': !!videoTrim }"
    @click="emit('track-click', $event)"
  >
    <!-- Video trim bar -->
    <div v-if="videoTrim" class="trim-bar" :style="trimBarStyle()!" />

    <TimelineKeyframe
      v-for="kf in keyframes"
      :key="kf.id"
      :keyframe="kf"
      :x="frameToX(kf)"
      :selected="selectedKeyframeIds.has(kf.id)"
      :is-dragging="draggingIds.has(kf.id)"
      @mousedown="(k, e) => emit('keyframe-mousedown', k, e)"
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

.trim-bar {
  position: absolute;
  top: 25%;
  height: 50%;
  background: rgba(251, 191, 36, 0.18);
  border-top: 1px solid rgba(251, 191, 36, 0.5);
  border-bottom: 1px solid rgba(251, 191, 36, 0.5);
  pointer-events: none;
  border-radius: 1px;
}
</style>
