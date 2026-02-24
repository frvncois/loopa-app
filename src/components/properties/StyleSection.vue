<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import ColorInput from '@/components/ui/ColorInput.vue'

const editor = useEditorStore()
const ui = useUiStore()

const getAnimatedEl = inject<(id: string) => Element | null>(
  'getAnimatedElement',
  (id) => editor.getElementById(id) ?? null
)
const setAnimatedProp = inject<(id: string, props: Partial<AnimatableProps>) => void>(
  'setAnimatedProperty',
  (id, props) => editor.updateElement(id, props)
)

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return getAnimatedEl([...ui.selectedIds][0]) ?? null
})
const id = computed(() => el.value ? [...ui.selectedIds][0] : null)

// Derived element properties
const fill   = computed(() => el.value?.fills[0] ?? null)
const stroke = computed(() => el.value?.strokes[0] ?? null)
const shadow = computed(() => el.value?.shadows[0] ?? null)

const isLine  = computed(() => el.value?.type === 'line')
const isGroup = computed(() => el.value?.type === 'group')
const isVideo = computed(() => el.value?.type === 'video')
const isImage = computed(() => el.value?.type === 'image')

const showFill   = computed(() => !isLine.value && !isGroup.value && !isVideo.value && !isImage.value)
const showBorder = computed(() => !isGroup.value && !isVideo.value && !isImage.value)
const showStyle  = computed(() => !isVideo.value && !isImage.value)

const blendModes = [
  { value: 'normal',      label: 'Normal' },
  { value: 'multiply',    label: 'Multiply' },
  { value: 'screen',      label: 'Screen' },
  { value: 'overlay',     label: 'Overlay' },
  { value: 'darken',      label: 'Darken' },
  { value: 'lighten',     label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn',  label: 'Color Burn' },
  { value: 'hard-light',  label: 'Hard Light' },
  { value: 'soft-light',  label: 'Soft Light' },
  { value: 'difference',  label: 'Difference' },
  { value: 'exclusion',   label: 'Exclusion' },
]

// ── Fill ──────────────────────────────────────────────────────
function updateFillColor(color: string) {
  if (!id.value) return
  setAnimatedProp(id.value, { fillColor: color })
}

// ── Border ────────────────────────────────────────────────────
function updateStrokeColor(color: string) {
  if (!id.value) return
  setAnimatedProp(id.value, { strokeColor: color })
}
function updateStrokeWidth(e: Event) {
  const num = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(num) && id.value) setAnimatedProp(id.value, { strokeWidth: num })
}
function updateStrokePosition(e: Event) {
  if (!el.value) return
  const strokes = [...el.value.strokes]
  strokes[0] = { ...strokes[0], position: (e.target as HTMLSelectElement).value as any, visible: true }
  editor.updateElement(el.value.id, { strokes })
}
function updateRx(e: Event) {
  const num = parseFloat((e.target as HTMLInputElement).value) || 0
  if (id.value) setAnimatedProp(id.value, { rx: num } as any)
}

// ── Shadow ────────────────────────────────────────────────────
function updateShadowX(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { shadowOffsetX: n })
}
function updateShadowY(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { shadowOffsetY: n })
}
function updateShadowBlur(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { shadowBlur: n })
}
function updateShadowOpacity(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { shadowOpacity: n / 100 })
}
function updateShadowColor(color: string) {
  if (id.value) setAnimatedProp(id.value, { shadowColor: color })
}

// ── Blur ──────────────────────────────────────────────────────
function updateBlur(e: Event) {
  const n = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { blur: n })
}

// ── Opacity + Blend ───────────────────────────────────────────
function updateOpacity(e: Event) {
  const n = Math.min(100, Math.max(0, parseFloat((e.target as HTMLInputElement).value)))
  if (!isNaN(n) && id.value) setAnimatedProp(id.value, { opacity: n / 100 })
}
function updateBlendMode(e: Event) {
  if (!el.value) return
  editor.updateElement(el.value.id, { blendMode: (e.target as HTMLSelectElement).value as any })
}
</script>

<template>
  <div v-if="el" class="section">

    <!-- ── Fill ── -->
    <template v-if="showFill && fill">
      <div class="sub-label">Fill</div>
      <div class="row">
        <span class="label">Color</span>
        <ColorInput :model-value="fill.color" @update:model-value="updateFillColor" />
      </div>
      <div class="divider" v-if="showBorder || showStyle" />
    </template>

    <!-- ── Border ── -->
    <template v-if="showBorder && stroke">
      <div class="sub-label">Border</div>
      <div v-if="el.type === 'rect'" class="row">
        <span class="label">Radius</span>
        <input class="field" type="number" :value="(el as any).rx ?? 0" min="0" @change="updateRx" />
      </div>
      <div class="row">
        <span class="label">Color</span>
        <ColorInput :model-value="stroke.color" @update:model-value="updateStrokeColor" />
      </div>
      <div class="row">
        <span class="label">Width</span>
        <input class="field" type="number" :value="stroke.width" min="0" @change="updateStrokeWidth" />
      </div>
      <div class="row">
        <span class="label">Position</span>
        <select class="select" :value="stroke.position" @change="updateStrokePosition">
          <option value="center">Center</option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
        </select>
      </div>
      <div class="divider" v-if="showStyle" />
    </template>

    <!-- ── Shadow ── -->
    <template v-if="showStyle && shadow">
      <div class="sub-label">Shadow</div>
      <div class="row">
        <span class="label">Offset</span>
        <input class="field is-pair" type="number" :value="shadow.x" @change="updateShadowX" />
        <input class="field is-pair" type="number" :value="shadow.y" @change="updateShadowY" />
      </div>
      <div class="row">
        <span class="label">Blur</span>
        <input class="field is-pair" type="number" :value="shadow.blur" min="0" @change="updateShadowBlur" />
        <span class="label" style="width:auto;min-width:0">Opacity</span>
        <input class="field is-pair" type="number" :value="Math.round(shadow.opacity * 100)" min="0" max="100" @change="updateShadowOpacity" />
      </div>
      <div class="row">
        <span class="label">Color</span>
        <ColorInput :model-value="shadow.color" @update:model-value="updateShadowColor" />
      </div>
      <div class="divider" />
    </template>

    <!-- ── Blur ── -->
    <template v-if="showStyle">
      <div class="sub-label">Blur</div>
      <div class="row" style="margin-bottom:0.5rem">
        <span class="label">Amount</span>
        <input type="range" class="slider" :value="el.blur" min="0" max="50" step="0.5" @input="updateBlur" />
        <input class="field is-narrow" type="number" :value="el.blur" min="0" @change="updateBlur" />
        <span class="unit">px</span>
      </div>
      <div class="divider" />
    </template>

    <!-- ── Opacity + Blend ── -->
    <div class="sub-label">Opacity</div>
    <div class="row" style="margin-bottom:0.25rem">
      <span class="label">Value</span>
      <input type="range" class="slider" :value="Math.round((el.opacity ?? 1) * 100)" min="0" max="100" step="1" @input="updateOpacity" />
      <input class="field is-narrow" type="number" :value="Math.round((el.opacity ?? 1) * 100)" min="0" max="100" @change="updateOpacity" />
      <span class="unit">%</span>
    </div>
    <div class="row">
      <span class="label">Blend</span>
      <select class="select" :value="el.blendMode ?? 'normal'" @change="updateBlendMode">
        <option v-for="m in blendModes" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

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
  &:last-child { margin-bottom: 0; }
}

.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }

.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.75rem; outline: none; min-width: 0;
  transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &.is-narrow { width: 4.375rem; min-width: 4.375rem; flex: none; }
  &.is-pair   { width: 4.75rem;  min-width: 4.75rem;  flex: none; }
}

.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 1.25rem 0 0.375rem;
  font-size: 0.6875rem; outline: none; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236a6a7e' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.375rem center; min-width: 0;
}

.unit { font-size: 0.5625rem; color: var(--text-4); width: 1.25rem; flex-shrink: 0; }

.slider {
  flex: 1; height: 0.25rem; -webkit-appearance: none; appearance: none;
  background: var(--bg-5); border-radius: 0.125rem; outline: none; cursor: pointer;
  &::-webkit-slider-thumb {
    -webkit-appearance: none; width: 0.75rem; height: 0.75rem;
    border-radius: 50%; background: var(--accent); cursor: grab;
  }
  &::-moz-range-thumb {
    width: 0.75rem; height: 0.75rem; border-radius: 50%;
    background: var(--accent); border: none; cursor: grab;
  }
}
</style>
