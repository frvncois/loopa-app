import type { PlaybackDirection } from './animation'

export interface Frame {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: string
  elements: string[]        // ordered element IDs belonging to this frame
  order: number             // position in frame list
  fps: number               // this frame's framerate (default 24)
  totalFrames: number       // this frame's duration in frames (default 60)
  loop: boolean
  direction: PlaybackDirection
  figmaFileKey?: string       // source Figma file key (set on Figma-imported frames)
  figmaFrameNodeId?: string   // source Figma frame node ID, used for re-fetching on sync
  figmaLastSynced?: number    // timestamp of last successful sync
}
