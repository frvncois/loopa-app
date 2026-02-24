<script setup lang="ts">
import { computed, inject } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'
import type { useAiAssistant } from '@/composables/useAiAssistant'
import type { Element } from '@/types/elements'

import CollapsibleSection from './CollapsibleSection.vue'
import AlignmentSection from './AlignmentSection.vue'
import TextSection from './TextSection.vue'
import PositionSection from './PositionSection.vue'
import TransformSection from './TransformSection.vue'
import StyleSection from './StyleSection.vue'
import PathSection from './PathSection.vue'
import ImageSection from './ImageSection.vue'
import VideoSection from './VideoSection.vue'
import MaskSection from './MaskSection.vue'
import CropSection from './CropSection.vue'
import AnimationSection from './AnimationSection.vue'
import QuickAnimateSection from './QuickAnimateSection.vue'
import PlaybackSection from './PlaybackSection.vue'
import FrameSettingsSection from './FrameSettingsSection.vue'
import GridSnapSection from './GridSnapSection.vue'
import AiAssistantPanel from '@/components/ai/AiAssistantPanel.vue'

const aiAssistant = inject('aiAssistant') as ReturnType<typeof useAiAssistant> | undefined

const ui = useUiStore()
const editor = useEditorStore()

const getAnimatedEl = inject<(id: string) => Element | null>('getAnimatedElement')

const hasSelection = computed(() => ui.selectedIds.size > 0)
const isSingle     = computed(() => ui.selectedIds.size === 1)
const isMulti      = computed(() => ui.selectedIds.size > 1)

const selectedEl = computed(() => {
  if (!isSingle.value) return null
  const id = [...ui.selectedIds][0]
  if (getAnimatedEl) return getAnimatedEl(id) ?? null
  return editor.getElementById(id) ?? null
})

const isText  = computed(() => selectedEl.value?.type === 'text')
const isPath  = computed(() => selectedEl.value?.type === 'path')
const isGroup = computed(() => selectedEl.value?.type === 'group')
const isVideo = computed(() => selectedEl.value?.type === 'video')
const isImage = computed(() => selectedEl.value?.type === 'image')

// Activity dots: does this group of keys have any keyframes on the selected element?
function hasKfsFor(propKeys: string[]): boolean {
  if (!selectedEl.value) return false
  return editor.keyframes.some(kf =>
    kf.elementId === selectedEl.value!.id &&
    propKeys.some(p => kf.props[p as keyof typeof kf.props] !== undefined)
  )
}

const hasMotionPath = computed(() =>
  !!selectedEl.value && !!editor.getMotionPathForElement(selectedEl.value.id)
)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Properties</span>
    </div>

    <div class="scroll">

      <template v-if="hasSelection">

        <!-- Alignment — multi-select or group -->
        <CollapsibleSection v-if="isMulti || isGroup" title="Alignment">
          <AlignmentSection />
        </CollapsibleSection>

        <!-- Text — text elements only, before Position -->
        <CollapsibleSection
          v-if="isSingle && isText"
          title="Text"
          :has-activity="hasKfsFor(['fontSize'])"
        >
          <TextSection />
        </CollapsibleSection>

        <!-- Position -->
        <CollapsibleSection
          v-if="isSingle"
          title="Position"
          :has-activity="hasKfsFor(['x','y'])"
        >
          <PositionSection />
        </CollapsibleSection>

        <!-- Transform (includes 3D) -->
        <CollapsibleSection
          v-if="isSingle"
          title="Transform"
          :has-activity="hasKfsFor(['width','height','rotation','scaleX','scaleY','transformOriginX','transformOriginY','rotateX','rotateY','perspective'])"
        >
          <TransformSection />
        </CollapsibleSection>

        <!-- Style (Fill + Border + Shadow + Blur + Opacity) -->
        <CollapsibleSection
          v-if="isSingle"
          title="Style"
          :has-activity="hasKfsFor(['fillColor','fillOpacity','strokeColor','strokeWidth','rx','shadowOffsetX','shadowOffsetY','shadowBlur','shadowOpacity','shadowColor','blur','opacity'])"
        >
          <StyleSection />
        </CollapsibleSection>

        <!-- Path — path elements only -->
        <CollapsibleSection v-if="isSingle && isPath" title="Path">
          <PathSection />
        </CollapsibleSection>

        <!-- Image -->
        <CollapsibleSection v-if="isSingle && isImage" title="Image">
          <ImageSection />
        </CollapsibleSection>

        <!-- Video -->
        <CollapsibleSection v-if="isSingle && isVideo" title="Video">
          <VideoSection />
        </CollapsibleSection>

        <!-- Mask -->
        <CollapsibleSection v-if="isSingle && isGroup" title="Mask">
          <MaskSection />
        </CollapsibleSection>

        <!-- Crop -->
        <CollapsibleSection v-if="isSingle && (isImage || isVideo)" title="Crop">
          <CropSection />
        </CollapsibleSection>

        <!-- Animation (Keyframe + Easing + Motion Path) -->
        <CollapsibleSection
          v-if="isSingle"
          title="Animation"
          :has-activity="hasKfsFor(['x','y','width','height','rotation','opacity','scaleX','scaleY','fillColor','blur']) || hasMotionPath"
        >
          <AnimationSection />
        </CollapsibleSection>

        <!-- Quick Animate (Presets + Stagger) -->
        <CollapsibleSection v-if="hasSelection" title="Quick Animate">
          <QuickAnimateSection />
        </CollapsibleSection>

        <!-- Playback at bottom when something is selected -->
        <CollapsibleSection title="Playback">
          <PlaybackSection />
        </CollapsibleSection>

      </template>

      <!-- No selection: Frame settings + Playback -->
      <template v-else>
        <CollapsibleSection title="Playback" :default-open="true">
          <PlaybackSection />
        </CollapsibleSection>
        <CollapsibleSection title="Frame" :default-open="true">
          <FrameSettingsSection />
        </CollapsibleSection>
        <CollapsibleSection title="Grid & Snap">
          <GridSnapSection />
        </CollapsibleSection>
      </template>

    </div>

    <div v-if="aiAssistant" class="ai-footer">
      <button
        class="ai-btn"
        :class="{ 'is-active': aiAssistant.isOpen.value }"
        title="Animation Assistant"
        @click="aiAssistant.toggle()"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <span>Assistant</span>
      </button>
    </div>

    <AiAssistantPanel v-if="aiAssistant" />
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
  position: relative;
}

.panel-header {
  display: flex;
  align-items: center;
  height: 2.375rem;
  padding: 0 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-1);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 2rem;
}

.ai-footer {
  padding: 0.375rem 0.5rem;
  border-top: 1px solid var(--border);
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: var(--accent);
  color: var(--text-1);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: color var(--ease), background var(--ease);
  &:hover { color: var(--text-2); background: var(--bg-4); }
  &.is-active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
}
</style>
