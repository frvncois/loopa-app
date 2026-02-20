<script setup lang="ts">
import type { Component } from 'vue'
import type { Element } from '@/types/elements'
import IconRect from '@/components/icons/IconRect.vue'
import IconCircle from '@/components/icons/IconCircle.vue'
import IconEllipse from '@/components/icons/IconEllipse.vue'
import IconLine from '@/components/icons/IconLine.vue'
import IconPolygon from '@/components/icons/IconPolygon.vue'
import IconStar from '@/components/icons/IconStar.vue'
import IconText from '@/components/icons/IconText.vue'
import IconPen from '@/components/icons/IconPen.vue'
import IconEye from '@/components/icons/IconEye.vue'
import IconEyeOff from '@/components/icons/IconEyeOff.vue'

const props = defineProps<{
  element: Element
  selected: boolean
  animated?: boolean
  dragOver?: boolean
}>()

const emit = defineEmits<{
  click: [e: MouseEvent]
  toggleVisibility: []
  dragStart: [id: string]
  dragOver: [id: string]
  drop: [id: string]
}>()

const ICONS: Record<string, Component> = {
  rect: IconRect,
  circle: IconCircle,
  ellipse: IconEllipse,
  line: IconLine,
  polygon: IconPolygon,
  star: IconStar,
  text: IconText,
  path: IconPen,
}
</script>

<template>
  <div
    class="layer"
    :class="{ 'is-selected': selected, 'is-locked': element.locked, 'is-drag-over': dragOver }"
    :style="{ opacity: element.visible ? 1 : 0.45 }"
    draggable="true"
    @click="emit('click', $event)"
    @dragstart="emit('dragStart', element.id)"
    @dragover.prevent="emit('dragOver', element.id)"
    @drop.prevent="emit('drop', element.id)"
  >
    <div class="icon">
      <component :is="ICONS[element.type] ?? ICONS.rect" />
    </div>
    <span class="name">{{ element.name }}</span>

    <!-- Visibility toggle -->
    <button
      class="vis"
      :title="element.visible ? 'Hide layer' : 'Show layer'"
      :aria-label="element.visible ? 'Hide layer' : 'Show layer'"
      :aria-pressed="!element.visible"
      @click.stop="emit('toggleVisibility')"
    >
      <IconEye v-if="element.visible" />
      <IconEyeOff v-else />
    </button>

    <!-- Animated indicator -->
    <div v-if="animated" class="indicator is-animated" />
  </div>
</template>

<style scoped>
.layer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.875rem;
  padding: 0 0.5rem;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background var(--ease);
  position: relative;
  &:hover { background: var(--bg-4); }
  &.is-selected { background: var(--accent-s); }
  &.is-selected .icon svg { color: var(--accent); }
  &.is-drag-over { border-top: 2px solid var(--accent); }
  &:hover .vis { opacity: 1; }
}
.icon {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-5);
  flex-shrink: 0;
  svg { width: 0.625rem; height: 0.625rem; color: var(--text-3); }
}
.name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  color: var(--text-1);
}
.vis {
  opacity: 0;
  transition: opacity var(--ease);
  color: var(--text-3);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  display: flex;
  svg { width: 0.75rem; height: 0.75rem; }
}
.indicator {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  &.is-animated { background: var(--accent); }
}
</style>
