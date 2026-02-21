<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'
const ui = useUiStore()
</script>

<template>
  <div class="section">
    <div class="title">Selection</div>
    <div class="stat-row">
      <span>Selected</span>
      <span class="value">{{ ui.selectedIds.size }} elements</span>
    </div>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title { font-size: 0.75rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.375rem; }
.stat-row { display: flex; justify-content: space-between; font-size: 0.75rem; padding: 0.1875rem 0; color: var(--text-3); }
.value { color: var(--text-2); font-family: var(--mono); font-size: 0.75rem; }
</style>
