<script setup lang="ts">
import type { Keyframe } from '@/types/animation'

const props = defineProps<{
  keyframe: Keyframe
  x: number
  selected: boolean
}>()

const emit = defineEmits<{
  click: [kf: Keyframe, e: MouseEvent]
}>()
</script>

<template>
  <div
    class="keyframe"
    :class="{ 'is-selected': selected }"
    :style="{ left: `${x}px` }"
    :title="`Frame ${keyframe.frame} — ${keyframe.easing}`"
    @click.stop="emit('click', keyframe, $event)"
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
  transition: all var(--ease);
  &:hover { transform: translate(-50%, -50%) rotate(45deg) scale(1.25); }
  &.is-selected {
    background: var(--yellow);
    box-shadow: 0 0 0.375rem rgba(251, 191, 36, 0.5);
  }
}
</style>
