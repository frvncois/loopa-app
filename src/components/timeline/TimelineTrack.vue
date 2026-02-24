<script setup lang="ts">
import type { Keyframe } from '@/types/animation'
import type { MotionPath } from '@/types/motionPath'
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
  // Optional: full motion path object for interactive bar
  motionPath?: MotionPath
}>()

const emit = defineEmits<{
  'keyframe-mousedown': [kf: Keyframe, e: MouseEvent]
  'track-click': [e: MouseEvent]
  'mp-bar-mousedown': [mpId: string, mode: 'move' | 'resize-left' | 'resize-right', e: MouseEvent]
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

function mpBarStyle() {
  if (!props.motionPath) return null
  const leftPx  = props.rulerOffset + props.motionPath.startFrame * props.pixelsPerFrame
  const widthPx = Math.max(8, (props.motionPath.endFrame - props.motionPath.startFrame) * props.pixelsPerFrame)
  return { left: `${leftPx}px`, width: `${widthPx}px` }
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

    <!-- Motion path bar (interactive: drag to move, handles to resize) -->
    <template v-if="motionPath">
      <div
        class="mp-bar"
        :style="mpBarStyle()!"
        @mousedown.stop="emit('mp-bar-mousedown', motionPath!.id, 'move', $event)"
        @click.stop
      >
        <div
          class="mp-handle mp-handle-left"
          @mousedown.stop="emit('mp-bar-mousedown', motionPath!.id, 'resize-left', $event)"
          @click.stop
        />
        <span class="mp-label">Motion Path</span>
        <div
          class="mp-handle mp-handle-right"
          @mousedown.stop="emit('mp-bar-mousedown', motionPath!.id, 'resize-right', $event)"
          @click.stop
        />
      </div>
    </template>

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

.mp-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid var(--accent);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  user-select: none;
  transition: background 100ms;
  &:hover { background: color-mix(in srgb, var(--accent) 22%, transparent); }
  &:active { cursor: grabbing; }
}

.mp-label {
  font-size: 0.5rem;
  color: var(--accent);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.625rem;
  opacity: 0.8;
  flex: 1;
  text-align: center;
}

.mp-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.375rem;
  cursor: ew-resize;
  z-index: 6;
  transition: background 100ms;
  &:hover { background: color-mix(in srgb, var(--accent) 40%, transparent); }
}

.mp-handle-left {
  left: -1px;
  border-radius: 0.25rem 0 0 0.25rem;
}

.mp-handle-right {
  right: -1px;
  border-radius: 0 0.25rem 0.25rem 0;
}
</style>
