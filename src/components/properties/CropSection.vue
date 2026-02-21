<script setup lang="ts">
import { computed, inject } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import type { useCropTool } from '@/composables/useCropTool'

const editor = useEditorStore()
const ui = useUiStore()

const cropTool = inject<ReturnType<typeof useCropTool> | null>('cropTool', null)

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const hasCrop = computed(() => !!el.value?.cropRect)
const isEditing = computed(() => cropTool?.isCropMode.value ?? false)

const cropRect = computed(() => {
  // While editing, show live values from cropTool.tempCropRect
  if (isEditing.value && cropTool?.tempCropRect.value) return cropTool.tempCropRect.value
  return el.value?.cropRect ?? null
})

function enterCrop() {
  if (!el.value) return
  cropTool?.enterCropMode(el.value.id)
}

function applyAndExit() {
  cropTool?.exitCropMode(true)
}

function cancelCrop() {
  cropTool?.exitCropMode(false)
}

function resetCrop() {
  if (!el.value) return
  cropTool?.resetCrop(el.value.id)
}
</script>

<template>
  <div v-if="el && (hasCrop || isEditing)" class="section">
    <div class="title-row">
      <span class="title">Crop</span>
      <template v-if="isEditing">
        <button class="chip is-apply" @click="applyAndExit">Apply</button>
        <button class="chip" @click="cancelCrop">Cancel</button>
      </template>
    </div>

    <template v-if="cropRect">
      <div class="row">
        <span class="label">Offset</span>
        <div class="field is-pair">
          <span class="field-label">X</span>
          <span class="field-val">{{ Math.round(cropRect.x) }}</span>
        </div>
        <div class="field is-pair">
          <span class="field-label">Y</span>
          <span class="field-val">{{ Math.round(cropRect.y) }}</span>
        </div>
      </div>
      <div class="row">
        <span class="label">Size</span>
        <div class="field is-pair">
          <span class="field-label">W</span>
          <span class="field-val">{{ Math.round(cropRect.width) }}</span>
        </div>
        <div class="field is-pair">
          <span class="field-label">H</span>
          <span class="field-val">{{ Math.round(cropRect.height) }}</span>
        </div>
      </div>
    </template>

    <div class="row">
      <button v-if="!isEditing" class="action-btn" @click="enterCrop">Edit Crop</button>
      <button v-if="hasCrop && !isEditing" class="action-btn is-ghost" @click="resetCrop">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.section {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.title-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}
.title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-2);
  flex: 1;
}
.chip {
  height: 1.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-2);
  font-size: 0.625rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
  &.is-apply { background: var(--accent-s); color: var(--accent); border-color: var(--accent); }
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
.field {
  display: flex;
  align-items: center;
  height: 1.625rem;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  gap: 0;
  &.is-pair { width: 4.75rem; flex: none; }
}
.field-label {
  padding: 0 0.3125rem;
  font-size: 0.5625rem;
  color: var(--text-4);
  font-family: var(--mono);
  border-right: 1px solid var(--border);
  height: 100%;
  display: flex;
  align-items: center;
}
.field-val {
  flex: 1;
  padding: 0 0.3125rem;
  font-size: 0.6875rem;
  font-family: var(--mono);
  color: var(--text-1);
  text-align: right;
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
  &.is-ghost { color: var(--text-3); }
}
</style>
