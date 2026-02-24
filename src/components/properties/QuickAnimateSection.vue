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

const isMulti = computed(() => ui.selectedIds.size > 1)

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
  for (const id of ui.selectedIds) {
    const el = editor.getElementById(id)
    if (!el) continue
    const newKfs = preset.apply(el, startFrame, durationFrames, easing.value)
    for (const kf of newKfs) editor.addKeyframe(kf)
  }
  history?.save()
}

// ── Stagger ───────────────────────────────────────────────────
const staggerMs     = ref(50)
const staggerPreset = ref(ANIMATION_PRESETS[0]?.id ?? 'fade-in')
const staggerFrames = ref(12)

function applyStagger() {
  const p = ANIMATION_PRESETS.find(p => p.id === staggerPreset.value)
  if (!p) return
  const ids = [...ui.selectedIds]
  const staggerF = Math.round((staggerMs.value / 1000) * timeline.fps)
  ids.forEach((id, i) => {
    const el = editor.getElementById(id)
    if (!el) return
    const startFrame = Math.round(timeline.currentFrame) + i * staggerF
    const newKfs = p.apply(el, startFrame, staggerFrames.value, easing.value)
    for (const kf of newKfs) editor.addKeyframe(kf)
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

    <!-- ── Stagger (multi-select only) ── -->
    <template v-if="isMulti">
      <div class="divider" />
      <div class="sub-label">Stagger</div>
      <div class="row">
        <span class="label">Delay</span>
        <input class="field" type="number" min="0" step="10" v-model.number="staggerMs" />
        <span class="unit">ms</span>
      </div>
      <div class="row">
        <span class="label">Preset</span>
        <select class="select" v-model="staggerPreset">
          <option v-for="p in ANIMATION_PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>
      <div class="row">
        <span class="label">Duration</span>
        <input class="field" type="number" min="1" v-model.number="staggerFrames" />
        <span class="unit">fr</span>
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
