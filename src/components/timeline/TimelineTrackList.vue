<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import type { Keyframe } from '@/types/animation'
import type { Element } from '@/types/elements'
import type { Component } from 'vue'
import TimelineRuler from './TimelineRuler.vue'
import TimelineTrack from './TimelineTrack.vue'
import TimelinePlayhead from './TimelinePlayhead.vue'
import IconRect from '@/components/icons/IconRect.vue'
import IconCircle from '@/components/icons/IconCircle.vue'
import IconEllipse from '@/components/icons/IconEllipse.vue'
import IconLine from '@/components/icons/IconLine.vue'
import IconPen from '@/components/icons/IconPen.vue'
import IconText from '@/components/icons/IconText.vue'
import IconPolygon from '@/components/icons/IconPolygon.vue'
import IconStar from '@/components/icons/IconStar.vue'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

const PX_PER_FRAME = 8
const RULER_OFFSET = 20

const labelsRef = ref<HTMLElement>()
const tracksRef = ref<HTMLElement>()

const trackWidth = computed(() =>
  RULER_OFFSET + timeline.totalFrames * PX_PER_FRAME + 40
)

function getKeyframes(elementId: string): Keyframe[] {
  return editor.keyframes.filter(kf => kf.elementId === elementId)
}

function isSelected(el: Element): boolean {
  return ui.selectedIds.has(el.id)
}

function onLabelClick(el: Element, e: MouseEvent) {
  if (e.shiftKey) ui.toggleSelection(el.id)
  else ui.select(el.id)
}

function onKeyframeClick(kf: Keyframe) {
  ui.selectKeyframe(kf.id)
  timeline.seek(kf.frame)
}

function onTrackClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const frame = Math.max(0, Math.min(
    Math.round((x - RULER_OFFSET) / PX_PER_FRAME),
    timeline.totalFrames
  ))
  timeline.seek(frame)
}

function onRulerSeek(frame: number) {
  timeline.seek(Math.max(0, Math.min(frame, timeline.totalFrames)))
}

function onTracksScroll() {
  if (labelsRef.value && tracksRef.value) {
    labelsRef.value.scrollTop = tracksRef.value.scrollTop
  }
}

function onLabelsScroll() {
  if (labelsRef.value && tracksRef.value) {
    tracksRef.value.scrollTop = labelsRef.value.scrollTop
  }
}

// Element type icons
const typeIcons: Record<string, Component> = {
  rect: IconRect,
  circle: IconCircle,
  ellipse: IconEllipse,
  line: IconLine,
  path: IconPen,
  text: IconText,
  polygon: IconPolygon,
  star: IconStar,
}
</script>

<template>
  <div class="body">
    <!-- Labels column -->
    <div ref="labelsRef" class="labels" @scroll="onLabelsScroll">
      <div class="spacer" />
      <div
        v-for="el in editor.elements"
        :key="el.id"
        class="label"
        :class="{ 'is-selected': isSelected(el) }"
        @click="onLabelClick(el, $event)"
      >
        <component :is="typeIcons[el.type] ?? typeIcons.rect" class="icon" />
        <span class="name">{{ el.name }}</span>
      </div>
    </div>

    <!-- Tracks column -->
    <div ref="tracksRef" class="tracks" @scroll="onTracksScroll">
      <TimelineRuler
        :total-frames="timeline.totalFrames"
        :pixels-per-frame="PX_PER_FRAME"
        :ruler-offset="RULER_OFFSET"
        @seek="onRulerSeek"
      />
      <div class="area" :style="{ width: `${trackWidth}px` }">
        <TimelineTrack
          v-for="el in editor.elements"
          :key="el.id"
          :keyframes="getKeyframes(el.id)"
          :pixels-per-frame="PX_PER_FRAME"
          :ruler-offset="RULER_OFFSET"
          :selected="isSelected(el)"
          :selected-keyframe-id="ui.selectedKeyframeId"
          @keyframe-click="onKeyframeClick"
          @track-click="onTrackClick"
        />
        <TimelinePlayhead
          :frame="timeline.currentFrame"
          :pixels-per-frame="PX_PER_FRAME"
          :ruler-offset="RULER_OFFSET"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.labels {
  width: 10rem;
  min-width: 10rem;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}
.spacer {
  height: 1.375rem;
  min-height: 1.375rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-3);
}
.label {
  height: 1.75rem;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  gap: 0.375rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--ease);
  &:hover { background: var(--bg-4); }
  &.is-selected { background: var(--accent-s); }
}
.icon { width: 0.75rem; height: 0.75rem; opacity: 0.4; flex-shrink: 0; }
.name {
  font-size: 0.625rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}
.tracks {
  flex: 1;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}
.area {
  position: relative;
  flex: 1;
}
</style>
