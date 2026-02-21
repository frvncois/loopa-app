<script setup lang="ts">
import type { Keyframe } from '@/types/animation'

const props = defineProps<{
  keyframe: Keyframe
  x: number
  selected: boolean
  dragOffsetPx?: number
  isDragging?: boolean
}>()

const emit = defineEmits<{
  mousedown: [kf: Keyframe, e: MouseEvent]
}>()
</script>

<template>
  <div
    class="keyframe"
    :class="{ 'is-selected': selected, 'is-dragging': isDragging }"
    :style="{ left: `${x + (dragOffsetPx ?? 0)}px` }"
    :title="`Frame ${keyframe.frame}${isDragging && dragOffsetPx ? ` → ${keyframe.frame + Math.round(dragOffsetPx / 8)}` : ''} — ${keyframe.easing}`"
    @mousedown.stop="emit('mousedown', keyframe, $event)"
    @click.stop
  />
</template>

<style scoped>
.keyframe {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 0.5625rem;
  height: 0.5625rem;
  background: var(--accent);
  border: 1.5px solid #fff;
  cursor: pointer;
  z-index: 2;
  transition: background var(--ease), box-shadow var(--ease);
  &:hover { transform: translate(-50%, -50%) rotate(45deg) scale(1.25); }
  &.is-selected {
    background: var(--yellow);
    box-shadow: 0 0 0.375rem rgba(251, 191, 36, 0.5);
  }
  &.is-dragging {
    opacity: 0.7;
    cursor: col-resize;
  }
}
</style>
