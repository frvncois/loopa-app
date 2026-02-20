import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import type { AnimatableProps } from '@/types/animation'

type EditorStore = ReturnType<typeof useEditorStore>
type TimelineStore = ReturnType<typeof useTimelineStore>

export function useAnimation(editorStore: EditorStore, timelineStore: TimelineStore) {
  // A reactive token that updates whenever currentFrame changes.
  // Components that call getAnimatedProps() inside a computed() will
  // re-evaluate automatically.
  const frameToken = computed(() => timelineStore.currentFrame)

  function getAnimatedProps(elementId: string): AnimatableProps {
    const _frame = frameToken.value // establish reactive dependency
    const keyframes = editorStore.keyframes.filter(kf => kf.elementId === elementId)
    if (keyframes.length === 0) return {}
    return computeElementAtFrame(keyframes, _frame)
  }

  return { frameToken, getAnimatedProps }
}
