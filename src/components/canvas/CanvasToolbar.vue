<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import type { Component } from 'vue'
import type { ToolType } from '@/types/tools'
import IconCursor from '@/components/icons/IconCursor.vue'
import IconRect from '@/components/icons/IconRect.vue'
import IconCircle from '@/components/icons/IconCircle.vue'
import IconEllipse from '@/components/icons/IconEllipse.vue'
import IconLine from '@/components/icons/IconLine.vue'
import IconPen from '@/components/icons/IconPen.vue'
import IconText from '@/components/icons/IconText.vue'
import IconHand from '@/components/icons/IconHand.vue'

const ui = useUiStore()

const tools: { id: ToolType; title: string; key: string; icon: Component }[] = [
  { id: 'select', title: 'Select (V)', key: 'V', icon: IconCursor },
  { id: 'rect', title: 'Rectangle (R)', key: 'R', icon: IconRect },
  { id: 'circle', title: 'Circle (C)', key: 'C', icon: IconCircle },
  { id: 'ellipse', title: 'Ellipse (E)', key: 'E', icon: IconEllipse },
  { id: 'line', title: 'Line (L)', key: 'L', icon: IconLine },
  { id: 'pen', title: 'Pen (P)', key: 'P', icon: IconPen },
  { id: 'text', title: 'Text (T)', key: 'T', icon: IconText },
]

const currentLabel = computed(() => tools.find(t => t.id === ui.currentTool)?.title ?? 'Select')
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Drawing tools">
    <template v-for="tool in tools" :key="tool.id">
      <button
        class="button is-ghost is-icon"
        :class="{ 'is-active': ui.currentTool === tool.id }"
        :title="tool.title"
        :aria-pressed="ui.currentTool === tool.id"
        :aria-label="tool.title"
        @click="ui.setTool(tool.id)"
      >
        <component :is="tool.icon" />
      </button>
    </template>

    <div class="divider" role="separator" />

    <button
      class="button is-ghost is-icon"
      :class="{ 'is-active': ui.currentTool === 'hand' }"
      title="Hand (H)"
      aria-label="Hand (H)"
      :aria-pressed="ui.currentTool === 'hand'"
      @click="ui.setTool('hand')"
    >
      <IconHand />
    </button>

    <div class="spacer" />
    <span class="tool-label">{{ currentLabel }}</span>
  </div>
</template>

<style scoped>
.toolbar {
  height: var(--toolbar-h);
  min-height: var(--toolbar-h);
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 0.375rem;
  gap: 0.125rem;
  flex-shrink: 0;
}
.divider { width: 1px; height: 1.375rem; background: var(--border); margin: 0 0.1875rem; }
.spacer { flex: 1; }
.tool-label { font-size: 0.625rem; color: var(--text-4); font-family: var(--mono); }

.button {
  height: 1.625rem;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); }
  &.is-active { background: var(--accent-s); color: var(--accent); border-color: var(--accent); }
  &.is-icon { width: 1.75rem; padding: 0; }
}
</style>
