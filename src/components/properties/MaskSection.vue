<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useMasking } from '@/composables/useMasking'
import type { useCropTool } from '@/composables/useCropTool'

const editor = useEditorStore()
const ui = useUiStore()
const masking = useMasking()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const isMask = computed(() => el.value?.isMask === true)
const maskedById = computed(() => el.value?.maskedById ?? null)

const maskedElements = computed(() => {
  if (!isMask.value || !el.value) return []
  return (el.value.maskedElementIds ?? [])
    .map(id => editor.getElementById(id))
    .filter(Boolean) as ReturnType<typeof editor.getElementById>[]
})

const maskSource = computed(() => {
  if (!maskedById.value) return null
  return editor.getElementById(maskedById.value) ?? null
})

function releaseMask() {
  if (!el.value || !isMask.value) return
  masking.releaseMask(el.value.id)
}

function removeFromMask() {
  if (!el.value || !maskedById.value) return
  masking.removeFromMask(el.value.id)
}
</script>

<template>
  <div v-if="el && (isMask || maskedById)" class="section">
    <!-- Mask source element -->
    <template v-if="isMask">
      <div class="title">Mask</div>
      <div class="row">
        <span class="label">Masking</span>
        <span class="value">{{ maskedElements.length }} element{{ maskedElements.length !== 1 ? 's' : '' }}</span>
      </div>
      <div v-for="masked in maskedElements" :key="masked?.id" class="row">
        <span class="name">{{ masked?.name }}</span>
      </div>
      <div class="row">
        <button class="action-btn" @click="releaseMask">Release Mask</button>
      </div>
    </template>

    <!-- Masked element -->
    <template v-else-if="maskedById">
      <div class="title">Masked By</div>
      <div class="row">
        <span class="label">Mask</span>
        <span class="value">{{ maskSource?.name ?? '—' }}</span>
      </div>
      <div class="row">
        <button class="action-btn" @click="removeFromMask">Remove from Mask</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 0.375rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.625rem;
}
.label {
  width: 4.5rem;
  min-width: 4.5rem;
  font-size: 0.6875rem;
  color: var(--text-3);
}
.value {
  font-size: 0.6875rem;
  color: var(--text-1);
  font-family: var(--mono);
}
.name {
  font-size: 0.6875rem;
  color: var(--text-2);
  padding-left: 4.5rem;
}
.action-btn {
  flex: 1;
  height: 1.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-2);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); border-color: var(--border-l); }
}
</style>
