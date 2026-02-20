import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { computeFrame } from '@/lib/engine/AnimationEngine'
import type { AnimatableProps } from '@/types/animation'

export interface OnionFrame {
  frame: number
  opacity: number
  tint: string              // hex without '#'
  states: Map<string, AnimatableProps>
}

export function useOnionSkin() {
  const editor = useEditorStore()
  const ui = useUiStore()
  const timeline = useTimelineStore()

  const onionFrames = computed((): OnionFrame[] => {
    const s = ui.onionSkin
    if (!s.enabled) return []

    const cur = timeline.currentFrame
    const { framesBefore, framesAfter, opacityBefore, opacityAfter,
            colorBefore, colorAfter, interval, scope } = s

    // Which elements to ghost
    const elems = scope === 'selected' && ui.selectedIds.size > 0
      ? editor.elements.filter(el => ui.selectedIds.has(el.id))
      : editor.elements

    const frames: OnionFrame[] = []

    // Before frames (rendered closest→farthest, so unshift in loop)
    const beforeCount = Math.max(framesBefore, 1)
    for (let i = 1; i <= beforeCount; i++) {
      const frame = cur - i * interval
      if (frame < 0) continue
      // i=1 is closest → opacity = full, i=beforeCount is farthest → opacity * 0.3
      const t = (i - 1) / Math.max(beforeCount - 1, 1)
      const opacity = opacityBefore * (1 - 0.7 * t)
      const states = computeFrame(elems, editor.keyframes, frame)
      frames.unshift({ frame, opacity, tint: colorBefore, states })
    }

    // After frames
    const afterCount = Math.max(framesAfter, 1)
    for (let i = 1; i <= afterCount; i++) {
      const frame = cur + i * interval
      if (frame > timeline.totalFrames) continue
      const t = (i - 1) / Math.max(afterCount - 1, 1)
      const opacity = opacityAfter * (1 - 0.7 * t)
      const states = computeFrame(elems, editor.keyframes, frame)
      frames.push({ frame, opacity, tint: colorAfter, states })
    }

    return frames
  })

  return { onionFrames }
}
