<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <div class="section">
    <label class="title" :class="{ 'is-collapsed': !ui.onionSkin.enabled }">
      <input type="checkbox" :checked="ui.onionSkin.enabled" @change="ui.onionSkin.enabled = ($event.target as HTMLInputElement).checked" />
      Onion Skin
    </label>
    <template v-if="ui.onionSkin.enabled">
      <div class="row">
        <span class="label">Before</span>
        <input class="field" type="number" min="0" max="10" v-model.number="ui.onionSkin.framesBefore" />
        <span class="unit">fr</span>
      </div>
      <div class="row">
        <span class="label">After</span>
        <input class="field" type="number" min="0" max="10" v-model.number="ui.onionSkin.framesAfter" />
        <span class="unit">fr</span>
      </div>
      <div class="row">
        <span class="label">Opacity</span>
        <input class="field" type="number" min="0" max="1" step="0.1" v-model.number="ui.onionSkin.opacityBefore" />
      </div>
      <div class="row">
        <span class="label">Scope</span>
        <select class="select" v-model="ui.onionSkin.scope">
          <option value="selected">Selected</option>
          <option value="all">All</option>
        </select>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
.title {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.6875rem; font-weight: 600; color: var(--text-2);
  cursor: pointer; margin-bottom: 0.5rem;
  input[type="checkbox"] { width: 0.875rem; height: 0.875rem; accent-color: var(--accent); }
  &.is-collapsed { margin-bottom: 0; }
}
.row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem; min-height: 1.625rem; }
.label { width: 4.5rem; min-width: 4.5rem; font-size: 0.6875rem; color: var(--text-3); font-weight: 500; }
.field {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem;
  font-family: var(--mono); font-size: 0.6875rem; outline: none; min-width: 0;
  &:focus { border-color: var(--accent); }
}
.select {
  flex: 1; height: 1.625rem; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text-1); padding: 0 0.4375rem; font-size: 0.6875rem; outline: none;
}
.unit { font-size: 0.625rem; color: var(--text-4); min-width: 1.25rem; }
</style>
