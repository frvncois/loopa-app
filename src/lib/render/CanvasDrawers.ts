/**
 * Canvas 2D drawing utilities — fallback renderer if SVG→Image is unavailable.
 * Pure TypeScript, no Vue.
 */
import type { Element, RectElement, EllipseElement, PolygonElement, StarElement, TextElement, PathElement } from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { hexToRgb } from '@/lib/utils/color'

function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function setupContext(
  ctx: CanvasRenderingContext2D,
  el: Element,
  anim: AnimatableProps,
  cx: number,
  cy: number
): void {
  const rotation = anim.rotation ?? el.rotation
  const sx = (anim.scaleX ?? el.scaleX) * (el.flipX ? -1 : 1)
  const sy = (anim.scaleY ?? el.scaleY) * (el.flipY ? -1 : 1)
  ctx.translate(cx, cy)
  if (rotation) ctx.rotate((rotation * Math.PI) / 180)
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
  ctx.translate(-cx, -cy)
}

function applyFillStroke(
  ctx: CanvasRenderingContext2D,
  el: Element,
  anim: AnimatableProps
): void {
  // Shadow
  const shadow = el.shadows.find(s => s.visible)
  if (shadow) {
    const { r, g, b } = hexToRgb(shadow.color)
    ctx.shadowColor = `rgba(${r},${g},${b},${shadow.opacity})`
    ctx.shadowOffsetX = shadow.x
    ctx.shadowOffsetY = shadow.y
    ctx.shadowBlur = shadow.blur
  }

  // Fill
  const fills = el.fills.filter(f => f.visible && f.type !== 'none')
  if (fills.length > 0) {
    const fillColor = anim.fillColor ?? fills[0].color
    ctx.fillStyle = hexWithAlpha(fillColor, fills[0].opacity)
    ctx.fill()
  }

  // Reset shadow before stroke so stroke doesn't also get shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.shadowBlur = 0

  // Stroke
  const strokes = el.strokes.filter(s => s.visible)
  if (strokes.length > 0) {
    const s = strokes[0]
    const strokeColor = anim.strokeColor ?? s.color
    const strokeWidth = anim.strokeWidth ?? s.width
    ctx.strokeStyle = `#${strokeColor}`
    ctx.lineWidth = strokeWidth
    ctx.lineCap = s.cap
    ctx.lineJoin = s.join
    if (s.dashArray.length) ctx.setLineDash(s.dashArray)
    ctx.lineDashOffset = s.dashOffset
    ctx.stroke()
  }
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: Element,
  anim: AnimatableProps
): void {
  if (!el.visible) return

  const x = anim.x      ?? el.x
  const y = anim.y      ?? el.y
  const w = anim.width  ?? el.width
  const h = anim.height ?? el.height
  const opacity = anim.opacity ?? el.opacity
  const cx = x + w / 2
  const cy = y + h / 2

  ctx.save()
  ctx.globalAlpha = opacity
  if (el.blendMode !== 'normal') {
    ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation
  }

  setupContext(ctx, el, anim, cx, cy)

  switch (el.type) {
    case 'rect': {
      const rx = anim.rx ?? (el as RectElement).rx
      ctx.beginPath()
      if (rx > 0 && ctx.roundRect) {
        ctx.roundRect(x, y, w, h, rx)
      } else {
        ctx.rect(x, y, w, h)
      }
      applyFillStroke(ctx, el, anim)
      break
    }

    case 'circle': {
      const r = Math.min(w, h) / 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      applyFillStroke(ctx, el, anim)
      break
    }

    case 'ellipse': {
      const e = el as EllipseElement
      void e
      ctx.beginPath()
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
      applyFillStroke(ctx, el, anim)
      break
    }

    case 'line': {
      const strokes = el.strokes.filter(s => s.visible)
      const fills = el.fills.filter(f => f.visible)
      ctx.beginPath()
      ctx.moveTo(x, y + h / 2)
      ctx.lineTo(x + w, y + h / 2)
      const sc = strokes.length ? (anim.strokeColor ?? strokes[0].color) : (fills[0]?.color ?? '000000')
      const sw = strokes.length ? (anim.strokeWidth ?? strokes[0].width) : 2
      ctx.strokeStyle = `#${sc}`
      ctx.lineWidth = sw
      ctx.lineCap = 'round'
      ctx.stroke()
      break
    }

    case 'polygon': {
      const sides = (el as PolygonElement).sides ?? 6
      const r = Math.min(w, h) / 2
      ctx.beginPath()
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides - Math.PI / 2
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      applyFillStroke(ctx, el, anim)
      break
    }

    case 'star': {
      const e = el as StarElement
      const n = e.starPoints ?? 5
      const outerR = Math.min(w, h) / 2
      const innerR = outerR * (e.innerRadius ?? 0.4)
      ctx.beginPath()
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR
        const a = (i * Math.PI) / n - Math.PI / 2
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      applyFillStroke(ctx, el, anim)
      break
    }

    case 'text': {
      const e = el as TextElement
      const fs = anim.fontSize ?? e.fontSize
      const fills = el.fills.filter(f => f.visible)
      const fc = fills.length ? (anim.fillColor ?? fills[0].color) : '000000'
      ctx.font = `${e.fontWeight} ${fs}px ${e.fontFamily}`
      ctx.fillStyle = hexWithAlpha(fc, fills[0]?.opacity ?? 1)
      ctx.textAlign = e.textAlign as CanvasTextAlign
      ctx.textBaseline = 'top'
      ctx.fillText(e.text, x, y)
      break
    }

    case 'path': {
      const e = el as PathElement
      const d = anim.d ?? e.d
      if (!d) break
      const path2d = new Path2D(d)
      applyFillStroke(ctx, el, anim)
      if (el.fills.some(f => f.visible)) ctx.fill(path2d)
      if (el.strokes.some(s => s.visible)) ctx.stroke(path2d)
      break
    }
  }

  ctx.restore()
}
