<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { useHistory } from '@/composables/useHistory'
import { ANIMATION_PRESETS } from '@/lib/animation/presets'
import type { EasingType } from '@/types/animation'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()
const history = inject<ReturnType<typeof useHistory>>('history')

// Show stagger when selected keyframes span 2+ elements
const canStagger = computed(() => {
  if (ui.selectedKeyframeIds.size < 2) return false
  const elementIds = new Set<string>()
  for (const kf of editor.keyframes) {
    if (ui.selectedKeyframeIds.has(kf.id)) elementIds.add(kf.elementId)
    if (elementIds.size >= 2) return true
  }
  return false
})

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
  const startFrame = Math.round(timeline.currentFrame)
  const newKfIds: string[] = []
  for (const id of ui.selectedIds) {
    const el = editor.getElementById(id)
    if (!el) continue
    const newKfs = preset.apply(el, startFrame, durationFrames, easing.value)
    for (const kf of newKfs) {
      editor.addKeyframe(kf)
      newKfIds.push(kf.id)
    }
  }
  // Auto-select all newly created keyframes
  ui.selectKeyframes(newKfIds)
  history?.save()
}

// ── Stagger ───────────────────────────────────────────────────
const staggerMs = ref(50)

function applyStagger() {
  const selectedKfIds = ui.selectedKeyframeIds
  if (selectedKfIds.size === 0) return

  // Collect selected keyframes from the store
  const selectedKfs = editor.keyframes.filter(kf => selectedKfIds.has(kf.id))
  if (selectedKfs.length === 0) return

  // Group keyframes by elementId
  const byElement = new Map<string, typeof selectedKfs>()
  for (const kf of selectedKfs) {
    let arr = byElement.get(kf.elementId)
    if (!arr) { arr = []; byElement.set(kf.elementId, arr) }
    arr.push(kf)
  }

  // Order elements by ui.selectedIds (preserves user selection order),
  // falling back to the order keyframes appear for elements not in selectedIds
  const orderedElementIds: string[] = []
  for (const id of ui.selectedIds) {
    if (byElement.has(id)) orderedElementIds.push(id)
  }
  for (const id of byElement.keys()) {
    if (!orderedElementIds.includes(id)) orderedElementIds.push(id)
  }

  // Find the base frame (earliest frame across all selected keyframes)
  const baseFrame = Math.min(...selectedKfs.map(kf => kf.frame))
  const staggerF = Math.round((staggerMs.value / 1000) * timeline.fps)

  // For each element at index i, shift all its selected keyframes by i * staggerF
  orderedElementIds.forEach((elId, i) => {
    const kfs = byElement.get(elId)!
    const elMinFrame = Math.min(...kfs.map(kf => kf.frame))
    const offset = (i * staggerF) - (elMinFrame - baseFrame)
    if (offset === 0) return
    for (const kf of kfs) {
      editor.updateKeyframe(kf.id, { frame: kf.frame + offset })
    }
  })
  history?.save()
}
</script>

<template>
  <div class="section">
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

    <!-- ── Stagger (when keyframes from multiple elements are selected) ── -->
    <template v-if="canStagger">
      <div class="divider" />
      <div class="sub-label">Stagger</div>
      <div class="row">
        <span class="label">Delay</span>
        <input class="field" type="number" min="0" step="10" v-model.number="staggerMs" />
        <span class="unit">ms</span>
      </div>
      <button class="apply" @click="applyStagger">Apply Stagger</button>
    </template>

  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem 0.625rem; }
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
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.75rem; outline: none; min-width: 0;
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem; font-size: 0.75rem; outline: none;
}
.unit { font-size: 0.625rem; color: var(--text-4); min-width: 1.25rem; }

.divider { height: 1px; background: var(--border); margin: 0.5rem 0; }

.sub-label {
  font-size: 0.5625rem; font-weight: 700; color: var(--text-4);
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.25rem;
}

.apply {
  width: 100%; height: 1.75rem; background: var(--accent); color: #fff; border: none;
  border-radius: var(--r-sm); font-size: 0.75rem; font-weight: 600; cursor: pointer;
  margin-top: 0.25rem; transition: background var(--ease);
  &:hover { background: var(--accent-h); }
}
</style>
