<script setup lang="ts">
import { useTimelineStore } from '@/stores/timelineStore'
import type { PlaybackDirection } from '@/types/animation'

const timeline = useTimelineStore()

const directionOptions: { value: PlaybackDirection; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'alternate', label: 'Alternate' },
  { value: 'alternate-reverse', label: 'Alt-Reverse' },
]

function onDurationChange(val: string) {
  const sec = parseFloat(val)
  if (!isNaN(sec) && sec > 0) {
    timeline.setTotalFrames(Math.round(sec * timeline.fps))
  }
}

function onFpsChange(val: string) {
  const fps = parseInt(val)
  if (!isNaN(fps) && fps > 0) timeline.setFps(fps)
}
</script>

<template>
  <div class="section">
    <div class="title">Playback</div>
    <div class="row">
      <span class="label">Duration</span>
      <input
        class="field"
        type="number"
        min="0.1"
        step="0.1"
        :value="(timeline.totalFrames / timeline.fps).toFixed(1)"
        @change="onDurationChange(($event.target as HTMLInputElement).value)"
      />
      <span class="unit">sec</span>
    </div>
    <div class="row">
      <span class="label">Frame rate</span>
      <input
        class="field"
        type="number"
        min="1"
        max="120"
        :value="timeline.fps"
        @change="onFpsChange(($event.target as HTMLInputElement).value)"
      />
      <span class="unit">fps</span>
    </div>
    <div class="row">
      <span class="label">Direction</span>
      <select
        class="select"
        :value="timeline.direction"
        @change="timeline.setDirection(($event.target as HTMLSelectElement).value as PlaybackDirection)"
      >
        <option v-for="opt in directionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <label class="check" style="margin-top:0.125rem">
      <input type="checkbox" :checked="timeline.loop" @change="timeline.setLoop(($event.target as HTMLInputElement).checked)" />
      Loop animation
    </label>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.6875rem; outline: none; transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-size: 0.6875rem; outline: none; cursor: pointer;
}
.unit { font-size: 0.625rem; color: var(--text-4); min-width: 1.25rem; }
.check {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.6875rem; color: var(--text-2); cursor: pointer; height: 1.625rem;
  input[type="checkbox"] { width: 0.875rem; height: 0.875rem; accent-color: var(--accent); cursor: pointer; }
}
</style>
