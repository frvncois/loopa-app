<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'
import BaseModal from '@/components/ui/BaseModal.vue'

const ui = useUiStore()

const groups: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: 'Tools',
    items: [
      { key: 'V', label: 'Select' },
      { key: 'R', label: 'Rectangle' },
      { key: 'C', label: 'Circle' },
      { key: 'E', label: 'Ellipse' },
      { key: 'L', label: 'Line' },
      { key: 'P', label: 'Pen' },
      { key: 'T', label: 'Text' },
      { key: 'H', label: 'Hand / Pan' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { key: '⌘Z', label: 'Undo' },
      { key: '⌘⇧Z', label: 'Redo' },
      { key: '⌘C', label: 'Copy' },
      { key: '⌘V', label: 'Paste' },
      { key: '⌘X', label: 'Cut' },
      { key: '⌘D', label: 'Duplicate' },
      { key: '⌘A', label: 'Select all' },
      { key: '⌘S', label: 'Save' },
      { key: '⌦', label: 'Delete selected' },
    ],
  },
  {
    title: 'Playback',
    items: [
      { key: 'Space', label: 'Play / Pause' },
      { key: 'K', label: 'Add keyframe' },
    ],
  },
  {
    title: 'View',
    items: [
      { key: '[', label: 'Zoom out' },
      { key: ']', label: 'Zoom in' },
      { key: '0', label: 'Reset zoom' },
      { key: 'M', label: 'Toggle Design / Animate' },
      { key: 'Esc', label: 'Deselect / Exit mode' },
      { key: 'Enter', label: 'Enter path edit mode' },
      { key: '?', label: 'Show shortcuts' },
    ],
  },
  {
    title: 'Nudge',
    items: [
      { key: '↑ ↓ ← →', label: 'Move 1px' },
      { key: 'Shift + Arrows', label: 'Move 10px' },
    ],
  },
]
</script>

<template>
  <BaseModal
    :open="ui.activeModal === 'shortcuts'"
    title="Keyboard Shortcuts"
    width="560px"
    @close="ui.closeModal()"
  >
    <div class="sc-grid">
      <div v-for="group in groups" :key="group.title" class="sc-group">
        <div class="sc-group-title">{{ group.title }}</div>
        <div v-for="item in group.items" :key="item.key" class="sc-row">
          <span class="sc-label">{{ item.label }}</span>
          <span class="sc-key">{{ item.key }}</span>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.sc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem 2rem;
  padding: 0.75rem 0;
}

.sc-group-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 0.5rem;
}

.sc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.1875rem 0;
}

.sc-label {
  font-size: 11px;
  color: var(--text-2);
}

.sc-key {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-1);
  background: var(--bg-4);
  border: 1px solid var(--border-l);
  border-radius: var(--r-sm);
  padding: 0.125rem 0.375rem;
  white-space: nowrap;
}
</style>
