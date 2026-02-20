import type { Element } from './elements'
import type { Keyframe } from './animation'

export type ExportFormat = 'lottie' | 'mp4' | 'webm' | 'svg'

export interface ExportPayload {
  elements: Element[]
  keyframes: Keyframe[]
  artboard: { width: number; height: number }
  fps: number
  totalFrames: number
  options: ExportOptions
}

export interface LottieExportOptions {
  format: 'lottie'
  loop: boolean
  prettyPrint: boolean
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm'
  resolution: '1x' | '2x'
  quality: number
  transparentBackground: boolean
  videoBitrate: number
  loop: boolean
}

export interface SvgExportOptions {
  format: 'svg'
  animated: boolean
  loop: boolean
}

export type ExportOptions = LottieExportOptions | VideoExportOptions | SvgExportOptions

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error'
  currentFrame: number
  totalFrames: number
  percent: number
  error?: string
}

export interface ImportResult {
  elements: any[]
  warnings: ImportWarning[]
  metadata: { sourceWidth: number; sourceHeight: number; layerCount: number; isFigmaExport: boolean }
}

export interface ImportWarning {
  type: string
  message: string
}
