<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const kfs = computed(() =>
  el.value ? editor.keyframes.filter(kf => kf.elementId === el.value!.id) : []
)

const firstFrame = computed(() =>
  kfs.value.length > 0 ? Math.min(...kfs.value.map(k => k.frame)) : 0
)
const lastFrame = computed(() =>
  kfs.value.length > 0 ? Math.max(...kfs.value.map(k => k.frame)) : timeline.totalFrames
)
</script>

<template>
  <div v-if="el && kfs.length > 0" class="section">
    <div class="title">Element Timing</div>
    <div class="stat-row">
      <span>Start frame</span>
      <span class="value">{{ firstFrame }}</span>
    </div>
    <div class="stat-row">
      <span>End frame</span>
      <span class="value">{{ lastFrame }}</span>
    </div>
    <div class="stat-row">
      <span>Duration</span>
      <span class="value">{{ ((lastFrame - firstFrame) / timeline.fps).toFixed(2) }}s</span>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.375rem; }
.stat-row { display: flex; justify-content: space-between; font-size: 0.75rem; padding: 0.1875rem 0; color: var(--text-3); }
.value { color: var(--text-2); font-family: var(--mono); font-size: 0.75rem; }
</style>
