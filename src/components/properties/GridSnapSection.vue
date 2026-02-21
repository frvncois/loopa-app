<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'
import BaseToggle from '@/components/ui/BaseToggle.vue'

const ui = useUiStore()
</script>

<template>
  <div class="section">
    <div class="title">Grid & Snap</div>
    <BaseToggle :model-value="ui.showGrid" label="Show grid" @update:model-value="ui.toggleGrid()" />
    <BaseToggle :model-value="ui.snapToGrid" label="Snap to grid" @update:model-value="ui.toggleSnap()" />
    <div class="row">
      <span class="label">Grid size</span>
      <input class="field is-pair" type="number" :value="ui.gridSize" min="1"
        @change="ui.gridSize = parseInt(($event.target as HTMLInputElement).value) || 10" />
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.25rem; }
.row {
  display: flex; align-items: center; gap: 0.375rem; min-height: 1.625rem;
  margin-top: 0.125rem;
}
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.75rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--r-sm);
  color: var(--text-1); padding: 0 0.4375rem; font-family: var(--mono); font-size: 0.75rem; outline: none;
  transition: border-color var(--ease); min-width: 0;
  &:focus { border-color: var(--accent); }
  &.is-pair { width: 4.75rem; min-width: 4.75rem; flex: none; }
}
</style>
