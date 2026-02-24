<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { pathPointsBounds } from '@/lib/path/motionPathMath'
import type { useMotionPathTool } from '@/composables/useMotionPathTool'
import type { useHistory } from '@/composables/useHistory'
import type { EasingType } from '@/types/animation'
import type { MotionPath } from '@/types/motionPath'
import EasingCurveEditor from './EasingCurveEditor.vue'

const editor    = useEditorStore()
const ui        = useUiStore()
const timeline  = useTimelineStore()
const motionPathTool = inject<ReturnType<typeof useMotionPathTool> | null>('motionPathTool', null)
const history   = inject<ReturnType<typeof useHistory>>('history')!

// ── Selection ─────────────────────────────────────────────────
const selectedId = computed(() =>
  ui.selectedIds.size === 1 ? [...ui.selectedIds][0] : null
)
const selectedEl = computed(() =>
  selectedId.value ? editor.getElementById(selectedId.value) ?? null : null
)
const currentFrame = computed(() => Math.round(timeline.currentFrame))

// ── Keyframe state ────────────────────────────────────────────
const keyframeAtFrame = computed(() => {
  if (!selectedEl.value) return null
  return editor.keyframes.find(
    kf => kf.elementId === selectedEl.value!.id && kf.frame === currentFrame.value
  ) ?? null
})

const hasAnyKeyframes = computed(() =>
  !!selectedEl.value && editor.keyframes.some(kf => kf.elementId === selectedEl.value!.id)
)

const animatedPropNames = computed(() => {
  if (!selectedEl.value) return []
  const seen = new Set<string>()
  for (const kf of editor.keyframes.filter(k => k.elementId === selectedEl.value!.id)) {
    for (const k of Object.keys(kf.props)) seen.add(k)
  }
  const labels: Record<string, string> = {
    x: 'X', y: 'Y', width: 'W', height: 'H', opacity: 'Opacity',
    rotation: 'Angle', scaleX: 'Scale X', scaleY: 'Scale Y',
    fillColor: 'Fill', strokeColor: 'Stroke', blur: 'Blur',
    fontSize: 'Font Size', rotateX: 'Rot X', rotateY: 'Rot Y',
  }
  return [...seen].map(k => labels[k] ?? k)
})

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'ease-out',          label: 'Ease Out' },
  { value: 'linear',            label: 'Linear' },
  { value: 'ease-in',           label: 'Ease In' },
  { value: 'ease-in-out',       label: 'Ease In Out' },
  { value: 'ease-in-back',      label: 'Ease In Back' },
  { value: 'ease-out-back',     label: 'Ease Out Back' },
  { value: 'ease-out-bounce',   label: 'Ease Out Bounce' },
  { value: 'ease-out-elastic',  label: 'Ease Out Elastic' },
  { value: 'spring',            label: 'Spring' },
]

function onEasingChange(e: Event) {
  if (!keyframeAtFrame.value) return
  editor.updateKeyframe(keyframeAtFrame.value.id, {
    easing: (e.target as HTMLSelectElement).value as EasingType
  })
}

// ── Motion Path ───────────────────────────────────────────────
const motionPath = computed((): MotionPath | null =>
  selectedId.value ? editor.getMotionPathForElement(selectedId.value) : null
)

const pathViewBox = computed(() => {
  if (!motionPath.value || motionPath.value.points.length === 0) return '0 0 100 50'
  const b = pathPointsBounds(motionPath.value.points)
  const pad = 8
  return `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
})
const firstPoint = computed(() => motionPath.value?.points[0] ?? { x: 0, y: 0 })
const lastPoint  = computed(() => {
  const pts = motionPath.value?.points ?? []
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
})

function startDraw() {
  motionPathTool?.startDrawing()
}
function redraw() {
  if (motionPath.value) { editor.deleteMotionPath(motionPath.value.id); history.save() }
  motionPathTool?.startDrawing()
}
function deletePath() {
  if (motionPath.value) { editor.deleteMotionPath(motionPath.value.id); history.save() }
}
function onTimingChange(field: 'startFrame' | 'endFrame', e: Event) {
  if (!motionPath.value) return
  const val = parseInt((e.target as HTMLInputElement).value)
  editor.updateMotionPath(motionPath.value.id, { [field]: val })
  history.saveDebounced()
}
function onMpField(field: keyof MotionPath, value: unknown) {
  if (!motionPath.value) return
  editor.updateMotionPath(motionPath.value.id, { [field]: value } as Partial<MotionPath>)
  history.save()
}
</script>

<template>
  <div v-if="selectedEl" class="section">

    <!-- ── Keyframe ── -->
    <div class="sub-label">Keyframe</div>

    <div class="badge-row">
      <span v-if="keyframeAtFrame" class="badge is-accent">◆ Frame {{ currentFrame }}</span>
      <span v-else-if="hasAnyKeyframes" class="badge">◇ Interpolated</span>
      <span v-else class="badge">No keyframes</span>
    </div>

    <template v-if="keyframeAtFrame">
      <EasingCurveEditor :easing="keyframeAtFrame.easing" />
      <div class="row">
        <span class="label">Easing</span>
        <select class="select" :value="keyframeAtFrame.easing" @change="onEasingChange">
          <option v-for="opt in EASING_OPTIONS" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </template>

    <div v-if="animatedPropNames.length" class="hint" style="margin-top:0.25rem">
      {{ animatedPropNames.slice(0, 5).join(' · ') }}{{ animatedPropNames.length > 5 ? ` +${animatedPropNames.length - 5}` : '' }}
    </div>

    <div class="divider" />

    <!-- ── Motion Path ── -->
    <div class="sub-label">Motion Path</div>

    <template v-if="!motionPath">
      <p class="hint" style="margin-bottom:0.5rem">Draw a path for this element to follow.</p>
      <button class="draw-btn is-full" :disabled="!motionPathTool" @click="startDraw()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        </svg>
        Draw Path
      </button>
    </template>

    <template v-else>
      <div class="mp-preview">
        <svg :viewBox="pathViewBox" preserveAspectRatio="xMidYMid meet">
          <path :d="motionPath.d" fill="none" stroke="var(--accent)" stroke-width="2" />
          <circle :cx="firstPoint.x" :cy="firstPoint.y" r="3" fill="var(--green, #22c55e)" />
          <circle :cx="lastPoint.x"  :cy="lastPoint.y"  r="3" fill="var(--red, #ef4444)" />
        </svg>
      </div>

      <div class="row">
        <span class="label">Start</span>
        <input class="field is-narrow" type="number" :value="motionPath.startFrame"
          :min="0" :max="motionPath.endFrame - 1"
          @change="onTimingChange('startFrame', $event)" />
        <span class="label" style="width:auto;min-width:0;padding-left:0.125rem">End</span>
        <input class="field is-narrow" type="number" :value="motionPath.endFrame"
          :min="motionPath.startFrame + 1" :max="timeline.totalFrames"
          @change="onTimingChange('endFrame', $event)" />
      </div>

      <div class="row">
        <span class="label">Easing</span>
        <select class="select" :value="motionPath.easing"
          @change="(e) => onMpField('easing', (e.target as HTMLSelectElement).value)">
          <option v-for="opt in EASING_OPTIONS.slice(0, 4)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div class="row">
        <span class="label">Orient</span>
        <label class="check">
          <input type="checkbox" :checked="motionPath.orientToPath"
            @change="(e) => onMpField('orientToPath', (e.target as HTMLInputElement).checked)" />
          <span class="check-label">Face direction</span>
        </label>
      </div>

      <div class="row">
        <span class="label">Loop</span>
        <label class="check">
          <input type="checkbox" :checked="motionPath.loop"
            @change="(e) => onMpField('loop', (e.target as HTMLInputElement).checked)" />
          <span class="check-label">Repeat</span>
        </label>
      </div>

      <div class="btn-row" style="margin-top:0.5rem">
        <button class="action-btn" @click="redraw">Redraw</button>
        <button class="action-btn is-danger" @click="deletePath">Remove</button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem 0.625rem; }

.sub-label {
  font-size: 0.5625rem; font-weight: 700; color: var(--text-4);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin-bottom: 0.25rem; padding-top: 0.125rem;
}

.divider { height: 1px; background: var(--border); margin: 0.5rem 0; }

.row {
  display: flex; align-items: center; gap: 0.375rem;
  margin-bottom: 0.25rem; min-height: 1.625rem;
}

.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }

.badge-row { margin-bottom: 0.375rem; }

.badge {
  display: inline-block;
  font-size: 0.5625rem; padding: 0.125rem 0.375rem; border-radius: 0.1875rem;
  background: var(--bg-4); color: var(--text-4);
  &.is-accent { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
}

.hint { font-size: 0.5625rem; color: var(--text-4); line-height: 1.4; }

.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.75rem; outline: none; min-width: 0;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &.is-narrow { width: 4rem; min-width: 4rem; flex: none; }
}

.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 1.25rem 0 0.375rem;
  font-size: 0.6875rem; outline: none; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.375rem center; min-width: 0;
}

.check { display: flex; align-items: center; gap: 0.375rem; cursor: pointer; }
.check-label { font-size: 0.6875rem; color: var(--text-2); }

.mp-preview {
  width: 100%; height: 3.75rem;
  background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-md); overflow: hidden;
  margin-bottom: 0.5rem; padding: 0.25rem;
  svg { width: 100%; height: 100%; }
}

.btn-row { display: flex; gap: 0.375rem; }

.draw-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 0.3rem; padding: 0.4rem 0;
  background: var(--bg-4); border: 1px dashed var(--border);
  border-radius: var(--r-md); color: var(--text-2); font-size: 0.625rem;
  cursor: pointer; transition: all var(--ease);
  &.is-full { width: 100%; }
  &:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); border-style: solid; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.action-btn {
  flex: 1; height: 1.625rem; padding: 0 0.5rem;
  background: var(--bg-4); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-2); font-size: 0.625rem;
  cursor: pointer; transition: all var(--ease);
  &:hover { border-color: var(--accent); color: var(--text-1); }
  &.is-danger:hover { border-color: #ef4444; color: #ef4444; }
}
</style>
