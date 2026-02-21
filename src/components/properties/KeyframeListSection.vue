<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { Keyframe } from '@/types/animation'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

const elementKfs = computed<Keyframe[]>(() => {
  if (ui.selectedIds.size !== 1) return []
  const elId = [...ui.selectedIds][0]
  return editor.keyframes
    .filter(kf => kf.elementId === elId)
    .sort((a, b) => a.frame - b.frame)
})

function selectKf(kf: Keyframe, e: MouseEvent) {
  ui.selectKeyframe(kf.id, e.shiftKey)
  timeline.seek(kf.frame)
}

function deleteKf(kf: Keyframe, e: MouseEvent) {
  e.stopPropagation()
  editor.deleteKeyframe(kf.id)
  if (ui.selectedKeyframeIds.has(kf.id)) ui.selectKeyframe(null)
}
</script>

<template>
  <div v-if="elementKfs.length > 0" class="section">
    <div class="title">Keyframes</div>
    <div
      v-for="kf in elementKfs"
      :key="kf.id"
      class="item"
      :class="{ 'is-selected': ui.selectedKeyframeIds.has(kf.id) }"
      @click="selectKf(kf, $event)"
    >
      <div class="diamond" />
      <span class="frame">Frame {{ kf.frame }}</span>
      <span class="ease">{{ kf.easing }}</span>
      <button class="delete" title="Delete" @click="deleteKf(kf, $event)">×</button>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.375rem; }
.item {
  display: flex; align-items: center; gap: 0.5rem; height: 1.75rem;
  padding: 0 0.375rem; border-radius: var(--r-sm); cursor: pointer;
  transition: background var(--ease); font-size: 0.75rem;
  &:hover { background: var(--bg-4); }
  &.is-selected {
    background: var(--accent-s); color: var(--accent);
    .diamond { background: var(--yellow); }
    .frame { color: var(--accent); }
  }
  &:hover .delete { opacity: 1; }
}
.diamond {
  width: 0.5rem; height: 0.5rem; background: var(--accent);
  transform: rotate(45deg); border-radius: 1px; flex-shrink: 0;
}
.frame { font-family: var(--mono); font-size: 0.625rem; color: var(--text-3); }
.ease { flex: 1; text-align: right; font-size: 0.625rem; color: var(--text-4); }
.delete {
  width: 1rem; height: 1rem; display: flex; align-items: center; justify-content: center;
  border: none; background: none; color: var(--text-4); cursor: pointer;
  border-radius: var(--r-sm); font-size: 0.875rem; line-height: 1; transition: all var(--ease);
  opacity: 0; padding: 0;
  &:hover { background: var(--red-s); color: var(--red); }
}
</style>
