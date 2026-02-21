<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'

const editor = useEditorStore()
const ui = useUiStore()

// Injected from ProjectView — falls back to base element if not provided
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
  const id = [...ui.selectedIds][0]
  return getAnimatedEl(id) ?? null
})

function update(key: string, val: string) {
  const id = [...ui.selectedIds][0]
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp(id, { [key as keyof AnimatableProps]: num } as Partial<AnimatableProps>)
}

// Transform origin helpers
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

function setOriginPreset(px: number, py: number) {
  const id = [...ui.selectedIds][0]
  setAnimatedProp(id, { transformOriginX: px, transformOriginY: py })
}

function updateOriginX(val: string) {
  const id = [...ui.selectedIds][0]
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp(id, { transformOriginX: num / 100 })
}

function updateOriginY(val: string) {
  const id = [...ui.selectedIds][0]
  const num = parseFloat(val)
  if (!isNaN(num)) setAnimatedProp(id, { transformOriginY: num / 100 })
}

function isPresetActive(px: number, py: number): boolean {
  return Math.abs(ox.value - px) < 0.01 && Math.abs(oy.value - py) < 0.01
}
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">Layout</div>

    <div class="row">
      <span class="label">Position</span>
      <input class="field is-pair" type="number" :value="Math.round(el.x)" @change="update('x', ($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="Math.round(el.y)" @change="update('y', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Size</span>
      <input class="field is-pair" type="number" :value="Math.round(el.width)" @change="update('width', ($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="Math.round(el.height)" @change="update('height', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="row">
      <span class="label">Angle</span>
      <input class="field is-pair" type="number" :value="Math.round(el.rotation)" @change="update('rotation', ($event.target as HTMLInputElement).value)" />
    </div>
    <div v-if="el.type === 'rect'" class="row">
      <span class="label">Corner radius</span>
      <input class="field is-pair" type="number" :value="(el as any).rx ?? 0" @change="e => { update('rx', (e.target as HTMLInputElement).value); update('ry', (e.target as HTMLInputElement).value) }" />
    </div>

    <!-- Transform origin row -->
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
      <input
        class="field is-pair"
        type="number"
        :value="Math.round(ox * 100)"
        @change="updateOriginX(($event.target as HTMLInputElement).value)"
      />
      <input
        class="field is-pair"
        type="number"
        :value="Math.round(oy * 100)"
        @change="updateOriginY(($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  min-height: 1.625rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; white-space: nowrap; }
.field {
  flex: 1;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-1);
  padding: 0 0.4375rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  outline: none;
  transition: border-color var(--ease);
  min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}

/* 3×3 origin grid */
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
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--bg-5);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background var(--ease);

  &:hover { background: var(--text-3); }
  &.is-active { background: var(--accent); }
}
</style>
