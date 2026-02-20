<script setup lang="ts">
import { computed } from 'vue'
import { useOnionSkin } from '@/composables/useOnionSkin'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { AnimatableProps } from '@/types/animation'
import type { Element, PathElement, RectElement } from '@/types/elements'

const { onionFrames } = useOnionSkin()
const editor = useEditorStore()
const ui = useUiStore()

// Mirror scope logic from useOnionSkin so we render the same elements
const scopedElements = computed(() => {
  const { scope } = ui.onionSkin
  return scope === 'selected' && ui.selectedIds.size > 0
    ? editor.elements.filter(el => ui.selectedIds.has(el.id))
    : editor.elements
})

interface GhostShape {
  key: string
  type: string
  x: number
  y: number
  w: number
  h: number
  rx: number
  d: string
  hasFill: boolean
  color: string
}

interface GhostFrame {
  frame: number
  opacity: number
  shapes: GhostShape[]
}

const ghostFrames = computed((): GhostFrame[] => {
  return onionFrames.value.map(ghost => ({
    frame: ghost.frame,
    opacity: ghost.opacity,
    shapes: scopedElements.value.map((el: Element) => {
      const anim: AnimatableProps = ghost.states.get(el.id) ?? {}
      return {
        key: `${ghost.frame}-${el.id}`,
        type: el.type,
        x: anim.x ?? el.x,
        y: anim.y ?? el.y,
        w: anim.width ?? el.width,
        h: anim.height ?? el.height,
        rx: el.type === 'rect' ? (el as RectElement).rx : 0,
        d: el.type === 'path' ? (anim.d ?? (el as PathElement).d) : '',
        hasFill: el.fills.some(f => f.visible),
        color: '#' + ghost.tint,
      }
    })
  }))
})
</script>

<template>
  <g v-if="ghostFrames.length > 0" style="pointer-events:none">
    <g
      v-for="gf in ghostFrames"
      :key="gf.frame"
      :opacity="gf.opacity"
    >
      <template v-for="shape in gf.shapes" :key="shape.key">
        <!-- Rect -->
        <rect
          v-if="shape.type === 'rect'"
          :x="shape.x"
          :y="shape.y"
          :width="shape.w"
          :height="shape.h"
          :rx="shape.rx"
          :fill="shape.color"
          fill-opacity="0.35"
          :stroke="shape.color"
          stroke-width="1.5"
        />
        <!-- Circle / Ellipse -->
        <ellipse
          v-else-if="shape.type === 'circle' || shape.type === 'ellipse'"
          :cx="shape.x + shape.w / 2"
          :cy="shape.y + shape.h / 2"
          :rx="shape.w / 2"
          :ry="shape.h / 2"
          :fill="shape.color"
          fill-opacity="0.35"
          :stroke="shape.color"
          stroke-width="1.5"
        />
        <!-- Path -->
        <path
          v-else-if="shape.type === 'path' && shape.d"
          :d="shape.d"
          :fill="shape.hasFill ? shape.color : 'none'"
          fill-opacity="0.35"
          :stroke="shape.color"
          stroke-width="1.5"
        />
        <!-- Line, Text, Polygon, Star: dashed bbox -->
        <rect
          v-else
          :x="shape.x"
          :y="shape.y"
          :width="Math.max(shape.w, 1)"
          :height="Math.max(shape.h, 1)"
          fill="none"
          :stroke="shape.color"
          stroke-width="1.5"
          stroke-dasharray="4 2"
        />
      </template>
    </g>
  </g>
</template>
