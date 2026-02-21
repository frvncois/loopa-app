import type { Element } from './elements'
import type { Keyframe } from './animation'
import type { Frame } from './frame'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail: string | null
  // Denormalized from first frame for dashboard display
  artboardWidth?: number
  artboardHeight?: number
}

export interface ProjectData {
  meta: ProjectMeta
  frames: Frame[]
  elements: Element[]   // ALL elements across all frames (flat)
  keyframes: Keyframe[] // ALL keyframes across all frames
  // Legacy migration fields (present in old saves only)
  fps?: number
  totalFrames?: number
}
