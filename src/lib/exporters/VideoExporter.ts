/**
 * VideoExporter — renders animation frames to canvas and encodes via MediaRecorder.
 * Video elements are drawn directly via HTMLVideoElement.drawImage after each SVG frame.
 */
import type { ExportPayload, VideoExportOptions } from '@/types/export'
import type { VideoElement } from '@/types/elements'
import { computeFrame } from '@/lib/engine/AnimationEngine'
import { renderFrameSvg } from '@/lib/render/RenderEngine'
import { getVideo } from '@/lib/utils/videoStorage'

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
  return 'video/webm'
}

interface LoadedVideo {
  el: VideoElement
  video: HTMLVideoElement
  blobUrl: string
}

async function loadVideoElement(el: VideoElement): Promise<LoadedVideo | null> {
  try {
    const blob = await getVideo(el.videoStorageId)
    if (!blob) return null
    const blobUrl = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.src = blobUrl
    video.muted = true
    video.preload = 'auto'
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => resolve()
      video.load()
    })
    return { el, video, blobUrl }
  } catch {
    return null
  }
}

function seekAndWait(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.04) { resolve(); return }
    const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve() }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
    setTimeout(resolve, 500) // fallback
  })
}

function drawVideoOnCanvas(
  ctx: CanvasRenderingContext2D,
  loaded: LoadedVideo,
  scale: number
) {
  const { el, video } = loaded
  ctx.save()
  ctx.globalAlpha = el.opacity

  const dx = el.x * scale
  const dy = el.y * scale
  const dw = el.width * scale
  const dh = el.height * scale

  if (el.rotation) {
    const cx = dx + dw / 2
    const cy = dy + dh / 2
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }

  const fit = el.fit ?? 'contain'
  const vw = video.videoWidth || el.naturalWidth || el.width
  const vh = video.videoHeight || el.naturalHeight || el.height
  const vAspect = vw / vh
  const dAspect = dw / dh

  if (fit === 'fill') {
    ctx.drawImage(video, dx, dy, dw, dh)
  } else if (fit === 'cover') {
    let sw = vw, sh = vh, sx = 0, sy = 0
    if (vAspect > dAspect) {
      sw = Math.round(vh * dAspect)
      sx = Math.round((vw - sw) / 2)
    } else {
      sh = Math.round(vw / dAspect)
      sy = Math.round((vh - sh) / 2)
    }
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)
  } else {
    // contain
    let rw = dw, rh = dh, rx = dx, ry = dy
    if (vAspect > dAspect) {
      rh = dw / vAspect
      ry = dy + (dh - rh) / 2
    } else {
      rw = dh * vAspect
      rx = dx + (dw - rw) / 2
    }
    ctx.drawImage(video, rx, ry, rw, rh)
  }

  ctx.restore()
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

  // Pre-load all video elements
  const videoElements = elements.filter(el => el.type === 'video') as VideoElement[]
  const loadedVideos: LoadedVideo[] = []
  for (const el of videoElements) {
    const loaded = await loadVideoElement(el)
    if (loaded) loadedVideos.push(loaded)
  }

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
      ctx.clearRect(0, 0, width, height)
      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, width, height)
      }
    }

    // Composite video elements on top
    for (const loaded of loadedVideos) {
      const time = loaded.el.trimStart + (frame / fps) * loaded.el.playbackRate
      const clamped = Math.max(loaded.el.trimStart, Math.min(loaded.el.trimEnd, time))
      await seekAndWait(loaded.video, clamped)
      drawVideoOnCanvas(ctx, loaded, scale)
    }

    videoTrack.requestFrame?.()
    config.onProgress?.(frame / totalFrames, frame)
    await new Promise<void>(r => setTimeout(r, Math.max(1, Math.floor(1000 / fps))))
  }

  await new Promise<void>(r => setTimeout(r, 250))
  recorder.stop()

  // Cleanup blob URLs
  for (const loaded of loadedVideos) URL.revokeObjectURL(loaded.blobUrl)

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }))
    }
    recorder.onerror = (e) => reject(new Error(String(e)))
  })
}
