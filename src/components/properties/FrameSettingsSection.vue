<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useProjectsStore } from '@/stores/projectsStore'

const editor = useEditorStore()
const ui = useUiStore()
const projects = useProjectsStore()

const frame = computed(() =>
  ui.activeFrameId ? editor.frames.find(f => f.id === ui.activeFrameId) ?? null : null
)

function update(key: keyof typeof frame.value, val: string | number) {
  if (!frame.value) return
  editor.updateFrame(frame.value.id, { [key]: val } as any)
  // Keep meta in sync for dashboard
  if ((key === 'width' || key === 'height') && editor.projectId) {
    const firstFrame = editor.frames.find(f => f.order === 0)
    if (firstFrame?.id === frame.value.id) {
      projects.updateProjectMeta(editor.projectId, {
        artboardWidth: key === 'width' ? Number(val) : firstFrame.width,
        artboardHeight: key === 'height' ? Number(val) : firstFrame.height,
      })
    }
  }
}
</script>

<template>
  <div v-if="frame" class="section">
    <div class="title">Frame</div>
    <div class="row">
      <span class="label">Name</span>
      <input
        class="field"
        type="text"
        :value="frame.name"
        @change="update('name', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="row">
      <span class="label">Size</span>
      <input
        class="field is-pair"
        type="number"
        :value="frame.width"
        @change="update('width', parseInt(($event.target as HTMLInputElement).value) || frame.width)"
      />
      <input
        class="field is-pair"
        type="number"
        :value="frame.height"
        @change="update('height', parseInt(($event.target as HTMLInputElement).value) || frame.height)"
      />
    </div>
    <div class="row">
      <span class="label">Background</span>
      <div class="color-row">
        <input
          class="color-swatch"
          type="color"
          :value="`#${frame.backgroundColor}`"
          @input="update('backgroundColor', ($event.target as HTMLInputElement).value.slice(1))"
        />
        <input
          class="field"
          type="text"
          :value="frame.backgroundColor"
          @change="update('backgroundColor', ($event.target as HTMLInputElement).value.replace('#', ''))"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.5rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem; margin-bottom: 0.25rem;
  &:last-child { margin-bottom: 0; }
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
.color-row { display: flex; align-items: center; gap: 0.375rem; flex: 1; }
.color-swatch {
  width: 1.625rem; height: 1.625rem; border: 1px solid var(--border);
  border-radius: var(--r-sm); cursor: pointer; padding: 0.125rem;
  background: var(--bg-3);
}
</style>
