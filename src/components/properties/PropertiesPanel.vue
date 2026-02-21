<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'

import AlignmentSection from './AlignmentSection.vue'
import LayoutSection from './LayoutSection.vue'
import OpacitySection from './OpacitySection.vue'
import FillSection from './FillSection.vue'
import StrokeSection from './StrokeSection.vue'
import ShadowSection from './ShadowSection.vue'
import BlurSection from './BlurSection.vue'
import MaskSection from './MaskSection.vue'
import CropSection from './CropSection.vue'
import TextSection from './TextSection.vue'
import PathSection from './PathSection.vue'
import FrameSettingsSection from './FrameSettingsSection.vue'
import GridSnapSection from './GridSnapSection.vue'
import MultiSelectInfo from './MultiSelectInfo.vue'
import PlaybackSection from './PlaybackSection.vue'
import AnimateStatusSection from './AnimateStatusSection.vue'
import QuickAnimateSection from './QuickAnimateSection.vue'
import KeyframeDetailSection from './KeyframeDetailSection.vue'
import KeyframeListSection from './KeyframeListSection.vue'
import ElementTimingSection from './ElementTimingSection.vue'
import StaggerSection from './StaggerSection.vue'
import VideoSection from './VideoSection.vue'
import ImageSection from './ImageSection.vue'

const ui = useUiStore()
const editor = useEditorStore()

const hasSelection = computed(() => ui.selectedIds.size > 0)
const isSingle = computed(() => ui.selectedIds.size === 1)
const isMulti = computed(() => ui.selectedIds.size > 1)

const selectedEl = computed(() => {
  if (!isSingle.value) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const isText  = computed(() => selectedEl.value?.type === 'text')
const isPath  = computed(() => selectedEl.value?.type === 'path')
const isGroup = computed(() => selectedEl.value?.type === 'group')
const isVideo = computed(() => selectedEl.value?.type === 'video')
const isImage = computed(() => selectedEl.value?.type === 'image')
</script>

<template>
  <div class="panel">
    <!-- Design / Animate toggle -->
    <div class="tabs-bar">
      <div class="tabs">
        <button
          class="tab"
          :class="{ 'is-active': ui.activePanel === 'design' }"
          @click="ui.setActivePanel('design')"
        >Design</button>
        <button
          class="tab"
          :class="{ 'is-active': ui.activePanel === 'animate' }"
          @click="ui.setActivePanel('animate')"
        >Animate</button>
      </div>
    </div>

    <div class="scroll">

      <!-- ── DESIGN TAB ── -->
      <template v-if="ui.activePanel === 'design'">
        <template v-if="hasSelection">
          <MultiSelectInfo v-if="isMulti" />
          <AlignmentSection v-if="hasSelection" />
          <LayoutSection />
          <MaskSection />
          <CropSection />
          <TextSection v-if="isText" />
          <PathSection v-if="isPath" />
          <VideoSection v-if="isVideo" />
          <ImageSection v-if="isImage" />
          <OpacitySection />
          <!-- Group info section -->
          <template v-if="isGroup">
            <div class="group-section">
              <div class="group-header">Group</div>
              <div class="group-body">
                <div class="group-row">
                  <span class="group-label">Children</span>
                  <span class="group-value">{{ (selectedEl as any).childIds?.length ?? 0 }}</span>
                </div>
                <button class="ungroup-btn" @click="() => { const ids = editor.ungroupElements(selectedEl!.id); ui.selectAll(ids); }">
                  Ungroup
                </button>
              </div>
            </div>
          </template>
          <template v-if="!isGroup && !isVideo && !isImage">
            <FillSection />
            <StrokeSection />
            <ShadowSection />
            <BlurSection />
          </template>
        </template>
        <template v-else>
          <FrameSettingsSection />
          <GridSnapSection />
        </template>
      </template>

      <!-- ── ANIMATE TAB ── -->
      <template v-if="ui.activePanel === 'animate'">
        <PlaybackSection />
        <template v-if="hasSelection">
          <AnimateStatusSection />
          <QuickAnimateSection />
          <KeyframeDetailSection />
          <KeyframeListSection />
          <ElementTimingSection />
          <StaggerSection v-if="isMulti" />
        </template>
      </template>

    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--bg-2);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  flex: 1;
}

.tabs-bar {
  display: flex;
  height: 2.375rem;
  align-items: center;
  justify-content: center;
  padding: 0 0.625rem;
  border-bottom: 1px solid var(--border);
}
.tabs {
  display: flex;
  background: var(--bg-3);
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  overflow: hidden;
  width: 100%;
}
.tab {
  flex: 1;
  height: 1.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--ease);
  border: none;
  background: none;
  border-radius: var(--r-sm);
  margin: 0.125rem;
  &:hover { color: var(--text-2); }
  &.is-active {
    background: var(--bg-5);
    color: var(--text-1);
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
  }
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 2rem;
}

.group-section {
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
}
.group-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.group-body { display: flex; flex-direction: column; gap: 0.5rem; }
.group-row { display: flex; justify-content: space-between; align-items: center; }
.group-label { font-size: 0.75rem; color: var(--text-3); }
.group-value { font-size: 0.75rem; font-weight: 500; color: var(--text-1); font-family: var(--mono); }
.ungroup-btn {
  height: 1.5rem;
  padding: 0 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--ease);
  &:hover { background: var(--bg-4); color: var(--text-1); border-color: var(--border-l); }
}
</style>
