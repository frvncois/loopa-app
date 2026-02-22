/**
 * Serialize a scene to a self-contained SVG string for one frame.
 * Used by SvgExporter (static) and RenderEngine (video frame capture).
 * Pure TypeScript — no Vue, no DOM.
 */
import type {
  Element, RectElement, EllipseElement, PolygonElement,
  StarElement, TextElement, PathElement, GroupElement, ImageElement
} from '@/types/elements'
import type { AnimatableProps } from '@/types/animation'
import { hexToRgb } from '@/lib/utils/color'

// ── Helpers ──────────────────────────────────────────────────────────────────

function r(n: number) { return Math.round(n * 1000) / 1000 }

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getFill(el: Element, anim: AnimatableProps) {
  const fills = el.fills.filter(f => f.visible && f.type !== 'none')
  if (!fills.length) return { color: 'none', opacity: 1 }
  const color = anim.fillColor ? `#${anim.fillColor}` : `#${fills[0].color}`
  return { color, opacity: fills[0].opacity }
}

function getStroke(el: Element, anim: AnimatableProps) {
  const strokes = el.strokes.filter(s => s.visible)
  if (!strokes.length) return null
  const s = strokes[0]
  return {
    color: anim.strokeColor ? `#${anim.strokeColor}` : `#${s.color}`,
    width: anim.strokeWidth ?? s.width,
    cap: s.cap,
    join: s.join,
    dashArray: s.dashArray,
    dashOffset: s.dashOffset,
  }
}

function fillStroke(el: Element, anim: AnimatableProps): string {
  const fill = getFill(el, anim)
  const stroke = getStroke(el, anim)
  let s = `fill="${fill.color}"`
  if (fill.opacity !== 1) s += ` fill-opacity="${r(fill.opacity)}"`
  if (stroke) {
    s += ` stroke="${stroke.color}" stroke-width="${r(stroke.width)}"`
    if (stroke.cap !== 'butt') s += ` stroke-linecap="${stroke.cap}"`
    if (stroke.join !== 'miter') s += ` stroke-linejoin="${stroke.join}"`
    if (stroke.dashArray.length) s += ` stroke-dasharray="${stroke.dashArray.join(' ')}"`
    if (stroke.dashOffset) s += ` stroke-dashoffset="${stroke.dashOffset}"`
  } else {
    s += ` stroke="none"`
  }
  return s
}

function makeTransform(el: Element, anim: AnimatableProps): string {
  const x  = anim.x       ?? el.x
  const y  = anim.y       ?? el.y
  const w  = anim.width   ?? el.width
  const h  = anim.height  ?? el.height
  const rot = anim.rotation ?? el.rotation
  const sx  = (anim.scaleX ?? el.scaleX) * (el.flipX ? -1 : 1)
  const sy  = (anim.scaleY ?? el.scaleY) * (el.flipY ? -1 : 1)
  const oxN = (anim as any).transformOriginX ?? (el as any).transformOrigin?.x ?? 0.5
  const oyN = (anim as any).transformOriginY ?? (el as any).transformOrigin?.y ?? 0.5
  const cx  = x + oxN * w
  const cy  = y + oyN * h
  const parts: string[] = []
  if (rot) parts.push(`rotate(${r(rot)} ${r(cx)} ${r(cy)})`)
  if (sx !== 1 || sy !== 1) {
    parts.push(`translate(${r(cx)} ${r(cy)}) scale(${r(sx)} ${r(sy)}) translate(${r(-cx)} ${r(-cy)})`)
  }
  return parts.join(' ')
}

function makeFilter(el: Element): string {
  const parts: string[] = []
  const shadow = el.shadows.find(s => s.visible)
  if (shadow) {
    const { r: rr, g, b } = hexToRgb(shadow.color)
    parts.push(`drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px rgba(${rr},${g},${b},${shadow.opacity}))`)
  }
  if (el.blur > 0) parts.push(`blur(${el.blur}px)`)
  return parts.join(' ')
}

function wrapG(inner: string, el: Element, anim: AnimatableProps, clipPathId?: string): string {
  const opacity = anim.opacity ?? el.opacity
  const transform = makeTransform(el, anim)
  const filter = makeFilter(el)
  const blend = el.blendMode !== 'normal' ? el.blendMode : ''
  const attrs: string[] = []
  if (opacity !== 1) attrs.push(`opacity="${r(opacity)}"`)
  if (transform) attrs.push(`transform="${transform}"`)
  if (filter) attrs.push(`filter="${filter}"`)
  if (blend) attrs.push(`style="mix-blend-mode:${blend}"`)
  if (clipPathId) attrs.push(`clip-path="url(#${clipPathId})"`)
  const open = attrs.length ? `<g ${attrs.join(' ')}>` : '<g>'
  return `${open}${inner}</g>`
}

function makeCropClipPath(el: Element, anim: AnimatableProps): string {
  const cropRect = el.cropRect
  if (!cropRect) return ''
  const transform = makeTransform(el, anim)
  const transformAttr = transform ? ` transform="${transform}"` : ''
  const x = r((anim.x ?? el.x) + cropRect.x)
  const y = r((anim.y ?? el.y) + cropRect.y)
  return `<clipPath id="crop-${el.id}" clipPathUnits="userSpaceOnUse"><g${transformAttr}><rect x="${x}" y="${y}" width="${r(cropRect.width)}" height="${r(cropRect.height)}"/></g></clipPath>`
}

function makeMaskClipPath(el: Element, _allElements: Element[], anim: AnimatableProps): string {
  const shape = serializeMaskShape(el, anim)
  return `<defs><clipPath id="mask-${el.id}" clipPathUnits="userSpaceOnUse">${shape}</clipPath></defs>`
}

function serializeMaskShape(el: Element, anim: AnimatableProps): string {
  const transform = makeTransform(el, anim)
  const transformAttr = transform ? ` transform="${transform}"` : ''
  const x = r(anim.x ?? el.x), y = r(anim.y ?? el.y)
  const w = r(anim.width ?? el.width), h = r(anim.height ?? el.height)
  switch (el.type) {
    case 'rect': {
      const rx = r((anim as any).rx ?? (el as any).rx ?? 0)
      return `<g${transformAttr}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></g>`
    }
    case 'circle': {
      const rv = r(Math.min(w, h) / 2)
      return `<g${transformAttr}><circle cx="${r(Number(x) + Number(w) / 2)}" cy="${r(Number(y) + Number(h) / 2)}" r="${rv}"/></g>`
    }
    case 'ellipse': {
      return `<g${transformAttr}><ellipse cx="${r(Number(x) + Number(w) / 2)}" cy="${r(Number(y) + Number(h) / 2)}" rx="${r(Number(w) / 2)}" ry="${r(Number(h) / 2)}"/></g>`
    }
    case 'path': {
      const d = (anim as any).d ?? (el as any).d ?? ''
      return d ? `<g${transformAttr}><path d="${d}"/></g>` : ''
    }
    default:
      return `<g${transformAttr}><rect x="${x}" y="${y}" width="${w}" height="${h}"/></g>`
  }
}

// ── Element serializers ───────────────────────────────────────────────────────

function cropId(el: Element): string | undefined {
  return el.cropRect ? `crop-${el.id}` : undefined
}

function serializeRect(el: Element, anim: AnimatableProps): string {
  const e = el as RectElement
  const x = r(anim.x      ?? el.x)
  const y = r(anim.y      ?? el.y)
  const w = r(anim.width  ?? el.width)
  const h = r(anim.height ?? el.height)
  const rx = r(anim.rx    ?? e.rx)
  return wrapG(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${fillStroke(el, anim)}/>`, el, anim, cropId(el))
}

function serializeCircle(el: Element, anim: AnimatableProps): string {
  const x  = anim.x      ?? el.x
  const y  = anim.y      ?? el.y
  const w  = anim.width  ?? el.width
  const h  = anim.height ?? el.height
  const rv = r(Math.min(w, h) / 2)
  const cx = r(x + w / 2)
  const cy = r(y + h / 2)
  return wrapG(`<circle cx="${cx}" cy="${cy}" r="${rv}" ${fillStroke(el, anim)}/>`, el, anim, cropId(el))
}

function serializeEllipse(el: Element, anim: AnimatableProps): string {
  const e  = el as EllipseElement
  const x  = anim.x      ?? e.x
  const y  = anim.y      ?? e.y
  const w  = anim.width  ?? e.width
  const h  = anim.height ?? e.height
  return wrapG(`<ellipse cx="${r(x + w/2)}" cy="${r(y + h/2)}" rx="${r(w/2)}" ry="${r(h/2)}" ${fillStroke(el, anim)}/>`, el, anim, cropId(el))
}

function serializeLine(el: Element, anim: AnimatableProps): string {
  const x = anim.x      ?? el.x
  const y = anim.y      ?? el.y
  const w = anim.width  ?? el.width
  const h = anim.height ?? el.height
  const stroke = getStroke(el, anim)
  const fill   = getFill(el, anim)
  const sc = stroke ? stroke.color : fill.color
  const sw = stroke ? stroke.width : 2
  return wrapG(`<line x1="${r(x)}" y1="${r(y + h/2)}" x2="${r(x + w)}" y2="${r(y + h/2)}" stroke="${sc}" stroke-width="${r(sw)}" stroke-linecap="round"/>`, el, anim, cropId(el))
}

function polygonPts(cx: number, cy: number, radius: number, sides: number): string {
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides - Math.PI / 2
    pts.push(`${r(cx + radius * Math.cos(a))},${r(cy + radius * Math.sin(a))}`)
  }
  return pts.join(' ')
}

function starPts(cx: number, cy: number, outer: number, inner: number, n: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const a = (i * Math.PI) / n - Math.PI / 2
    pts.push(`${r(cx + radius * Math.cos(a))},${r(cy + radius * Math.sin(a))}`)
  }
  return pts.join(' ')
}

function serializePolygon(el: Element, anim: AnimatableProps): string {
  const e  = el as PolygonElement
  const x  = anim.x      ?? el.x
  const y  = anim.y      ?? el.y
  const w  = anim.width  ?? el.width
  const h  = anim.height ?? el.height
  const cx = x + w / 2, cy = y + h / 2
  const rv = Math.min(w, h) / 2
  return wrapG(`<polygon points="${polygonPts(cx, cy, rv, e.sides ?? 6)}" ${fillStroke(el, anim)}/>`, el, anim, cropId(el))
}

function serializeStar(el: Element, anim: AnimatableProps): string {
  const e  = el as StarElement
  const x  = anim.x      ?? el.x
  const y  = anim.y      ?? el.y
  const w  = anim.width  ?? el.width
  const h  = anim.height ?? el.height
  const cx = x + w / 2, cy = y + h / 2
  const outerR = Math.min(w, h) / 2
  const innerR = outerR * (e.innerRadius ?? 0.4)
  return wrapG(`<polygon points="${starPts(cx, cy, outerR, innerR, e.starPoints ?? 5)}" ${fillStroke(el, anim)}/>`, el, anim, cropId(el))
}

function serializeText(el: Element, anim: AnimatableProps): string {
  const e  = el as TextElement
  const x  = r(anim.x ?? el.x)
  const y  = r(anim.y ?? el.y)
  const fs = anim.fontSize ?? e.fontSize
  const fill = getFill(el, anim)
  const foAttrs = fill.opacity !== 1 ? ` fill-opacity="${r(fill.opacity)}"` : ''
  return wrapG(
    `<text x="${x}" y="${r(parseFloat(String(y)) + fs)}" font-family="${esc(e.fontFamily)}" font-size="${fs}" font-weight="${e.fontWeight}" fill="${fill.color}"${foAttrs} letter-spacing="${e.letterSpacing}">${esc(e.text)}</text>`,
    el, anim, cropId(el)
  )
}

function serializePath(el: Element, anim: AnimatableProps): string {
  const e = el as PathElement
  const d = anim.d ?? e.d
  if (!d) return ''
  const fill   = getFill(el, anim)
  const stroke = getStroke(el, anim)
  const fillVal = e.closed ? fill.color : 'none'
  const foAttr  = e.closed && fill.opacity !== 1 ? ` fill-opacity="${r(fill.opacity)}"` : ''
  const sc = stroke ? stroke.color : (e.closed ? 'none' : fill.color)
  const sw = stroke ? stroke.width : 2
  const scAttr = `stroke="${sc}" stroke-width="${r(sw)}" stroke-linecap="round" fill-rule="${e.fillRule}"`
  return wrapG(`<path d="${d}" fill="${fillVal}"${foAttr} ${scAttr}/>`, el, anim, cropId(el))
}

function serializeImage(el: Element, anim: AnimatableProps, imageDataUrls?: Map<string, string>): string {
  const img = el as ImageElement
  const x = r(anim.x      ?? img.x)
  const y = r(anim.y      ?? img.y)
  const w = r(anim.width  ?? img.width)
  const h = r(anim.height ?? img.height)
  const dataUrl = imageDataUrls?.get(img.imageStorageId)
  if (!dataUrl) {
    return wrapG(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111"/>`, el, anim, cropId(el))
  }
  const par = img.objectFit === 'fill' ? 'none' : img.objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'
  return wrapG(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="${dataUrl}" preserveAspectRatio="${par}"/>`, el, anim, cropId(el))
}

function serializeGroup(el: Element, anim: AnimatableProps, allElements: Element[], states: Map<string, AnimatableProps>): string {
  const group = el as GroupElement

  // Figma-style mask group: first child clips all other children
  if (group.hasMask && group.childIds.length >= 1) {
    const maskShapeId = group.childIds[0]
    const maskShape = allElements.find(e => e.id === maskShapeId)
    const maskAnim = maskShape ? states.get(maskShape.id) ?? {} : {}
    const clipDef = maskShape ? makeMaskClipPath(maskShape, allElements, maskAnim) : ''
    const clippedInner = group.childIds.slice(1)
      .map(id => {
        const child = allElements.find(e => e.id === id)
        if (!child || !child.visible) return ''
        return serializeElement(child, states.get(child.id) ?? {}, allElements, states)
      })
      .join('')
    const clippedGroup = clippedInner
      ? `<g clip-path="url(#mask-${maskShapeId})">${clippedInner}</g>`
      : ''
    // The mask shape itself is invisible in the export (its geometry only appears in the clipPath)
    const inner = `${clipDef}${clippedGroup}`
    return wrapG(inner, el, anim)
  }

  const inner = group.childIds
    .map(id => {
      const child = allElements.find(e => e.id === id)
      if (!child || !child.visible) return ''
      return serializeElement(child, states.get(child.id) ?? {}, allElements, states)
    })
    .join('')
  return wrapG(inner, el, anim)
}

// ── Public API ────────────────────────────────────────────────────────────────

export function serializeElement(
  el: Element,
  anim: AnimatableProps,
  allElements?: Element[],
  states?: Map<string, AnimatableProps>,
  imageDataUrls?: Map<string, string>
): string {
  if (!el.visible) return ''
  switch (el.type) {
    case 'rect':     return serializeRect(el, anim)
    case 'circle':   return serializeCircle(el, anim)
    case 'ellipse':  return serializeEllipse(el, anim)
    case 'line':     return serializeLine(el, anim)
    case 'polygon':  return serializePolygon(el, anim)
    case 'star':     return serializeStar(el, anim)
    case 'text':     return serializeText(el, anim)
    case 'path':     return serializePath(el, anim)
    case 'image':    return serializeImage(el, anim, imageDataUrls)
    case 'group':    return allElements ? serializeGroup(el, anim, allElements, states ?? new Map()) : ''
    default:         return ''
  }
}

/**
 * Build a complete SVG string for one frame.
 * @param elements  All scene elements (order = paint order, first = bottom)
 * @param states    Animated props map: elementId → overrides for this frame
 * @param artboard  Canvas dimensions
 * @param background Optional background fill color (default transparent)
 */
export function serializeFrame(
  elements: Element[],
  states: Map<string, AnimatableProps>,
  artboard: { width: number; height: number },
  background?: string,
  imageDataUrls?: Map<string, string>
): string {
  // Compute which elements are group children (should not be rendered at top level)
  const childIds = new Set(
    elements.flatMap(el => el.type === 'group' ? (el as GroupElement).childIds : [])
  )

  // Build <defs> for crop clipPaths at top level (mask clipPaths are inlined by serializeGroup)
  const topLevel = elements.filter(el => el.visible && !childIds.has(el.id))
  const defParts: string[] = []
  for (const el of topLevel) {
    if (el.cropRect) {
      defParts.push(makeCropClipPath(el, states.get(el.id) ?? {}))
    }
  }
  const defs = defParts.length ? `<defs>${defParts.join('')}</defs>` : ''

  const bg = background
    ? `<rect width="${artboard.width}" height="${artboard.height}" fill="${background}"/>`
    : ''

  const shapes = topLevel
    .map(el => serializeElement(el, states.get(el.id) ?? {}, elements, states, imageDataUrls))
    .join('\n')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${artboard.width}" height="${artboard.height}" ` +
    `viewBox="0 0 ${artboard.width} ${artboard.height}">\n` +
    `${defs}\n${bg}\n${shapes}\n</svg>`
  )
}
