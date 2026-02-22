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
    const newIds: string[] = []
    for (const id of uiStore.selectedIds) {
      const el = editorStore.getElementById(id)
      if (!el) continue
      const kfId = generateId('kf')
      newIds.push(kfId)
      editorStore.addKeyframe({
        id: kfId,
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
          blur: el.blur,
          transformOriginX: (el as any).transformOrigin?.x ?? 0.5,
          transformOriginY: (el as any).transformOrigin?.y ?? 0.5,
          ...(el.fills[0]?.visible ? { fillColor: el.fills[0].color, fillOpacity: el.fills[0].opacity } : {}),
          ...(el.strokes[0]?.visible ? { strokeColor: el.strokes[0].color, strokeWidth: el.strokes[0].width } : {}),
          ...(el.type === 'text' ? { fontSize: (el as any).fontSize } : {}),
          ...(el.type === 'rect' ? { rx: (el as any).rx ?? 0 } : {}),
        },
        easing: 'ease-out',
      })
    }
    if (newIds.length > 0) uiStore.selectKeyframes(newIds)
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
