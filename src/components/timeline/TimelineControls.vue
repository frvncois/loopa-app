<script setup lang="ts">
import { useTimelineStore } from '@/stores/timelineStore'
import IconPlay from '@/components/icons/IconPlay.vue'
import IconPause from '@/components/icons/IconPause.vue'
import IconStop from '@/components/icons/IconStop.vue'
import IconLoop from '@/components/icons/IconLoop.vue'
import IconPlus from '@/components/icons/IconPlus.vue'

const emit = defineEmits<{ 'add-keyframe': [] }>()
const timeline = useTimelineStore()
</script>

<template>
  <div class="controls">
    <!-- Play / Stop -->
    <button
      class="button is-icon is-sm"
      :title="timeline.isPlaying ? 'Pause (Space)' : 'Play (Space)'"
      :aria-label="timeline.isPlaying ? 'Pause' : 'Play'"
      :aria-pressed="timeline.isPlaying"
      @click="timeline.togglePlay()"
    >
      <IconPlay v-if="!timeline.isPlaying" />
      <IconPause v-else />
    </button>
    <button class="button is-icon is-sm" title="Stop" aria-label="Stop" @click="timeline.stop()">
      <IconStop />
    </button>

    <div class="divider" />

    <!-- Time display -->
    <span class="time">{{ timeline.currentTime }} / {{ timeline.totalTime }}</span>

    <div class="divider" />

    <!-- Frame number input -->
    <span class="hint" aria-hidden="true">Frame</span>
    <input
      class="mini-input"
      type="number"
      aria-label="Current frame"
      min="0"
      :max="timeline.totalFrames"
      :value="Math.round(timeline.currentFrame)"
      @change="timeline.seek(parseInt(($event.target as HTMLInputElement).value) || 0)"
    />

    <!-- FPS input -->
    <span class="hint" aria-hidden="true">FPS</span>
    <input
      class="mini-input is-fps"
      type="number"
      aria-label="Frames per second"
      min="1"
      max="120"
      :value="timeline.fps"
      @change="timeline.setFps(parseInt(($event.target as HTMLInputElement).value) || 24)"
    />

    <div class="spacer" />

    <!-- Loop toggle -->
    <button
      class="button is-icon is-sm"
      :class="{ 'is-active': timeline.loop }"
      title="Toggle loop"
      aria-label="Toggle loop"
      :aria-pressed="timeline.loop"
      @click="timeline.setLoop(!timeline.loop)"
    >
      <IconLoop />
    </button>

    <!-- + Keyframe -->
    <button class="button is-accent is-sm kf-add" aria-label="Add keyframe at current frame" @click="emit('add-keyframe')">
      <IconPlus />
      Keyframe
    </button>
  </div>
</template>

<style scoped>
.controls {
  height: 2.125rem;
  min-height: 2.125rem;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.divider { width: 1px; height: 1.375rem; background: var(--border); margin: 0 0.125rem; }
.spacer { flex: 1; }
.time { font-family: var(--mono); font-size: 0.6875rem; color: var(--text-2); min-width: 4rem; }
.hint { font-size: 0.625rem; color: var(--text-3); }
.mini-input {
  height: 1.375rem;
  width: 2.375rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  font-family: var(--mono);
  font-size: 0.625rem;
  text-align: center;
  outline: none;
  padding: 0 0.125rem;
  &:focus { border-color: var(--accent); }
  &.is-fps { width: 2rem; }
}
.kf-add { gap: 0.1875rem; }

.button {
  height: 1.625rem;
  padding: 0 0.4375rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.6875rem;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-icon { width: 1.625rem; padding: 0; }
  &.is-sm {
    height: 1.5rem; padding: 0 0.375rem; font-size: 0.6875rem;
    &.is-icon { width: 1.5rem; }
  }
  &.is-ghost {
    border-color: transparent; background: transparent;
    &:hover { background: var(--bg-4); border-color: transparent; }
  }
  &.is-accent {
    background: var(--accent); color: #fff; border-color: var(--accent);
    &:hover { background: var(--accent-h); }
  }
  &.is-active { color: var(--accent); border-color: var(--accent); background: var(--accent-s); }
}
</style>
