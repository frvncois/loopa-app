<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalFrames: number
  pixelsPerFrame: number
  rulerOffset: number
}>()

const emit = defineEmits<{ seek: [frame: number] }>()

function onRulerClick(e: MouseEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const frame = Math.round((x - props.rulerOffset) / props.pixelsPerFrame)
  emit('seek', frame)
}

function getRulerMarks(totalFrames: number, ppf: number, offset: number) {
  const marks: { frame: number; x: number; major: boolean }[] = []
  const step = ppf < 6 ? 10 : 5
  for (let f = 0; f <= totalFrames; f++) {
    marks.push({ frame: f, x: offset + f * ppf, major: f % step === 0 })
  }
  return marks
}

const width = computed(() => props.rulerOffset + props.totalFrames * props.pixelsPerFrame + 40)
const marks = computed(() => getRulerMarks(props.totalFrames, props.pixelsPerFrame, props.rulerOffset))
</script>

<template>
  <svg
    class="ruler"
    :width="width"
    height="22"
    @click="onRulerClick"
  >
    <rect x="0" y="0" width="100%" height="22" fill="var(--bg-3)"/>
    <line x1="0" y1="21" x2="100%" y2="21" stroke="var(--border)" stroke-width="1"/>

    <g v-for="m in marks" :key="m.frame">
      <template v-if="m.major">
        <text
          :x="m.x" y="12"
          fill="var(--text-4)"
          font-size="8"
          font-family="var(--mono)"
          text-anchor="middle"
        >{{ m.frame }}</text>
        <line :x1="m.x" y1="14" :x2="m.x" y2="22" stroke="var(--border-l)" stroke-width="1"/>
      </template>
      <template v-else>
        <line :x1="m.x" y1="18" :x2="m.x" y2="22" stroke="var(--border)" stroke-width="0.5"/>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.ruler {
  height: 1.375rem;
  min-height: 1.375rem;
  width: 100%;
  background: var(--bg-3);
  border-bottom: 1px solid var(--border);
  display: block;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
