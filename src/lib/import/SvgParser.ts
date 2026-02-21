import { parseTransformString, type DecomposedTransform } from './TransformDecomposer'

export interface ParsedNode {
  tag: string
  id: string
  attrs: Record<string, string>
  style: Record<string, string>
  transform: DecomposedTransform
  textContent: string
  children: ParsedNode[]
}

export interface ParsedSvg {
  nodes: ParsedNode[]
  viewBox: { x: number; y: number; width: number; height: number }
  width: number
  height: number
  isFigmaExport: boolean
}

function parseStyle(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!styleStr) return result
  for (const decl of styleStr.split(';')) {
    const [prop, ...vals] = decl.split(':')
    if (prop && vals.length) result[prop.trim()] = vals.join(':').trim()
  }
  return result
}

function combineTransforms(parent: DecomposedTransform, child: DecomposedTransform): DecomposedTransform {
  return {
    translateX: parent.translateX + child.translateX * parent.scaleX,
    translateY: parent.translateY + child.translateY * parent.scaleY,
    rotation:   parent.rotation   + child.rotation,
    scaleX:     parent.scaleX     * child.scaleX,
    scaleY:     parent.scaleY     * child.scaleY,
    skewX:      parent.skewX      + child.skewX,
  }
}

const IDENTITY: DecomposedTransform = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0 }

const SHAPE_TAGS = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text'])

function walkElement(el: Element, parentTransform: DecomposedTransform): ParsedNode[] {
  const tag = el.tagName.toLowerCase()

  // Attributes
  const attrs: Record<string, string> = {}
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value
  }

  // Style
  const style = parseStyle(attrs['style'] ?? '')

  // Transform (own + inherited)
  const ownTransform = parseTransformString(attrs['transform'] ?? '')
  const accumulated = combineTransforms(parentTransform, ownTransform)

  if (tag === 'svg') {
    // SVG root: flatten all children
    const children: ParsedNode[] = []
    for (const child of el.children) {
      children.push(...walkElement(child, accumulated))
    }
    return children
  }

  if (tag === 'g') {
    // Collect children with accumulated transforms (absolute canvas positions)
    const childNodes: ParsedNode[] = []
    for (const child of el.children) {
      childNodes.push(...walkElement(child, accumulated))
    }
    if (childNodes.length === 0) return []
    // Single-child <g> (transform wrapper): flatten to avoid unnecessary groups
    if (childNodes.length === 1) return childNodes
    // Multi-child <g>: return as a group node preserving structure
    const groupNode: ParsedNode = {
      tag: 'g',
      id: attrs['id'] ?? '',
      attrs,
      style,
      transform: accumulated,
      textContent: '',
      children: childNodes,
    }
    return [groupNode]
  }

  if (!SHAPE_TAGS.has(tag)) return []

  const node: ParsedNode = {
    tag,
    id: attrs['id'] ?? '',
    attrs,
    style,
    transform: accumulated,
    textContent: tag === 'text' ? el.textContent ?? '' : '',
    children: []
  }

  return [node]
}

export function parseSvgDocument(svgString: string): ParsedSvg {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')

  const errorNode = doc.querySelector('parsererror')
  const svgEl = doc.documentElement

  // Detect Figma export
  const isFigmaExport =
    svgString.includes('Figma') ||
    svgString.includes('figma') ||
    svgEl.getAttribute('xmlns:xlink') !== null

  // ViewBox
  let viewBox = { x: 0, y: 0, width: 800, height: 600 }
  const vb = svgEl.getAttribute('viewBox')
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
    }
  }

  const rawWidth  = parseFloat(svgEl.getAttribute('width')  ?? String(viewBox.width))
  const rawHeight = parseFloat(svgEl.getAttribute('height') ?? String(viewBox.height))

  const nodes: ParsedNode[] = errorNode ? [] : walkElement(svgEl, IDENTITY)

  return {
    nodes,
    viewBox,
    width:  isNaN(rawWidth)  ? viewBox.width  : rawWidth,
    height: isNaN(rawHeight) ? viewBox.height : rawHeight,
    isFigmaExport
  }
}
