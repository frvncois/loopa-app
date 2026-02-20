/**
 * VideoExporter — renders animation frames to canvas and encodes via MediaRecorder.
 */
import type { ExportPayload, VideoExportOptions } from '@/types/export'
import { computeFrame } from '@/lib/engine/AnimationEngine'
import { renderFrameSvg } from '@/lib/render/RenderEngine'

export type VideoFormat = 'webm' | 'mp4'

export interface VideoExportConfig {
  format: VideoFormat
  transparentBackground?: boolean
  onProgress?: (percent: number, frame: number) => void
}

function pickMimeType(format: VideoFormat): string {
  const candidates =
    format === 'mp4'
      ? ['video/mp4; codecs=avc1.42E01E', 'video/mp4']
      : ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm']

  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  // Final fallback
  return 'video/webm'
}

export async function exportVideo(
  payload: ExportPayload,
  config: VideoExportConfig
): Promise<Blob> {
  const { elements, keyframes, artboard, fps, totalFrames, options } = payload
  const opts = options as VideoExportOptions
  const scale  = opts.resolution === '2x' ? 2 : 1
  const width  = artboard.width  * scale
  const height = artboard.height * scale

  const mimeType = pickMimeType(config.format)
  const bitrate  = opts.videoBitrate ?? 8_000_000

  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  // Use manual frame timing for deterministic capture
  const stream = canvas.captureStream(0)
  const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?(): void }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.start()

  const background = config.transparentBackground ? undefined : '#ffffff'

  for (let frame = 0; frame <= totalFrames; frame++) {
    const states = computeFrame(elements, keyframes, frame)

    try {
      await renderFrameSvg(ctx, elements, states, { width, height, scale, background })
    } catch {
      // Fallback: clear to background
      ctx.clearRect(0, 0, width, height)
      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, width, height)
      }
    }

    // Request the video track to capture this frame
    videoTrack.requestFrame?.()

    config.onProgress?.(frame / totalFrames, frame)

    // Yield to allow frame encoding — wait one frame-duration
    await new Promise<void>(r => setTimeout(r, Math.max(1, Math.floor(1000 / fps))))
  }

  // Allow remaining data to flush
  await new Promise<void>(r => setTimeout(r, 250))

  recorder.stop()

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }))
    }
    recorder.onerror = (e) => reject(new Error(String(e)))
  })
}
