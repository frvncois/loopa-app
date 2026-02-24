<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'

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

const ox = computed(() => {
  if (!el.value) return 0.5
  return (el.value as any).transformOriginX ?? (el.value as any).transformOrigin?.x ?? 0.5
})
const oy = computed(() => {
  if (!el.value) return 0.5
  return (el.value as any).transformOriginY ?? (el.value as any).transformOrigin?.y ?? 0.5
})

const originPresets = [
  { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 },
  { x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 },
  { x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 },
]

function isPresetActive(px: number, py: number): boolean {
  return Math.abs(ox.value - px) < 0.01 && Math.abs(oy.value - py) < 0.01
}

function update(key: keyof AnimatableProps, val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { [key]: num })
}

function setOriginPreset(px: number, py: number) {
  setAnimatedProp([...ui.selectedIds][0], { transformOriginX: px, transformOriginY: py })
}

function updateOriginX(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { transformOriginX: num / 100 })
}

function updateOriginY(val: string) {
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { transformOriginY: num / 100 })
}

function toggleFlipX() {
  if (!el.value) return
  editor.updateElement(el.value.id, { flipX: !(el.value as any).flipX } as any)
}

function toggleFlipY() {
  if (!el.value) return
  editor.updateElement(el.value.id, { flipY: !(el.value as any).flipY } as any)
}

// ── 3D ────────────────────────────────────────────────────────
const rotateX   = computed(() => (el.value as any)?.rotateX   ?? 0)
const rotateY   = computed(() => (el.value as any)?.rotateY   ?? 0)
const depth     = computed(() => (el.value as any)?.perspective ?? 800)
const has3d     = computed(() => rotateX.value !== 0 || rotateY.value !== 0)

function update3d(key: 'rotateX' | 'rotateY' | 'perspective', e: Event) {
  const num = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(num)) setAnimatedProp([...ui.selectedIds][0], { [key]: num })
}
function reset3d() {
  setAnimatedProp([...ui.selectedIds][0], { rotateX: 0, rotateY: 0, perspective: 800 })
}
</script>

<template>
  <div v-if="el" class="section">
    <!-- Size -->
    <div class="row">
      <span class="label">W</span>
      <input class="field" type="number" :value="Math.round(el.width)" min="1"
        @change="update('width', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">H</span>
      <input class="field" type="number" :value="Math.round(el.height)" min="1"
        @change="update('height', ($event.target as HTMLInputElement).value)" />
    </div>

    <!-- Angle -->
    <div class="row">
      <span class="label">Angle</span>
      <input class="field" type="number" :value="Math.round((el as any).rotation ?? 0)"
        @change="update('rotation', ($event.target as HTMLInputElement).value)" />
      <span class="unit">°</span>
    </div>

    <!-- Scale -->
    <div class="row">
      <span class="label">Scale X</span>
      <input class="field" type="number" :value="(el as any).scaleX ?? 1" step="0.1"
        @change="update('scaleX', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Scale Y</span>
      <input class="field" type="number" :value="(el as any).scaleY ?? 1" step="0.1"
        @change="update('scaleY', ($event.target as HTMLInputElement).value)" />
    </div>

    <!-- Flip -->
    <div class="row">
      <span class="label">Flip</span>
      <div class="flip-btns">
        <button class="flip-btn" :class="{ 'is-active': (el as any).flipX }" @click="toggleFlipX" title="Flip Horizontal">↔</button>
        <button class="flip-btn" :class="{ 'is-active': (el as any).flipY }" @click="toggleFlipY" title="Flip Vertical">↕</button>
      </div>
    </div>

    <!-- Transform Origin -->
    <div class="row">
      <span class="label">Origin</span>
      <div class="origin-grid">
        <button
          v-for="(p, i) in originPresets"
          :key="i"
          class="origin-dot"
          :class="{ 'is-active': isPresetActive(p.x, p.y) }"
          @click="setOriginPreset(p.x, p.y)"
        />
      </div>
      <input class="field is-tiny" type="number" :value="Math.round(ox * 100)"
        @change="updateOriginX(($event.target as HTMLInputElement).value)" />
      <input class="field is-tiny" type="number" :value="Math.round(oy * 100)"
        @change="updateOriginY(($event.target as HTMLInputElement).value)" />
    </div>

    <!-- ── 3D ── -->
    <div class="divider3d" />
    <div class="sub-label3d">3D Perspective</div>

    <div class="preview3d">
      <div
        class="preview-card"
        :style="{ transform: `perspective(${depth}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }"
      />
    </div>

    <div class="row">
      <span class="label">Rotate X</span>
      <div class="slider-grp">
        <input type="range" class="slider" :value="rotateX" min="-90" max="90" step="1" @input="update3d('rotateX', $event)" />
        <input class="field is-narrow" type="number" :value="rotateX" min="-90" max="90" @change="update3d('rotateX', $event)" />
        <span class="unit">°</span>
      </div>
    </div>
    <div class="row">
      <span class="label">Rotate Y</span>
      <div class="slider-grp">
        <input type="range" class="slider" :value="rotateY" min="-90" max="90" step="1" @input="update3d('rotateY', $event)" />
        <input class="field is-narrow" type="number" :value="rotateY" min="-90" max="90" @change="update3d('rotateY', $event)" />
        <span class="unit">°</span>
      </div>
    </div>
    <div class="row">
      <span class="label">Depth</span>
      <div class="slider-grp">
        <input type="range" class="slider" :value="depth" min="100" max="2000" step="50" @input="update3d('perspective', $event)" />
        <input class="field is-narrow" type="number" :value="depth" min="100" max="2000" @change="update3d('perspective', $event)" />
        <span class="unit">px</span>
      </div>
    </div>
    <button v-if="has3d" class="reset-btn" @click="reset3d">Reset 3D</button>

  </div>
</template>

<style scoped>
.section { padding: 0.375rem 0.75rem 0.625rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-tiny { width: 3rem; min-width: 3rem; flex: none; }
}
.unit { font-size: 0.625rem; color: var(--text-4); min-width: 0.75rem; flex-shrink: 0; }

.flip-btns { display: flex; gap: 0.25rem; }
.flip-btn {
  width: 2rem; height: 1.625rem;
  border: 1px solid var(--border); border-radius: var(--r-sm);
  background: var(--bg-3); color: var(--text-3);
  font-size: 0.875rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--ease);
  &:hover { background: var(--bg-5); color: var(--text-1); }
  &.is-active { background: var(--accent-s); border-color: var(--accent); color: var(--accent); }
}

.origin-grid {
  display: grid;
  grid-template-columns: repeat(3, 0.5rem);
  grid-template-rows: repeat(3, 0.5rem);
  gap: 0.25rem;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-items: center;
  flex-shrink: 0;
}
.origin-dot {
  width: 0.375rem; height: 0.375rem;
  border-radius: 50%; background: var(--bg-5);
  border: none; cursor: pointer; padding: 0;
  transition: background var(--ease);
  &:hover { background: var(--text-3); }
  &.is-active { background: var(--accent); }
}

/* 3D section */
.divider3d { height: 1px; background: var(--border); margin: 0.5rem 0; }

.sub-label3d {
  font-size: 0.5625rem; font-weight: 700; color: var(--text-4);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin-bottom: 0.375rem;
}

.preview3d {
  width: 100%; height: 4.5rem;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-3); border-radius: var(--r-md);
  margin-bottom: 0.5rem; perspective: 400px;
}
.preview-card {
  width: 3.5rem; height: 2.25rem;
  background: var(--accent); border-radius: var(--r-sm);
  opacity: 0.7; transition: transform 150ms var(--ease);
}

.slider-grp { display: flex; align-items: center; gap: 0.375rem; flex: 1; }

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

.reset-btn {
  width: 100%; padding: 0.3125rem; margin-top: 0.375rem;
  background: var(--bg-4); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-3); font-size: 0.625rem;
  cursor: pointer; transition: all var(--ease);
  &:hover { border-color: var(--accent); color: var(--text-1); }
}
</style>
