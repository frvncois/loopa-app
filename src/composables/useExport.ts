import { reactive } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { SvgExporter } from '@/lib/exporters/SvgExporter'
import { LottieExporter } from '@/lib/exporters/LottieExporter'
import { exportVideo } from '@/lib/exporters/VideoExporter'
import { exportWebm } from '@/lib/exporters/WebmExporter'
import type {
  ExportPayload, ExportProgress,
  LottieExportOptions, VideoExportOptions, SvgExportOptions
} from '@/types/export'

export function useExport() {
  const editor   = useEditorStore()
  const ui       = useUiStore()
  const timeline = useTimelineStore()

  const progress = reactive<ExportProgress>({
    phase: 'preparing',
    currentFrame: 0,
    totalFrames: 0,
    percent: 0,
  })

  function makePayload(options: ExportPayload['options']): ExportPayload {
    return {
      elements: editor.elements,
      keyframes: editor.keyframes,
      artboard: {
        width:  editor.elements.length ? 800 : 800,   // fallback; real value from ProjectView
        height: 600,
      },
      fps: timeline.fps,
      totalFrames: timeline.totalFrames,
      options,
    }
  }

  function makePayloadWithArtboard(
    options: ExportPayload['options'],
    artboard: { width: number; height: number }
  ): ExportPayload {
    const frameId = ui.activeFrameId
    const elements = frameId ? editor.getElementsForFrame(frameId) : editor.elements
    const keyframes = frameId ? editor.getKeyframesForFrame(frameId) : editor.keyframes
    return {
      elements,
      keyframes,
      artboard,
      fps: timeline.fps,
      totalFrames: timeline.totalFrames,
      options,
    }
  }

  async function exportLottie(
    opts: Omit<LottieExportOptions, 'format'>,
    artboard: { width: number; height: number }
  ): Promise<string> {
    progress.phase = 'preparing'
    progress.percent = 0
    const payload = makePayloadWithArtboard({ ...opts, format: 'lottie' }, artboard)
    const result = await LottieExporter.export(payload)
    progress.phase = 'complete'
    progress.percent = 100
    return result as string
  }

  async function exportSvg(
    opts: Omit<SvgExportOptions, 'format'>,
    artboard: { width: number; height: number }
  ): Promise<string> {
    progress.phase = 'preparing'
    progress.percent = 0
    const payload = makePayloadWithArtboard({ ...opts, format: 'svg' }, artboard)
    const result = await SvgExporter.export(payload)
    progress.phase = 'complete'
    progress.percent = 100
    return result as string
  }

  async function exportVideoFile(
    opts: Omit<VideoExportOptions, 'format'>,
    artboard: { width: number; height: number }
  ): Promise<Blob> {
    progress.phase = 'preparing'
    progress.currentFrame = 0
    progress.totalFrames  = timeline.totalFrames
    progress.percent = 0

    const payload = makePayloadWithArtboard(
      { ...opts, format: 'mp4' },
      artboard
    )

    progress.phase = 'rendering'
    const blob = await exportVideo(payload, {
      format: 'mp4',
      transparentBackground: opts.transparentBackground,
      onProgress: (pct, frame) => {
        progress.currentFrame = frame
        progress.percent = Math.round(pct * 100)
      },
    })

    progress.phase = 'complete'
    progress.percent = 100
    return blob
  }

  async function exportWebmFile(
    opts: Omit<VideoExportOptions, 'format'>,
    artboard: { width: number; height: number }
  ): Promise<Blob> {
    progress.phase = 'preparing'
    progress.currentFrame = 0
    progress.totalFrames  = timeline.totalFrames
    progress.percent = 0

    const payload = makePayloadWithArtboard(
      { ...opts, format: 'webm' },
      artboard
    )

    progress.phase = 'rendering'
    const blob = await exportWebm(payload, opts.transparentBackground, (pct, frame) => {
      progress.currentFrame = frame
      progress.percent = Math.round(pct * 100)
    })

    progress.phase = 'complete'
    progress.percent = 100
    return blob
  }

  function download(blob: Blob | string, filename: string): void {
    const url = typeof blob === 'string'
      ? `data:text/plain;charset=utf-8,${encodeURIComponent(blob)}`
      : URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    if (typeof blob !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
  }

  async function copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
  }

  function getAvailableFormats(): { mp4: boolean; webm: boolean } {
    if (typeof MediaRecorder === 'undefined') return { mp4: false, webm: false }
    return {
      mp4:  MediaRecorder.isTypeSupported('video/mp4') ||
            MediaRecorder.isTypeSupported('video/mp4; codecs=avc1.42E01E'),
      webm: MediaRecorder.isTypeSupported('video/webm') ||
            MediaRecorder.isTypeSupported('video/webm; codecs=vp9'),
    }
  }

  function resetProgress(): void {
    progress.phase = 'preparing'
    progress.currentFrame = 0
    progress.totalFrames = 0
    progress.percent = 0
    delete progress.error
  }

  return {
    progress,
    exportLottie,
    exportSvg,
    exportVideoFile,
    exportWebmFile,
    download,
    copyToClipboard,
    getAvailableFormats,
    resetProgress,
  }
}
