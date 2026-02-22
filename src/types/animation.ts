import type { PathPoint, Element } from './elements'

export type EasingPreset =
  | 'linear'
  | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-cubic' | 'ease-out-cubic' | 'ease-in-out-cubic'
  | 'ease-in-back' | 'ease-out-back' | 'ease-in-out-back'
  | 'ease-out-bounce' | 'ease-out-elastic'
  | 'spring'

export type EasingType = EasingPreset | `steps(${number})` | `cubic-bezier(${number},${number},${number},${number})`

export interface AnimatableProps {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
  rx?: number
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
  fontSize?: number
  blur?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
  shadowOpacity?: number
  shadowColor?: string
  d?: string
  points?: PathPoint[]
  transformOriginX?: number
  transformOriginY?: number
}

export interface Keyframe {
  id: string
  elementId: string
  frame: number
  props: AnimatableProps
  easing: EasingType
  easingCurve?: { x1: number; y1: number; x2: number; y2: number }
}

export interface ComputedElementState {
  elementId: string
  props: Required<AnimatableProps>
}

export type PlaybackDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'

export interface AnimationPreset {
  id: string
  label: string
  icon: unknown
  apply: (element: Element, startFrame: number, durationFrames: number, easing: EasingType) => Keyframe[]
}
