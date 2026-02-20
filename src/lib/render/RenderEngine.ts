/**
 * RenderEngine — two strategies for drawing a frame to a Canvas 2D context.
 *
 * Strategy A: SVG serialize → Blob → ObjectURL → HTMLImageElement → drawImage
 *   Pixel-perfect, async, same output as browser SVG rendering.
 *
 * Strategy B: CanvasDrawers direct draw, sync, faster but may differ slightly.
 */
import type { Element } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { serializeFrame } from './SvgSerializer'
import { drawElement } from './CanvasDrawers'

export interface RenderOptions {
  width: number
  height: number
  scale: number
  background?: string   // CSS color, e.g. '#ffffff'. undefined = transparent
}

/**
 * Strategy A: SVG → Image → drawImage.
 * Returns a Promise that resolves when the frame has been drawn.
 */
export async function renderFrameSvg(
  ctx: CanvasRenderingContext2D,
  elements: Element[],
  states: Map<string, AnimatableProps>,
  options: RenderOptions
): Promise<void> {
  const { width, height, scale, background } = options

  ctx.clearRect(0, 0, width * scale, height * scale)

  const svgStr = serializeFrame(
    elements,
    states,
    { width, height },
    background
  )

  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width * scale, height * scale)
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG image failed to load'))
    }
    img.src = url
  })
}

/**
 * Strategy B: Direct Canvas2D drawing.
 * Synchronous — faster for video export.
 */
export function renderFrameDirect(
  ctx: CanvasRenderingContext2D,
  elements: Element[],
  states: Map<string, AnimatableProps>,
  options: RenderOptions
): void {
  const { width, height, scale, background } = options

  ctx.save()
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, width, height)

  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }

  for (const el of elements) {
    if (!el.visible) continue
    drawElement(ctx, el, states.get(el.id) ?? {})
  }

  ctx.restore()
}
