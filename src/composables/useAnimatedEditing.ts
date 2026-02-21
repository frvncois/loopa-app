import { computed } from 'vue'
import type { useEditorStore } from '@/stores/editorStore'
import type { useUiStore } from '@/stores/uiStore'
import type { useTimelineStore } from '@/stores/timelineStore'
import { computeElementAtFrame } from '@/lib/engine/AnimationEngine'
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { generateId } from '@/lib/utils/id'

type EditorStore = ReturnType<typeof useEditorStore>
type UiStore = ReturnType<typeof useUiStore>
type TimelineStore = ReturnType<typeof useTimelineStore>

export function useAnimatedEditing(
  editorStore: EditorStore,
  uiStore: UiStore,
  timelineStore: TimelineStore
) {
  // Reactive map of elementId → animated props at current frame
  const animatedPropsMap = computed(() => {
    const frame = timelineStore.currentFrame
    const frameId = uiStore.activeFrameId
    const map = new Map<string, AnimatableProps>()
    if (!frameId) return map

    const keyframes = editorStore.getKeyframesForFrame(frameId)
    const elements = editorStore.getElementsForFrame(frameId)
    for (const el of elements) {
      const elKfs = keyframes.filter(kf => kf.elementId === el.id)
      if (elKfs.length > 0) {
        map.set(el.id, computeElementAtFrame(elKfs, frame))
      }
    }
    return map
  })

  // Get the effective element at the current frame — base merged with animated props
  function getAnimatedElement(id: string): Element | null {
    const base = editorStore.getElementById(id)
    if (!base) return null
    const anim = animatedPropsMap.value.get(id)
    if (!anim) return base
    return { ...base, ...anim } as Element
  }

  // Animation-aware write
  // Rule 1: No keyframes → write to base element
  // Rule 2: Playhead ON a keyframe → update that keyframe's props
  // Rule 3: Playhead BETWEEN keyframes → create new keyframe with interpolated + new values
  function setAnimatedProperty(elementId: string, props: Partial<AnimatableProps>): void {
    const frameId = uiStore.activeFrameId
    if (!frameId) {
      editorStore.updateElement(elementId, props)
      return
    }

    const frame = timelineStore.currentFrame
    const keyframes = editorStore.getKeyframesForFrame(frameId).filter(
      kf => kf.elementId === elementId
    )

    // Rule 1: No keyframes
    if (keyframes.length === 0) {
      // Convert flat transformOriginX/Y → nested transformOrigin on base element
      const { transformOriginX, transformOriginY, ...rest } = props as any
      const baseUpdates: any = { ...rest }
      if (transformOriginX !== undefined || transformOriginY !== undefined) {
        const el = editorStore.getElementById(elementId)
        const cur = (el as any)?.transformOrigin ?? { x: 0.5, y: 0.5 }
        baseUpdates.transformOrigin = {
          x: transformOriginX ?? cur.x,
          y: transformOriginY ?? cur.y,
        }
      }
      editorStore.updateElement(elementId, baseUpdates)
      return
    }

    // Rule 2: Playhead exactly on a keyframe
    const exactKf = keyframes.find(kf => kf.frame === frame)
    if (exactKf) {
      editorStore.updateKeyframe(exactKf.id, { props: { ...exactKf.props, ...props } })
      return
    }

    // Rule 3: Between keyframes — create new keyframe with interpolated state + new delta
    const animatedProps = animatedPropsMap.value.get(elementId) ?? {}
    const newKfProps: AnimatableProps = { ...animatedProps, ...props }
    editorStore.addKeyframe({
      id: generateId('kf'),
      elementId,
      frame,
      props: newKfProps,
      easing: 'ease-out',
    })
  }

  return { animatedPropsMap, getAnimatedElement, setAnimatedProperty }
}
