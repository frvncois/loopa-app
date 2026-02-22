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
import IconVideo from '@/components/icons/IconVideo.vue'

const editor = useEditorStore()
const ui = useUiStore()
const timeline = useTimelineStore()

// Only top-level elements for the active frame
const topLevelElements = computed(() =>
  ui.activeFrameId ? editor.getTopLevelElementsForFrame(ui.activeFrameId) : []
)

const collapsedGroups = ref<Set<string>>(new Set())

function toggleGroupCollapse(groupId: string) {
  const s = new Set(collapsedGroups.value)
  if (s.has(groupId)) s.delete(groupId)
  else s.add(groupId)
  collapsedGroups.value = s
}

type TrackRow = { el: Element; depth: number }

function flattenForTimeline(elements: Element[], depth: number): TrackRow[] {
  const result: TrackRow[] = []
  for (const el of elements) {
    result.push({ el, depth })
    if (el.type === 'group' && !collapsedGroups.value.has(el.id)) {
      const children = ((el as any).childIds ?? [])
        .map((id: string) => editor.getElementById(id))
        .filter(Boolean) as Element[]
      result.push(...flattenForTimeline(children, depth + 1))
    }
  }
  return result
}

const visibleTracks = computed(() => flattenForTimeline(topLevelElements.value, 0))

const PX_PER_FRAME = 8
const RULER_OFFSET = 20
const TRACK_H = 28 // 1.75rem in px

const labelsRef = ref<HTMLElement>()
const tracksRef = ref<HTMLElement>()
const areaRef = ref<HTMLElement>()

const trackWidth = computed(() =>
  RULER_OFFSET + timeline.totalFrames * PX_PER_FRAME + 40
)

function getKeyframes(elementId: string): Keyframe[] {
  if (!ui.activeFrameId) return []
  return editor.getKeyframesForFrame(ui.activeFrameId).filter(kf => kf.elementId === elementId)
}

function isSelected(el: Element): boolean {
  return ui.selectedIds.has(el.id)
}

function onLabelClick(el: Element, e: MouseEvent) {
  if (e.shiftKey) ui.toggleSelection(el.id)
  else ui.select(el.id)
}

// ── Drag state ─────────────────────────────────────────────────────────────

const dragState = ref<{
  active: boolean
  startX: number
  frameOffset: number
  ids: Set<string>
} | null>(null)

function onKeyframeMouseDown(kf: Keyframe, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  // Select on mousedown (shift to toggle)
  if (!ui.selectedKeyframeIds.has(kf.id)) {
    ui.selectKeyframe(kf.id, e.shiftKey)
  }

  const ids = new Set(ui.selectedKeyframeIds)
  // Ensure the clicked one is always in the drag set
  ids.add(kf.id)

  dragState.value = { active: false, startX: e.clientX, frameOffset: 0, ids }

  let moved = false

  function onMove(ev: MouseEvent) {
    if (!dragState.value) return
    const dx = ev.clientX - dragState.value.startX
    if (!moved && Math.abs(dx) < 3) return
    moved = true
    dragState.value.active = true
    dragState.value.frameOffset = Math.round(dx / PX_PER_FRAME)
  }

  function onUp(ev: MouseEvent) {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)

    if (!dragState.value) return

    if (moved && dragState.value.active && dragState.value.frameOffset !== 0) {
      // Apply offset to all dragged keyframes
      const offset = dragState.value.frameOffset
      for (const id of dragState.value.ids) {
        const kfData = editor.keyframes.find(k => k.id === id)
        if (!kfData) continue
        const newFrame = Math.max(0, Math.min(kfData.frame + offset, timeline.totalFrames))
        editor.updateKeyframe(id, { frame: newFrame })
      }
    } else if (!moved) {
      // Treat as click: update selection
      ui.selectKeyframe(kf.id, ev.shiftKey)
      timeline.seek(kf.frame)
    }

    dragState.value = null
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ── Marquee select ──────────────────────────────────────────────────────────

const marquee = ref<{ x: number; y: number; w: number; h: number; visible: boolean }>({
  x: 0, y: 0, w: 0, h: 0, visible: false
})

function onAreaMouseDown(e: MouseEvent) {
  // Only on the background, not on keyframes or playhead
  if ((e.target as HTMLElement).closest('.keyframe, .playhead')) return
  if (e.button !== 0) return

  const area = areaRef.value
  if (!area) return

  const rect = area.getBoundingClientRect()
  const startX = e.clientX - rect.left + (tracksRef.value?.scrollLeft ?? 0)
  const startY = e.clientY - rect.top + (tracksRef.value?.scrollTop ?? 0)

  marquee.value = { x: startX, y: startY, w: 0, h: 0, visible: true }
  if (!e.shiftKey) ui.clearKeyframeSelection()

  function onMove(ev: MouseEvent) {
    const cx = ev.clientX - rect.left + (tracksRef.value?.scrollLeft ?? 0)
    const cy = ev.clientY - rect.top + (tracksRef.value?.scrollTop ?? 0)
    marquee.value.w = cx - startX
    marquee.value.h = cy - startY
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)

    if (Math.abs(marquee.value.w) > 4 || Math.abs(marquee.value.h) > 4) {
      const x1 = Math.min(startX, startX + marquee.value.w)
      const x2 = Math.max(startX, startX + marquee.value.w)
      const y1 = Math.min(startY, startY + marquee.value.h)
      const y2 = Math.max(startY, startY + marquee.value.h)

      const selected: string[] = []
      visibleTracks.value.forEach((track, rowIdx) => {
        const trackY1 = rowIdx * TRACK_H
        const trackY2 = trackY1 + TRACK_H
        if (trackY2 < y1 || trackY1 > y2) return
        getKeyframes(track.el.id).forEach(kf => {
          const kfX = RULER_OFFSET + kf.frame * PX_PER_FRAME
          if (kfX >= x1 && kfX <= x2) selected.push(kf.id)
        })
      })

      if (selected.length > 0) {
        ui.selectKeyframes(selected)
      }
    }

    marquee.value.visible = false
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ── Track click (seek playhead) ─────────────────────────────────────────────

function onTrackClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const frame = Math.max(0, Math.min(
    Math.round((x - RULER_OFFSET) / PX_PER_FRAME),
    timeline.totalFrames
  ))
  timeline.seek(frame)
  ui.clearKeyframeSelection()
}

function onRulerSeek(frame: number) {
  timeline.seek(Math.max(0, Math.min(frame, timeline.totalFrames)))
}

// ── Playhead drag ───────────────────────────────────────────────────────────

function onPlayheadDrag(e: MouseEvent) {
  e.preventDefault()
  const tracks = tracksRef.value
  if (!tracks) return

  function seek(clientX: number) {
    const rect = tracks!.getBoundingClientRect()
    const x = clientX - rect.left + tracks!.scrollLeft
    const frame = Math.max(0, Math.min(
      Math.round((x - RULER_OFFSET) / PX_PER_FRAME),
      timeline.totalFrames
    ))
    timeline.seek(frame)
  }

  seek(e.clientX)

  function onMove(ev: MouseEvent) { seek(ev.clientX) }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
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
  video: IconVideo,
}

// Marquee CSS helpers
const marqueeStyle = computed(() => {
  const { x, y, w, h } = marquee.value
  return {
    left: `${Math.min(x, x + w)}px`,
    top: `${Math.min(y, y + h)}px`,
    width: `${Math.abs(w)}px`,
    height: `${Math.abs(h)}px`,
  }
})

// Drag helpers
const draggingIds = computed(() =>
  dragState.value?.active ? dragState.value.ids : new Set<string>()
)
const dragFrameOffset = computed(() =>
  dragState.value?.active ? dragState.value.frameOffset : 0
)
</script>

<template>
  <div class="body">
    <!-- Labels column -->
    <div ref="labelsRef" class="labels" @scroll="onLabelsScroll">
      <div class="spacer" />
      <div
        v-for="track in visibleTracks"
        :key="track.el.id"
        class="label"
        :class="{ 'is-selected': isSelected(track.el), 'is-group': track.el.type === 'group' }"
        :style="{ paddingLeft: `calc(0.5rem + ${track.depth} * 0.75rem)` }"
        @click="onLabelClick(track.el, $event)"
      >
        <button
          v-if="track.el.type === 'group'"
          class="group-toggle"
          @click.stop="toggleGroupCollapse(track.el.id)"
        >
          <svg
            :class="{ 'is-collapsed': collapsedGroups.has(track.el.id) }"
            width="8" height="8" viewBox="0 0 8 8" fill="none"
          >
            <path d="M2 1L6 4L2 7" fill="none" stroke="currentColor" stroke-width="1.2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <component v-else :is="typeIcons[track.el.type] ?? typeIcons.rect" class="icon" />
        <span class="name">{{ track.el.name }}</span>
      </div>
    </div>

    <!-- Tracks column -->
    <div ref="tracksRef" class="tracks" @scroll="onTracksScroll">
      <div class="content" :style="{ minWidth: `${trackWidth}px` }">
        <TimelineRuler
          :total-frames="timeline.totalFrames"
          :pixels-per-frame="PX_PER_FRAME"
          :ruler-offset="RULER_OFFSET"
          @seek="onRulerSeek"
        />
        <div ref="areaRef" class="area" @mousedown="onAreaMouseDown">
          <TimelineTrack
            v-for="track in visibleTracks"
            :key="track.el.id"
            :keyframes="getKeyframes(track.el.id)"
            :pixels-per-frame="PX_PER_FRAME"
            :ruler-offset="RULER_OFFSET"
            :selected="isSelected(track.el)"
            :selected-keyframe-ids="ui.selectedKeyframeIds"
            :drag-frame-offset="dragFrameOffset"
            :dragging-ids="draggingIds"
            :video-trim="track.el.type === 'video' ? { trimStart: (track.el as any).trimStart, trimEnd: (track.el as any).trimEnd, fps: timeline.fps } : undefined"
            @keyframe-mousedown="onKeyframeMouseDown"
            @track-click="onTrackClick"
          />
          <TimelinePlayhead
            :frame="timeline.currentFrame"
            :pixels-per-frame="PX_PER_FRAME"
            :ruler-offset="RULER_OFFSET"
            @mousedown="onPlayheadDrag"
          />
          <!-- Marquee selection rect -->
          <div
            v-if="marquee.visible"
            class="marquee"
            :style="marqueeStyle"
          />
        </div>
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
  gap: 0.375rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--ease);
  &:hover { background: var(--bg-4); }
  &.is-selected { background: var(--accent-s); }
  &.is-group { font-weight: 600; }
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
.group-toggle {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-4);
  display: flex;
  align-items: center;
  justify-content: center;
  svg { transition: transform 150ms var(--ease); }
  svg.is-collapsed { transform: rotate(-90deg); }
  &:hover { color: var(--text-2); }
}
.tracks {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
}
.area {
  position: relative;
  flex: 1;
}
.marquee {
  position: absolute;
  background: rgba(67, 83, 255, 0.12);
  border: 1px solid var(--accent);
  pointer-events: none;
  z-index: 10;
}
</style>
