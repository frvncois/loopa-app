/**
 * FigmaNodeConverter.ts — Converts Figma node trees into Loopa elements.
 *
 * Primary path: RECTANGLE → RectElement, ELLIPSE → CircleElement/EllipseElement,
 *               TEXT → TextElement, VECTOR/BOOLEAN_OPERATION → PathElement,
 *               FRAME/GROUP/COMPONENT/INSTANCE → GroupElement (non-top-level)
 *
 * Top-level FRAME nodes each become a Loopa Frame with their children as Elements.
 *
 * Fallback: complex nodes (masks, etc.) can be exported as SVG via getFileImages
 *           and run through SvgImporter — see useFigmaImport.ts.
 */

import { generateId } from '@/lib/utils/id'
import { rgbToHex } from '@/lib/utils/color'
import type {
  Element, RectElement, CircleElement, EllipseElement,
  TextElement, PathElement, GroupElement, FillEntry, StrokeEntry, ShadowEntry
} from '@/types/elements'
import type { Frame } from '@/types/frame'
import type { ImportResult, ImportWarning } from '@/types/export'
import type { FigmaNode, FigmaFill, FigmaEffect } from './figmaApi'

// ── Color helpers ──────────────────────────────────────────────

function figmaColorToHex(c: { r: number; g: number; b: number }): string {
  return rgbToHex(
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255)
  )
}

function makeFill(figmaFill: FigmaFill, warnings: ImportWarning[]): FillEntry | null {
  if (figmaFill.visible === false) return null
  if (figmaFill.type === 'SOLID' && figmaFill.color) {
    return {
      id: generateId('fill'),
      visible: true,
      type: 'solid',
      color: figmaColorToHex(figmaFill.color),
      opacity: figmaFill.opacity ?? figmaFill.color.a ?? 1,
    }
  }
  if (figmaFill.type === 'GRADIENT_LINEAR' || figmaFill.type === 'GRADIENT_RADIAL') {
    warnings.push({ type: 'gradient', message: `Gradient fill simplified to solid color on "${figmaFill.type}"` })
    // Fall back to transparent placeholder — element will at least be placed correctly
    return { id: generateId('fill'), visible: false, type: 'solid', color: '4353ff', opacity: 1 }
  }
  if (figmaFill.type === 'IMAGE') {
    warnings.push({ type: 'image', message: 'Image fill not supported — fill removed' })
    return null
  }
  return null
}

function makeStroke(node: FigmaNode): StrokeEntry {
  const stroke = node.strokes?.[0]
  const weight = node.strokeWeight ?? 1
  if (stroke && stroke.visible !== false && stroke.color) {
    return {
      id: generateId('stroke'),
      visible: true,
      color: figmaColorToHex(stroke.color),
      width: weight,
      position: 'center',
      cap: 'butt',
      join: 'miter',
      dashArray: [],
      dashOffset: 0,
    }
  }
  return {
    id: generateId('stroke'), visible: false, color: '000000',
    width: 1, position: 'center', cap: 'butt', join: 'miter',
    dashArray: [], dashOffset: 0,
  }
}

function makeEffects(effects: FigmaEffect[] | undefined): {
  shadows: ShadowEntry[],
  blur: number
} {
  let blur = 0
  const shadows: ShadowEntry[] = []

  for (const fx of effects ?? []) {
    if (!fx.visible) continue
    if (fx.type === 'DROP_SHADOW' && fx.color) {
      shadows.push({
        id: generateId('shadow'),
        visible: true,
        color: figmaColorToHex(fx.color),
        opacity: fx.color.a ?? 0.5,
        x: fx.offset?.x ?? 0,
        y: fx.offset?.y ?? 4,
        blur: fx.radius,
        spread: fx.spread ?? 0,
      })
    } else if (fx.type === 'LAYER_BLUR') {
      blur = Math.max(blur, fx.radius)
    }
  }

  if (shadows.length === 0) {
    shadows.push({ id: generateId('shadow'), visible: false, color: '000000', opacity: 0.12, x: 0, y: 4, blur: 8, spread: 0 })
  }

  return { shadows, blur }
}

/** Extract the first solid fill color from a node as a hex string (no '#'). */
function extractSolidFillHex(node: FigmaNode): string | null {
  for (const fill of node.fills ?? []) {
    if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
      return figmaColorToHex(fill.color)
    }
  }
  return null
}

// ── Blend mode map ─────────────────────────────────────────────

const BLEND_MAP: Record<string, string> = {
  NORMAL: 'normal', MULTIPLY: 'multiply', SCREEN: 'screen',
  OVERLAY: 'overlay', DARKEN: 'darken', LIGHTEN: 'lighten',
}

// ── Base props shared by all elements ──────────────────────────

function baseProps(node: FigmaNode, warnings: ImportWarning[], bbox: { x: number; y: number; width: number; height: number }, offsetX: number, offsetY: number) {
  const fills: FillEntry[] = []
  for (const f of node.fills ?? []) {
    const converted = makeFill(f, warnings)
    if (converted) fills.push(converted)
  }

  const { shadows, blur } = makeEffects(node.effects)

  return {
    id: generateId('el'),
    name: node.name || node.type,
    x: bbox.x - offsetX,
    y: bbox.y - offsetY,
    width:  bbox.width,
    height: bbox.height,
    rotation: -(node.rotation ?? 0),   // Figma rotation is CCW, Loopa is CW
    scaleX: 1,
    scaleY: 1,
    opacity: node.opacity ?? 1,
    blendMode: (BLEND_MAP[node.blendMode ?? 'NORMAL'] ?? 'normal') as any,
    fills,
    strokes: [makeStroke(node)],
    shadows,
    blur,
    visible: node.visible !== false,
    locked: false,
    flipX: false,
    flipY: false,
    figmaNodeId: node.id,
  }
}

// ── Node converters ────────────────────────────────────────────

function convertRectangle(node: FigmaNode, warnings: ImportWarning[], offsetX: number, offsetY: number): RectElement | null {
  const bbox = node.absoluteBoundingBox
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null

  const radii = node.rectangleCornerRadii
  const rx = radii ? radii[0] : (node.cornerRadius ?? 0)

  return {
    ...baseProps(node, warnings, bbox, offsetX, offsetY),
    type: 'rect',
    rx, ry: rx,
    radiusTopLeft:     radii ? radii[0] : rx,
    radiusTopRight:    radii ? radii[1] : rx,
    radiusBottomRight: radii ? radii[2] : rx,
    radiusBottomLeft:  radii ? radii[3] : rx,
    radiusLinked: !radii,
  }
}

function convertEllipse(node: FigmaNode, warnings: ImportWarning[], offsetX: number, offsetY: number): CircleElement | EllipseElement | null {
  const bbox = node.absoluteBoundingBox
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null

  const base = baseProps(node, warnings, bbox, offsetX, offsetY)
  if (Math.abs(bbox.width - bbox.height) < 0.5) {
    return { ...base, type: 'circle' }
  }
  return { ...base, type: 'ellipse' }
}

function convertText(node: FigmaNode, warnings: ImportWarning[], offsetX: number, offsetY: number): TextElement | null {
  const bbox = node.absoluteBoundingBox
  if (!bbox) return null

  const style = node.style
  const textAlignMap: Record<string, 'left' | 'center' | 'right'> = {
    LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'left',
  }

  // Text fill — prefer the first fill's color
  const fills: FillEntry[] = []
  for (const f of node.fills ?? []) {
    const converted = makeFill(f, warnings)
    if (converted) { fills.push(converted); break }
  }
  if (fills.length === 0) {
    fills.push({ id: generateId('fill'), visible: true, type: 'solid', color: '000000', opacity: 1 })
  }

  return {
    ...baseProps(node, warnings, bbox, offsetX, offsetY),
    type: 'text',
    fills,
    text: node.characters ?? '',
    fontSize: style?.fontSize ?? 16,
    fontFamily: style?.fontFamily ?? 'DM Sans',
    fontWeight: style?.fontWeight ?? 400,
    textAlign: textAlignMap[style?.textAlignHorizontal ?? 'LEFT'] ?? 'left',
    verticalAlign: 'top',
    lineHeight: style ? (style.lineHeightPx / style.fontSize) : 1.4,
    letterSpacing: style?.letterSpacing ?? 0,
    textTransform: 'none',
    textDecoration: 'none',
  }
}

function convertVector(node: FigmaNode, warnings: ImportWarning[], offsetX: number, offsetY: number): PathElement | null {
  const bbox = node.absoluteBoundingBox
  if (!bbox) return null

  const pathData = node.fillGeometry?.[0] ?? node.strokeGeometry?.[0]
  const d = pathData?.path ?? ''

  return {
    ...baseProps(node, warnings, bbox, offsetX, offsetY),
    type: 'path',
    points: [],
    closed: /z/i.test(d),
    d,
    fillRule: (pathData?.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero') as 'nonzero' | 'evenodd',
  }
}

// ── Recursive element collection ────────────────────────────────

const CONTAINER_TYPES = new Set(['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET', 'SECTION'])
const VECTOR_TYPES    = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE'])
const SKIP_TYPES      = new Set(['SLICE'])

function collectElements(
  node: FigmaNode,
  warnings: ImportWarning[],
  offsetX: number,
  offsetY: number,
  elements: Element[]
): void {
  if (node.visible === false) return
  if (SKIP_TYPES.has(node.type)) return

  if (node.type === 'RECTANGLE') {
    const el = convertRectangle(node, warnings, offsetX, offsetY)
    if (el) elements.push(el)
    return
  }

  if (node.type === 'ELLIPSE') {
    const el = convertEllipse(node, warnings, offsetX, offsetY)
    if (el) elements.push(el)
    return
  }

  if (node.type === 'TEXT') {
    const el = convertText(node, warnings, offsetX, offsetY)
    if (el) elements.push(el)
    return
  }

  if (VECTOR_TYPES.has(node.type)) {
    const el = convertVector(node, warnings, offsetX, offsetY)
    if (el) elements.push(el)
    return
  }

  if (node.type === 'MASK' || node.isMask) {
    warnings.push({ type: 'mask', message: `Mask layer "${node.name}" skipped` })
    return
  }

  if (CONTAINER_TYPES.has(node.type)) {
    const bbox = node.absoluteBoundingBox
    if (!bbox) {
      // No bounding box: flatten as before
      for (const child of node.children ?? []) {
        collectElements(child, warnings, offsetX, offsetY, elements)
      }
      return
    }

    // Collect children using the root offset (absolute canvas coords)
    const childElements: Element[] = []
    for (const child of node.children ?? []) {
      collectElements(child, warnings, offsetX, offsetY, childElements)
    }
    if (childElements.length === 0) return
    if (childElements.length === 1) {
      elements.push(...childElements)
      return
    }

    // Create a GroupElement wrapping the children
    const { shadows: groupShadows, blur: groupBlur } = makeEffects(node.effects)
    const group: GroupElement = {
      id: generateId('el'),
      type: 'group',
      name: node.name || node.type,
      x: bbox.x - offsetX,
      y: bbox.y - offsetY,
      width: bbox.width,
      height: bbox.height,
      rotation: -(node.rotation ?? 0),
      scaleX: 1,
      scaleY: 1,
      opacity: node.opacity ?? 1,
      blendMode: (BLEND_MAP[node.blendMode ?? 'NORMAL'] ?? 'normal') as any,
      fills: [],
      strokes: [makeStroke(node)],
      shadows: groupShadows,
      blur: groupBlur,
      visible: node.visible !== false,
      locked: false,
      flipX: false,
      flipY: false,
      childIds: childElements.map(e => e.id),
      figmaNodeId: node.id,
    }
    elements.push(...childElements)
    elements.push(group)
    return
  }

  // Unknown type
  warnings.push({ type: 'unsupported', message: `Skipped unsupported Figma node type: ${node.type} ("${node.name}")` })
}

// ── Public API ─────────────────────────────────────────────────

export function convertFigmaNodes(
  nodes: Record<string, { document: FigmaNode }>,
  _targetArtboard: { width: number; height: number },
  figmaFileKey?: string
): ImportResult {
  const warnings: ImportWarning[] = []
  const allElements: Element[] = []
  const frames: Frame[] = []
  let frameOrder = 0

  for (const entry of Object.values(nodes)) {
    const root = entry.document
    const bbox = root.absoluteBoundingBox

    // Top-level FRAME nodes → create a Loopa Frame with elements as children
    if (CONTAINER_TYPES.has(root.type) && bbox && bbox.width > 0 && bbox.height > 0) {
      const offsetX = bbox.x
      const offsetY = bbox.y

      // Collect this frame's children as elements (positioned relative to frame origin)
      const frameElements: Element[] = []
      for (const child of root.children ?? []) {
        collectElements(child, warnings, offsetX, offsetY, frameElements)
      }

      // Extract background color from the Figma frame's fills
      const bgHex = extractSolidFillHex(root) ?? 'ffffff'

      // Create the Loopa Frame
      const frame: Frame = {
        id: generateId('frame'),
        name: root.name || 'Frame',
        width:  Math.round(bbox.width),
        height: Math.round(bbox.height),
        backgroundColor: bgHex,
        elements: frameElements.map(e => e.id),
        order: frameOrder++,
        fps: 24,
        totalFrames: 60,
        loop: false,
        direction: 'normal',
        figmaFileKey,
        figmaFrameNodeId: root.id,
      }

      frames.push(frame)
      allElements.push(...frameElements)
    } else {
      // Non-frame root (e.g. a single component, vector, etc.) — treat as flat import
      const offsetX = bbox?.x ?? 0
      const offsetY = bbox?.y ?? 0
      collectElements(root, warnings, offsetX, offsetY, allElements)
    }
  }

  // Deduplicate warnings by message
  const seen = new Set<string>()
  const uniqueWarnings = warnings.filter(w => {
    if (seen.has(w.message)) return false
    seen.add(w.message)
    return true
  })

  const firstFrame = frames[0]
  return {
    frames,
    elements: allElements,
    warnings: uniqueWarnings,
    metadata: {
      sourceWidth:  firstFrame?.width  ?? _targetArtboard.width,
      sourceHeight: firstFrame?.height ?? _targetArtboard.height,
      layerCount:   allElements.length,
      isFigmaExport: true,
    },
  }
}
