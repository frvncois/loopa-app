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
import ClipContentSection from './ClipContentSection.vue'
import TextSection from './TextSection.vue'
import PathSection from './PathSection.vue'
import ArtboardSection from './ArtboardSection.vue'
import GridSnapSection from './GridSnapSection.vue'
import MultiSelectInfo from './MultiSelectInfo.vue'
import PlaybackSection from './PlaybackSection.vue'
import AnimateStatusSection from './AnimateStatusSection.vue'
import QuickAnimateSection from './QuickAnimateSection.vue'
import KeyframeDetailSection from './KeyframeDetailSection.vue'
import KeyframeListSection from './KeyframeListSection.vue'
import ElementTimingSection from './ElementTimingSection.vue'
import StaggerSection from './StaggerSection.vue'
import OnionSkinSection from './OnionSkinSection.vue'

const ui = useUiStore()
const editor = useEditorStore()

const hasSelection = computed(() => ui.selectedIds.size > 0)
const isSingle = computed(() => ui.selectedIds.size === 1)
const isMulti = computed(() => ui.selectedIds.size > 1)

const selectedEl = computed(() => {
  if (!isSingle.value) return null
  return editor.getElementById([...ui.selectedIds][0]) ?? null
})

const isRect = computed(() => selectedEl.value?.type === 'rect')
const isText = computed(() => selectedEl.value?.type === 'text')
const isPath = computed(() => selectedEl.value?.type === 'path')
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
          <ClipContentSection v-if="isRect" />
          <TextSection v-if="isText" />
          <PathSection v-if="isPath" />
          <OpacitySection />
          <FillSection />
          <StrokeSection />
          <ShadowSection />
          <BlurSection />
        </template>
        <template v-else>
          <ArtboardSection />
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
        <OnionSkinSection />
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
}

.tabs-bar {
  display: flex;
  height: 2.25rem;
  min-height: 2.25rem;
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
  font-size: 0.6875rem;
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
</style>
