<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useMasking } from '@/composables/useMasking'
import type { GroupElement } from '@/types/elements'

const editor = useEditorStore()
const ui = useUiStore()
const masking = useMasking()

const el = computed(() => {
  if (ui.selectedIds.size !== 1) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

// Is the selected element a mask group?
const isMaskGroup = computed(() =>
  el.value?.type === 'group' && (el.value as GroupElement).hasMask === true
)

// Is the selected element the mask shape (first child of a mask group)?
const isMaskShape = computed(() => {
  if (!el.value) return false
  return editor.elements.some(
    g => g.type === 'group' && (g as GroupElement).hasMask && (g as GroupElement).childIds[0] === el.value!.id
  )
})

// Number of clipped children (all children except the mask shape)
const clippedCount = computed(() => {
  if (!isMaskGroup.value || !el.value) return 0
  return Math.max(0, (el.value as GroupElement).childIds.length - 1)
})

function releaseMask() {
  if (!el.value) return
  masking.releaseMask(el.value.id)
}
</script>

<template>
  <div v-if="isMaskGroup || isMaskShape" class="section">
    <!-- Mask group selected -->
    <template v-if="isMaskGroup">
      <div class="title">Mask Group</div>
      <div class="row">
        <span class="label">Clips</span>
        <span class="value">{{ clippedCount }} layer{{ clippedCount !== 1 ? 's' : '' }}</span>
      </div>
      <div class="row">
        <button class="action-btn" @click="releaseMask">Release Mask</button>
      </div>
    </template>

    <!-- Mask shape (first child of mask group) -->
    <template v-else-if="isMaskShape">
      <div class="title">Mask Shape</div>
      <div class="row">
        <span class="label">Role</span>
        <span class="value">Clipping shape</span>
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
