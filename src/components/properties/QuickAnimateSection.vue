<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useKeyframes } from '@/composables/useKeyframes'
import { ANIMATION_PRESETS } from '@/lib/animation/presets'
import type { EasingType } from '@/types/animation'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()
const kfOps = useKeyframes(editor, ui, timeline)

const duration = ref(0.5) // seconds
const easing = ref<EasingType>('ease-out')

const easingOptions: { value: EasingType; label: string }[] = [
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'spring', label: 'Spring' },
  { value: 'ease-out-back', label: 'Ease Out Back' },
  { value: 'ease-out-bounce', label: 'Ease Out Bounce' },
]

function applyPreset(presetId: string) {
  const preset = ANIMATION_PRESETS.find(p => p.id === presetId)
  if (!preset) return
  const durationFrames = Math.round(duration.value * timeline.fps)
  const startFrame = timeline.currentFrame
  for (const id of ui.selectedIds) {
    const el = editor.getElementById(id)
    if (!el) continue
    const newKfs = preset.apply(el, startFrame, durationFrames, easing.value)
    for (const kf of newKfs) editor.addKeyframe(kf)
  }
}
</script>

<template>
  <div class="section">
    <div class="title">Quick Animate</div>
    <div class="preset-grid">
      <button
        v-for="p in ANIMATION_PRESETS"
        :key="p.id"
        class="preset"
        :title="p.label"
        @click="applyPreset(p.id)"
      >
        <component :is="p.icon" />
        {{ p.label }}
      </button>
    </div>
    <div class="row" style="margin-top:0.5rem">
      <span class="label">Duration</span>
      <input class="field" type="number" min="0.1" step="0.1" v-model.number="duration" />
      <span class="unit">sec</span>
    </div>
    <div class="row">
      <span class="label">Easing</span>
      <select class="select" v-model="easing">
        <option v-for="opt in easingOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }
.preset {
  height: 1.875rem; display: flex; align-items: center; justify-content: center;
  gap: 0.25rem; font-size: 0.625rem; font-weight: 500; color: var(--text-2);
  background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); cursor: pointer; transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); border-color: var(--border-l); }
  svg { width: 0.75rem; height: 0.75rem; opacity: 0.6; flex-shrink: 0; }
}
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.6875rem; outline: none; min-width: 0;
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem; font-size: 0.6875rem; outline: none;
}
.unit { font-size: 0.625rem; color: var(--text-4); min-width: 1.25rem; }
</style>
