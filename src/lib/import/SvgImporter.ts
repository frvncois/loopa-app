import { generateId } from '@/lib/utils/id'
import { rgbToHex } from '@/lib/utils/color'
import type {
  Element, RectElement, CircleElement, EllipseElement, LineElement,
  PathElement, PolygonElement, TextElement, FillEntry, StrokeEntry, ShadowEntry
} from '@/types/elements'
import type { ImportResult, ImportWarning } from '@/types/export'
import { parseSvgDocument, type ParsedNode } from './SvgParser'

// ── Color helpers ───────────────────────────────────────────────────────────

function svgColorToHex(color: string | undefined): string | null {
  if (!color || color === 'none' || color === 'transparent') return null
  color = color.trim()

  // #rrggbb or #rgb
  if (color.startsWith('#')) {
    const h = color.slice(1)
    if (h.length === 3) {
      return h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    }
    if (h.length === 6) return h.toLowerCase()
    if (h.length === 8) return h.slice(0, 6).toLowerCase()
    return null
  }

  // rgb(r, g, b)
  const rgb = color.match(/^rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)/)
  if (rgb) return rgbToHex(+rgb[1], +rgb[2], +rgb[3])

  // rgba(r, g, b, a) — ignore alpha channel
  const rgba = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgba) return rgbToHex(+rgba[1], +rgba[2], +rgba[3])

  // Named colors (common subset)
  const named: Record<string, string> = {
    black: '000000', white: 'ffffff', red: 'ff0000', green: '008000',
    blue: '0000ff', yellow: 'ffff00', orange: 'ffa500', purple: '800080',
    gray: '808080', grey: '808080', transparent: 'null'
  }
  return named[color.toLowerCase()] ?? null
}

function resolveColor(node: ParsedNode, prop: 'fill' | 'stroke'): string | null {
  return svgColorToHex(node.style[prop] ?? node.attrs[prop])
}

function resolveOpacity(node: ParsedNode, prop: 'fill-opacity' | 'stroke-opacity' | 'opacity'): number {
  const raw = node.style[prop] ?? node.attrs[prop]
  return raw ? Math.min(1, Math.max(0, parseFloat(raw))) : 1
}

function makeDefaultFill(color: string): FillEntry {
  return { id: generateId('fill'), visible: true, type: 'solid', color, opacity: 1 }
}

function makeDefaultStroke(): StrokeEntry {
  return { id: generateId('stroke'), visible: false, color: '000000', width: 1, position: 'center', cap: 'butt', join: 'miter', dashArray: [], dashOffset: 0 }
}

function makeDefaultShadow(): ShadowEntry {
  return { id: generateId('shadow'), visible: false, color: '000000', opacity: 0.12, x: 0, y: 4, blur: 8, spread: 0 }
}

function baseProps(node: ParsedNode, overrideName?: string) {
  const fillColor = resolveColor(node, 'fill')
  const strokeColor = resolveColor(node, 'stroke')
  const strokeWidth = parseFloat(node.style['stroke-width'] ?? node.attrs['stroke-width'] ?? '0')

  const fills: FillEntry[] = fillColor
    ? [{ ...makeDefaultFill(fillColor), opacity: resolveOpacity(node, 'fill-opacity') }]
    : []

  const stroke = makeDefaultStroke()
  const strokes: StrokeEntry[] = strokeColor ? [{
    ...stroke,
    visible: true,
    color: strokeColor,
    width: isNaN(strokeWidth) || strokeWidth <= 0 ? 1 : strokeWidth
  }] : [stroke]

  const opacity = resolveOpacity(node, 'opacity')

  return {
    id: generateId('el'),
    name: overrideName ?? (node.id || node.tag),
    rotation: node.transform.rotation,
    scaleX: node.transform.scaleX,
    scaleY: node.transform.scaleY,
    opacity,
    blendMode: 'normal' as const,
    fills,
    strokes,
    shadows: [makeDefaultShadow()],
    blur: 0,
    visible: true,
    locked: false,
    clipContent: false,
    flipX: false,
    flipY: false,
  }
}

// ── Node converters ─────────────────────────────────────────────────────────

function convertRect(node: ParsedNode, warnings: ImportWarning[]): RectElement | null {
  const x = parseFloat(node.attrs['x'] ?? '0') + node.transform.translateX
  const y = parseFloat(node.attrs['y'] ?? '0') + node.transform.translateY
  const w = parseFloat(node.attrs['width'] ?? '0') * node.transform.scaleX
  const h = parseFloat(node.attrs['height'] ?? '0') * node.transform.scaleY
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null
  const rx = parseFloat(node.attrs['rx'] ?? node.attrs['ry'] ?? '0') || 0
  return {
    ...baseProps(node),
    type: 'rect',
    x, y, width: w, height: h,
    rx, ry: rx,
    radiusTopLeft: rx, radiusTopRight: rx, radiusBottomRight: rx, radiusBottomLeft: rx,
    radiusLinked: true
  }
}

function convertCircle(node: ParsedNode): CircleElement | null {
  const r  = parseFloat(node.attrs['r']  ?? '0') * Math.max(node.transform.scaleX, node.transform.scaleY)
  const cx = parseFloat(node.attrs['cx'] ?? '0') + node.transform.translateX
  const cy = parseFloat(node.attrs['cy'] ?? '0') + node.transform.translateY
  if (isNaN(r) || r <= 0) return null
  return { ...baseProps(node), type: 'circle', x: cx - r, y: cy - r, width: r * 2, height: r * 2 }
}

function convertEllipse(node: ParsedNode): EllipseElement | null {
  const rx = parseFloat(node.attrs['rx'] ?? '0') * node.transform.scaleX
  const ry = parseFloat(node.attrs['ry'] ?? '0') * node.transform.scaleY
  const cx = parseFloat(node.attrs['cx'] ?? '0') + node.transform.translateX
  const cy = parseFloat(node.attrs['cy'] ?? '0') + node.transform.translateY
  if (isNaN(rx) || isNaN(ry) || rx <= 0 || ry <= 0) return null
  return { ...baseProps(node), type: 'ellipse', x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }
}

function convertLine(node: ParsedNode): LineElement | null {
  const x1 = parseFloat(node.attrs['x1'] ?? '0') + node.transform.translateX
  const y1 = parseFloat(node.attrs['y1'] ?? '0') + node.transform.translateY
  const x2 = parseFloat(node.attrs['x2'] ?? '0') + node.transform.translateX
  const y2 = parseFloat(node.attrs['y2'] ?? '0') + node.transform.translateY
  const props = baseProps(node)
  // Ensure line has a visible stroke
  if (!props.strokes.some(s => s.visible)) {
    const fillColor = resolveColor(node, 'fill') ?? '4353ff'
    props.strokes = [{ ...makeDefaultStroke(), visible: true, color: fillColor, width: 2 }]
    props.fills = []
  }
  return {
    ...props,
    type: 'line',
    x: x1, y: Math.min(y1, y2),
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1)
  }
}

function convertPath(node: ParsedNode, warnings: ImportWarning[]): PathElement | null {
  const d = (node.attrs['d'] ?? '').trim()
  if (!d) return null

  const fillRule = (node.attrs['fill-rule'] ?? node.style['fill-rule'] ?? 'nonzero') as 'nonzero' | 'evenodd'

  // Apply translation to all path coordinates via SVG transform
  // For simplicity, keep d as-is and adjust x,y via transform
  const tx = node.transform.translateX
  const ty = node.transform.translateY

  // Translate d string if there's a translation
  let finalD = d
  if (tx !== 0 || ty !== 0) {
    // Wrap in a <g transform> effectively by prepending a translate transform
    // For import purposes we embed the translation into the path x,y bounding box
    // and leave d intact — simple approach
    finalD = d
  }

  // Compute rough bounding box from M commands
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const coords = d.matchAll(/[ML]\s*([-\d.]+)[,\s]+([-\d.]+)/g)
  for (const m of coords) {
    const px = +m[1], py = +m[2]
    minX = Math.min(minX, px); maxX = Math.max(maxX, px)
    minY = Math.min(minY, py); maxY = Math.max(maxY, py)
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100 }

  const closed = /z/i.test(d)

  return {
    ...baseProps(node),
    type: 'path',
    x: minX + tx,
    y: minY + ty,
    width:  Math.max(maxX - minX, 1) * node.transform.scaleX,
    height: Math.max(maxY - minY, 1) * node.transform.scaleY,
    points: [],  // populated by PathParser if needed
    closed,
    d: finalD,
    fillRule
  }
}

function polylineToPath(points: string, closed: boolean): string {
  const pairs = points.trim().split(/[\s,]+/)
  if (pairs.length < 2) return ''
  const coords: [number, number][] = []
  for (let i = 0; i < pairs.length - 1; i += 2) {
    coords.push([+pairs[i], +pairs[i + 1]])
  }
  let d = `M ${coords[0][0]} ${coords[0][1]}`
  for (let i = 1; i < coords.length; i++) {
    d += ` L ${coords[i][0]} ${coords[i][1]}`
  }
  if (closed) d += ' Z'
  return d
}

function convertPolygon(node: ParsedNode, closed: boolean): PathElement | null {
  const pts = node.attrs['points'] ?? ''
  const d = polylineToPath(pts, closed)
  if (!d) return null
  return {
    ...baseProps(node),
    type: 'path',
    x: node.transform.translateX, y: node.transform.translateY,
    width: 100, height: 100,
    points: [], closed, d, fillRule: 'nonzero'
  }
}

function convertText(node: ParsedNode): TextElement | null {
  const x = parseFloat(node.attrs['x'] ?? '0') + node.transform.translateX
  const y = parseFloat(node.attrs['y'] ?? '0') + node.transform.translateY
  const fontSize = parseFloat(node.style['font-size'] ?? node.attrs['font-size'] ?? '16')
  const text = node.textContent.trim() || 'Text'
  const fillColor = resolveColor(node, 'fill') ?? '000000'
  return {
    ...baseProps(node),
    type: 'text',
    x, y: y - fontSize,
    width: text.length * fontSize * 0.6,
    height: fontSize * 1.4,
    fills: [makeDefaultFill(fillColor)],
    text,
    fontSize: isNaN(fontSize) ? 16 : fontSize,
    fontFamily: node.style['font-family'] ?? node.attrs['font-family'] ?? 'DM Sans',
    fontWeight: parseInt(node.style['font-weight'] ?? node.attrs['font-weight'] ?? '400') || 400,
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: 'none',
    textDecoration: 'none'
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

export function importSvg(svgString: string): ImportResult {
  const warnings: ImportWarning[] = []
  const { nodes, viewBox, width, height, isFigmaExport } = parseSvgDocument(svgString)

  if (nodes.length === 0) {
    warnings.push({ type: 'empty', message: 'No supported elements found in SVG.' })
    return { elements: [], warnings, metadata: { sourceWidth: width, sourceHeight: height, layerCount: 0, isFigmaExport } }
  }

  const elements: Element[] = []

  for (const node of nodes) {
    let el: Element | null = null

    try {
      switch (node.tag) {
        case 'rect':     el = convertRect(node, warnings); break
        case 'circle':   el = convertCircle(node); break
        case 'ellipse':  el = convertEllipse(node); break
        case 'line':     el = convertLine(node); break
        case 'path':     el = convertPath(node, warnings); break
        case 'polygon':  el = convertPolygon(node, true); break
        case 'polyline': el = convertPolygon(node, false); break
        case 'text':     el = convertText(node); break
        default:
          warnings.push({ type: 'unsupported', message: `Skipped unsupported element: <${node.tag}>` })
      }
    } catch (_e) {
      warnings.push({ type: 'error', message: `Failed to convert <${node.tag}> "${node.id}"` })
    }

    if (el) elements.push(el)
  }

  if (nodes.some(n => n.attrs['fill']?.startsWith('url(') || n.style['fill']?.startsWith('url('))) {
    warnings.push({ type: 'gradient', message: 'Gradients are not supported — fills were simplified to solid colors.' })
  }
  if (nodes.some(n => n.attrs['filter'] || n.style['filter'])) {
    warnings.push({ type: 'filter', message: 'SVG filters were dropped (not supported in Loopa).' })
  }

  return {
    elements,
    warnings,
    metadata: { sourceWidth: width, sourceHeight: height, layerCount: elements.length, isFigmaExport }
  }
}
