import type { Element } from './elements'
import type { Keyframe } from './animation'

export interface ClipboardData {
  elements: Element[]
  keyframes: Keyframe[]
  sourceProjectId: string
  timestamp: number
}
