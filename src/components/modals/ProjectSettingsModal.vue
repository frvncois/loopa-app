<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useProjectsStore } from '@/stores/projectsStore'
import { useEditorStore } from '@/stores/editorStore'

const projects = useProjectsStore()
const editor = useEditorStore()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const name = ref('')
const width = ref(800)
const height = ref(600)

watch(() => editor.projectId, (id) => {
  if (!id) return
  const meta = projects.projects.find(p => p.id === id)
  if (meta) {
    name.value = meta.name
    width.value = meta.artboardWidth
    height.value = meta.artboardHeight
  }
}, { immediate: true })

function save() {
  if (!editor.projectId) return
  projects.updateProjectMeta(editor.projectId, {
    name: name.value,
    artboardWidth: width.value,
    artboardHeight: height.value
  })
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" title="Project Settings" @close="emit('close')">
    <div class="form">
      <div class="field">
        <label class="label">Project name</label>
        <input v-model="name" class="input" type="text" />
      </div>
      <div class="field">
        <label class="label">Artboard size</label>
        <div class="size-row">
          <input v-model.number="width" class="input is-compact" type="number" min="1" />
          <span class="times">×</span>
          <input v-model.number="height" class="input is-compact" type="number" min="1" />
        </div>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="ghost" size="sm" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="accent" size="sm" @click="save">Save</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 0.875rem; }
.field { display: flex; flex-direction: column; gap: 0.3125rem; }
.label { font-size: 0.6875rem; font-weight: 500; color: var(--text-3); }
.input {
  height: 1.875rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.5rem; font-size: 0.6875rem; outline: none; transition: border-color var(--ease);
  &:focus { border-color: var(--accent); }
  &.is-compact { width: 5rem; flex: none; font-family: var(--mono); }
}
.size-row { display: flex; align-items: center; gap: 0.5rem; }
.times { font-size: 0.6875rem; color: var(--text-4); }
</style>
