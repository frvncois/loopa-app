<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'

const editor = useEditorStore()
const ui = useUiStore()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const kfs = computed(() =>
  el.value ? editor.keyframes.filter(kf => kf.elementId === el.value!.id) : []
)

const kfRange = computed(() => {
  if (kfs.value.length === 0) return null
  const frames = kfs.value.map(k => k.frame)
  return { min: Math.min(...frames), max: Math.max(...frames) }
})
</script>

<template>
  <div v-if="el" class="section">
    <div class="title">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ el.name }}</span>
      <span v-if="kfs.length > 0" class="count">{{ kfs.length }} keyframes</span>
    </div>
    <div class="stat-row">
      <span>Status</span>
      <span class="value" :style="{ color: kfs.length > 0 ? 'var(--accent)' : 'var(--text-4)' }">
        {{ kfs.length > 0 ? '● Animated' : '○ Static' }}
      </span>
    </div>
    <div v-if="kfRange" class="stat-row">
      <span>Range</span>
      <span class="value">Frame {{ kfRange.min }} → {{ kfRange.max }}</span>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.375rem; display: flex; align-items: center; gap: 0.375rem; }
.count { font-size: 0.625rem; color: var(--accent); font-weight: 400; white-space: nowrap; }
.stat-row { display: flex; justify-content: space-between; font-size: 0.75rem; padding: 0.1875rem 0; color: var(--text-3); }
.value { color: var(--text-2); font-family: var(--mono); font-size: 0.75rem; }
</style>
