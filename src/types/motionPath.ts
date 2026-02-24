import type { EasingType } from './animation'

export interface MotionPathPoint {
  x: number
  y: number
  handleIn: { x: number; y: number }
  handleOut: { x: number; y: number }
  type: 'smooth' | 'corner' | 'symmetric'
}

export interface MotionPath {
  id: string
  elementId: string      // element that follows this path
  d: string              // SVG path d attribute (derived from points)
  points: MotionPathPoint[]
  startFrame: number
  endFrame: number
  easing: EasingType
  easingCurve: { x1: number; y1: number; x2: number; y2: number }
  orientToPath: boolean  // auto-rotate element to face path direction
  loop: boolean          // repeat along path after endFrame
}
