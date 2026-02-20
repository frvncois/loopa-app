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

const staggerMs = ref(50)
const preset = ref('fade-in')
const easing = ref<EasingType>('ease-out')
const durationFrames = ref(12)

function applyStagger() {
  const p = ANIMATION_PRESETS.find(p => p.id === preset.value)
  if (!p) return
  const ids = [...ui.selectedIds]
  const staggerFrames = Math.round((staggerMs.value / 1000) * timeline.fps)
  ids.forEach((id, i) => {
    const el = editor.getElementById(id)
    if (!el) return
    const startFrame = timeline.currentFrame + i * staggerFrames
    const newKfs = p.apply(el, startFrame, durationFrames.value, easing.value)
    for (const kf of newKfs) editor.addKeyframe(kf)
  })
}
</script>

<template>
  <div class="section">
    <div class="title">Stagger</div>
    <div class="row">
      <span class="label">Delay</span>
      <input class="field" type="number" min="0" step="10" v-model.number="staggerMs" />
      <span class="unit">ms</span>
    </div>
    <div class="row">
      <span class="label">Preset</span>
      <select class="select" v-model="preset">
        <option v-for="p in ANIMATION_PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>
    </div>
    <div class="row">
      <span class="label">Duration</span>
      <input class="field" type="number" min="1" v-model.number="durationFrames" />
      <span class="unit">fr</span>
    </div>
    <button class="apply" @click="applyStagger">Apply Stagger</button>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
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
.apply {
  width: 100%; height: 1.75rem; background: var(--accent); color: #fff; border: none;
  border-radius: var(--r-sm); font-size: 0.6875rem; font-weight: 600; cursor: pointer;
  margin-top: 0.25rem; transition: background var(--ease);
  &:hover { background: var(--accent-h); }
}
</style>
