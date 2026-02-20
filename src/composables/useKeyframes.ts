import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import type { EasingType, Keyframe } from '@/types/animation'
import { generateId } from '@/lib/utils/id'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type TimelineStore = ReturnType<typeof useTimelineStore>

export function useKeyframes(
  editorStore: EditorStore,
  uiStore: UiStore,
  timelineStore: TimelineStore
) {
  /** Record current element state as a keyframe at currentFrame for all selected elements */
  function addKeyframeForSelected(): void {
    const frame = timelineStore.currentFrame
    for (const id of uiStore.selectedIds) {
      const el = editorStore.getElementById(id)
      if (!el) continue
      editorStore.addKeyframe({
        id: generateId('kf'),
        elementId: id,
        frame,
        props: {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          scaleX: el.scaleX,
          scaleY: el.scaleY,
          opacity: el.opacity,
        },
        easing: 'ease-out',
      })
    }
  }

  function removeKeyframe(id: string): void {
    editorStore.deleteKeyframe(id)
  }

  function updateKeyframeEasing(id: string, easing: EasingType): void {
    editorStore.updateKeyframe(id, { easing })
  }

  function updateKeyframeProps(id: string, props: Keyframe['props']): void {
    editorStore.updateKeyframe(id, { props })
  }

  function getKeyframesForElement(elementId: string): Keyframe[] {
    return editorStore.keyframes
      .filter(kf => kf.elementId === elementId)
      .sort((a, b) => a.frame - b.frame)
  }

  return {
    addKeyframeForSelected,
    removeKeyframe,
    updateKeyframeEasing,
    updateKeyframeProps,
    getKeyframesForElement,
  }
}
