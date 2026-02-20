import type { Element } from './elements'
import type { Keyframe } from './animation'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail: string | null
  artboardWidth: number
  artboardHeight: number
}

export interface ProjectData {
  meta: ProjectMeta
  elements: Element[]
  keyframes: Keyframe[]
  fps: number
  totalFrames: number
}
