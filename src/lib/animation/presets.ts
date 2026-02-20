import type { Component } from 'vue'
import type { Keyframe, EasingType } from '@/types/animation'
import type { Element } from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import IconFadeIn from '@/components/icons/IconFadeIn.vue'
import IconFadeOut from '@/components/icons/IconFadeOut.vue'
import IconSlideRight from '@/components/icons/IconSlideRight.vue'
import IconSlideUp from '@/components/icons/IconSlideUp.vue'
import IconScaleIn from '@/components/icons/IconScaleIn.vue'
import IconBounce from '@/components/icons/IconBounce.vue'
import IconSpinCw from '@/components/icons/IconSpinCw.vue'
import IconPulse from '@/components/icons/IconPulse.vue'

export interface PresetDef {
  id: string
  label: string
  icon: Component
  apply: (element: Element, startFrame: number, durationFrames: number, easing: EasingType) => Keyframe[]
}

function kf(elementId: string, frame: number, props: Keyframe['props'], easing: EasingType): Keyframe {
  return { id: generateId('kf'), elementId, frame, props, easing }
}

export const ANIMATION_PRESETS: PresetDef[] = [
  {
    id: 'fade-in',
    label: 'Fade In',
    icon: IconFadeIn,
    apply: (el, s, d, e) => [
      kf(el.id, s, { opacity: 0 }, e),
      kf(el.id, s + d, { opacity: el.opacity }, e),
    ],
  },
  {
    id: 'fade-out',
    label: 'Fade Out',
    icon: IconFadeOut,
    apply: (el, s, d, e) => [
      kf(el.id, s, { opacity: el.opacity }, e),
      kf(el.id, s + d, { opacity: 0 }, e),
    ],
  },
  {
    id: 'slide-right',
    label: 'Slide Right',
    icon: IconSlideRight,
    apply: (el, s, d, e) => [
      kf(el.id, s, { x: el.x - 80, opacity: 0 }, e),
      kf(el.id, s + d, { x: el.x, opacity: 1 }, e),
    ],
  },
  {
    id: 'slide-up',
    label: 'Slide Up',
    icon: IconSlideUp,
    apply: (el, s, d, e) => [
      kf(el.id, s, { y: el.y + 80, opacity: 0 }, e),
      kf(el.id, s + d, { y: el.y, opacity: 1 }, e),
    ],
  },
  {
    id: 'scale-in',
    label: 'Scale In',
    icon: IconScaleIn,
    apply: (el, s, d, _e) => [
      kf(el.id, s, { scaleX: 0, scaleY: 0, opacity: 0 }, 'ease-out-back'),
      kf(el.id, s + d, { scaleX: 1, scaleY: 1, opacity: 1 }, 'ease-out-back'),
    ],
  },
  {
    id: 'bounce',
    label: 'Bounce',
    icon: IconBounce,
    apply: (el, s, d, _e) => [
      kf(el.id, s, { y: el.y - 40 }, 'ease-out-bounce'),
      kf(el.id, s + d, { y: el.y }, 'ease-out-bounce'),
    ],
  },
  {
    id: 'spin-cw',
    label: 'Spin CW',
    icon: IconSpinCw,
    apply: (el, s, d, _e) => [
      kf(el.id, s, { rotation: 0 }, 'linear'),
      kf(el.id, s + d, { rotation: 360 }, 'linear'),
    ],
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: IconPulse,
    apply: (el, s, d, e) => {
      const half = Math.floor(d / 2)
      return [
        kf(el.id, s, { scaleX: 1, scaleY: 1 }, e),
        kf(el.id, s + half, { scaleX: 1.15, scaleY: 1.15 }, e),
        kf(el.id, s + d, { scaleX: 1, scaleY: 1 }, e),
      ]
    },
  },
]
