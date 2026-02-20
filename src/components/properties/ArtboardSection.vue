<script setup lang="ts">
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { computed } from 'vue'

const editor = useEditorStore()
const projects = useProjectsStore()

const meta = computed(() => {
  if (!editor.projectId) return null
  return projects.projects.find(p => p.id === editor.projectId) ?? null
})

function update(key: 'artboardWidth' | 'artboardHeight', val: string) {
  const num = parseInt(val)
  if (!isNaN(num) && num > 0 && editor.projectId) {
    projects.updateProjectMeta(editor.projectId, { [key]: num })
  }
}
</script>

<template>
  <div v-if="meta" class="section">
    <div class="title">Artboard</div>
    <div class="row">
      <span class="label">Size</span>
      <input class="field is-pair" type="number" :value="meta.artboardWidth" @change="update('artboardWidth', ($event.target as HTMLInputElement).value)" />
      <input class="field is-pair" type="number" :value="meta.artboardHeight" @change="update('artboardHeight', ($event.target as HTMLInputElement).value)" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.6875rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row { display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.6875rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
</style>
