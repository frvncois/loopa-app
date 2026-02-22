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

  // Get the effective element at the current frame — base merged with animated props.
  // Flat animated props (fillColor, strokeColor, etc.) are converted back to nested
  // fills/strokes/shadows so downstream consumers see the standard element structure.
  function getAnimatedElement(id: string): Element | null {
    const base = editorStore.getElementById(id)
    if (!base) return null
    const anim = animatedPropsMap.value.get(id)
    if (!anim) return base
    const merged: any = { ...base, ...anim }

    // fillColor / fillOpacity → fills[0]
    if (anim.fillColor !== undefined || anim.fillOpacity !== undefined) {
      const fills = [...(base.fills ?? [])]
      const f0 = fills[0] ? { ...fills[0] } : { type: 'solid', color: '000000', opacity: 1, visible: true }
      if (anim.fillColor !== undefined) f0.color = anim.fillColor
      if (anim.fillOpacity !== undefined) f0.opacity = anim.fillOpacity
      fills[0] = f0
      merged.fills = fills
      delete merged.fillColor
      delete merged.fillOpacity
    }

    // strokeColor / strokeWidth → strokes[0]
    if (anim.strokeColor !== undefined || anim.strokeWidth !== undefined) {
      const strokes = [...(base.strokes ?? [])]
      const s0 = strokes[0] ? { ...strokes[0] } : { color: '000000', width: 1, visible: true, position: 'center' }
      if (anim.strokeColor !== undefined) s0.color = anim.strokeColor
      if (anim.strokeWidth !== undefined) s0.width = anim.strokeWidth
      strokes[0] = s0
      merged.strokes = strokes
      delete merged.strokeColor
      delete merged.strokeWidth
    }

    // shadow props → shadows[0]
    const { shadowOffsetX, shadowOffsetY, shadowBlur, shadowOpacity, shadowColor } = anim
    if (shadowOffsetX !== undefined || shadowOffsetY !== undefined || shadowBlur !== undefined || shadowOpacity !== undefined || shadowColor !== undefined) {
      const shadows = [...(base.shadows ?? [])]
      const sh0 = shadows[0] ? { ...shadows[0] } : { x: 0, y: 4, blur: 8, opacity: 0.3, color: '000000', visible: true }
      if (shadowOffsetX !== undefined) sh0.x = shadowOffsetX
      if (shadowOffsetY !== undefined) sh0.y = shadowOffsetY
      if (shadowBlur !== undefined) sh0.blur = shadowBlur
      if (shadowOpacity !== undefined) sh0.opacity = shadowOpacity
      if (shadowColor !== undefined) sh0.color = shadowColor
      shadows[0] = sh0
      merged.shadows = shadows
      delete merged.shadowOffsetX
      delete merged.shadowOffsetY
      delete merged.shadowBlur
      delete merged.shadowOpacity
      delete merged.shadowColor
    }

    return merged as Element
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

    const frame = Math.round(timelineStore.currentFrame)
    const keyframes = editorStore.getKeyframesForFrame(frameId).filter(
      kf => kf.elementId === elementId
    )

    // Rule 1: No keyframes → write directly to base element (converting flat props → nested)
    if (keyframes.length === 0) {
      const {
        transformOriginX, transformOriginY,
        fillColor, fillOpacity,
        strokeColor, strokeWidth,
        shadowOffsetX, shadowOffsetY, shadowBlur, shadowOpacity, shadowColor,
        blur,
        ...rest
      } = props as any
      const baseUpdates: any = { ...rest }
      const el = editorStore.getElementById(elementId)

      if (transformOriginX !== undefined || transformOriginY !== undefined) {
        const cur = (el as any)?.transformOrigin ?? { x: 0.5, y: 0.5 }
        baseUpdates.transformOrigin = { x: transformOriginX ?? cur.x, y: transformOriginY ?? cur.y }
      }

      if (fillColor !== undefined || fillOpacity !== undefined) {
        const fills = [...(el?.fills ?? [])]
        const f0 = fills[0] ? { ...fills[0] } : { type: 'solid', color: '000000', opacity: 1, visible: true }
        if (fillColor !== undefined) f0.color = fillColor
        if (fillOpacity !== undefined) f0.opacity = fillOpacity
        fills[0] = f0
        baseUpdates.fills = fills
      }

      if (strokeColor !== undefined || strokeWidth !== undefined) {
        const strokes = [...(el?.strokes ?? [])]
        const s0 = strokes[0] ? { ...strokes[0] } : { color: '000000', width: 1, visible: true, position: 'center' }
        if (strokeColor !== undefined) s0.color = strokeColor
        if (strokeWidth !== undefined) s0.width = strokeWidth
        strokes[0] = s0
        baseUpdates.strokes = strokes
      }

      if (shadowOffsetX !== undefined || shadowOffsetY !== undefined || shadowBlur !== undefined || shadowOpacity !== undefined || shadowColor !== undefined) {
        const shadows = [...(el?.shadows ?? [])]
        const sh0 = shadows[0] ? { ...shadows[0] } : { x: 0, y: 4, blur: 8, opacity: 0.3, color: '000000', visible: true }
        if (shadowOffsetX !== undefined) sh0.x = shadowOffsetX
        if (shadowOffsetY !== undefined) sh0.y = shadowOffsetY
        if (shadowBlur !== undefined) sh0.blur = shadowBlur
        if (shadowOpacity !== undefined) sh0.opacity = shadowOpacity
        if (shadowColor !== undefined) sh0.color = shadowColor
        shadows[0] = sh0
        baseUpdates.shadows = shadows
      }

      if (blur !== undefined) baseUpdates.blur = blur

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
