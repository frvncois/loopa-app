<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { EasingType, Keyframe } from '@/types/animation'
import EasingCurveEditor from './EasingCurveEditor.vue'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

// The keyframe at or nearest to current frame for the selected element
const selectedKf = computed<Keyframe | null>(() => {
  const id = ui.selectedKeyframeId
  if (id) return editor.keyframes.find(kf => kf.id === id) ?? null
  // Fall back to keyframe at current frame for selected element
  if (ui.selectedIds.size !== 1) return null
  const elId = [...ui.selectedIds][0]
  return editor.keyframes.find(
    kf => kf.elementId === elId && kf.frame === Math.round(timeline.currentFrame)
  ) ?? null
})

const easingOptions: { value: EasingType; label: string }[] = [
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'ease-in-back', label: 'Ease In Back' },
  { value: 'ease-out-back', label: 'Ease Out Back' },
  { value: 'ease-out-bounce', label: 'Ease Out Bounce' },
  { value: 'ease-out-elastic', label: 'Ease Out Elastic' },
  { value: 'spring', label: 'Spring' },
]

const PROP_LABELS: Record<string, string> = {
  x: 'X', y: 'Y', width: 'W', height: 'H',
  opacity: 'Opacity', rotation: 'Rotation',
  scaleX: 'Scale X', scaleY: 'Scale Y',
  fillColor: 'Fill', strokeColor: 'Stroke',
}

function onEasingChange(val: string) {
  if (!selectedKf.value) return
  editor.updateKeyframe(selectedKf.value.id, { easing: val as EasingType })
}

function onPropChange(key: string, val: string) {
  if (!selectedKf.value) return
  const num = parseFloat(val)
  if (!isNaN(num)) {
    editor.updateKeyframe(selectedKf.value.id, {
      props: { ...selectedKf.value.props, [key]: num }
    })
  }
}
</script>

<template>
  <div v-if="selectedKf" class="section">
    <div class="title">Keyframe @ Frame {{ selectedKf.frame }}</div>

    <EasingCurveEditor :easing="selectedKf.easing" />

    <div class="row">
      <span class="label">Easing</span>
      <select class="select" :value="selectedKf.easing" @change="onEasingChange(($event.target as HTMLSelectElement).value)">
        <option v-for="opt in easingOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <!-- Recorded properties -->
    <div style="margin-top:0.625rem">
      <div class="subtitle">Recorded properties</div>
      <div
        v-for="(val, key) in selectedKf.props"
        :key="key"
        class="prop-row"
      >
        <label class="check">
          <input type="checkbox" checked disabled />
          {{ PROP_LABELS[key] ?? key }}
        </label>
        <input
          v-if="typeof val === 'number'"
          class="field is-narrow"
          type="number"
          :value="typeof val === 'number' ? Math.round(val * 100) / 100 : val"
          @change="onPropChange(key, ($event.target as HTMLInputElement).value)"
        />
        <span v-else class="prop-val">{{ val }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.subtitle { font-size: 0.625rem; font-weight: 600; color: var(--text-3); margin-bottom: 0.375rem; }
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.6875rem; outline: none; min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-narrow { width: 4.375rem; min-width: 4.375rem; flex: none; }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem; font-size: 0.6875rem; outline: none;
}
.prop-row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.25rem; min-height: 1.375rem; }
.check {
  display: flex; align-items: center; gap: 0.375rem; font-size: 0.6875rem; color: var(--text-2); flex: 1; height: 1.375rem;
  input { width: 0.875rem; height: 0.875rem; accent-color: var(--accent); }
}
.prop-val { font-size: 0.625rem; color: var(--text-4); font-style: italic; }
</style>
