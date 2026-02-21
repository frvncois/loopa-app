import type {
  Element, ElementType,
  RectElement, CircleElement, EllipseElement, LineElement,
  PolygonElement, StarElement, TextElement, PathElement, GroupElement,
  FillEntry, StrokeEntry, ShadowEntry
} from '@/types/elements'
import { generateId } from '@/lib/utils/id'
import { getMultiBounds } from '@/lib/elements/ElementBounds'

const counters: Record<string, number> = {}

function nextName(type: string): string {
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  counters[type] = (counters[type] ?? 0) + 1
  return `${label} ${counters[type]}`
}

function defaultFill(color = '4353ff'): FillEntry {
  return { id: generateId('fill'), visible: true, type: 'solid', color, opacity: 1 }
}

function defaultStroke(): StrokeEntry {
  return {
    id: generateId('stroke'), visible: false, color: '000000', width: 1,
    position: 'center', cap: 'butt', join: 'miter', dashArray: [], dashOffset: 0
  }
}

function defaultShadow(): ShadowEntry {
  return { id: generateId('shadow'), visible: false, color: '000000', opacity: 0.12, x: 0, y: 4, blur: 8, spread: 0 }
}

function base(type: ElementType, x = 200, y = 200, w = 100, h = 100): Omit<Element, 'type'> {
  return {
    id: generateId('el'),
    type,
    name: nextName(type),
    x, y, width: w, height: h,
    rotation: 0, scaleX: 1, scaleY: 1,
    opacity: 1, blendMode: 'normal',
    fills: [defaultFill()],
    strokes: [defaultStroke()],
    shadows: [defaultShadow()],
    blur: 0,
    visible: true, locked: false,
    flipX: false, flipY: false
  }
}

export function createDefaultElement(type: ElementType): Element {
  switch (type) {
    case 'rect': {
      const el: RectElement = {
        ...(base('rect', 200, 200, 100, 100) as any),
        type: 'rect',
        rx: 4, ry: 4,
        radiusTopLeft: 4, radiusTopRight: 4,
        radiusBottomRight: 4, radiusBottomLeft: 4,
        radiusLinked: true
      }
      return el
    }
    case 'circle': {
      const el: CircleElement = {
        ...(base('circle', 200, 200, 100, 100) as any),
        type: 'circle'
      }
      return el
    }
    case 'ellipse': {
      const el: EllipseElement = {
        ...(base('ellipse', 200, 200, 120, 80) as any),
        type: 'ellipse'
      }
      return el
    }
    case 'line': {
      const el: LineElement = {
        ...(base('line', 200, 250, 100, 0) as any),
        type: 'line',
        fills: [],
        strokes: [{ ...defaultStroke(), visible: true, color: 'EDEDF0', width: 2 }]
      }
      return el
    }
    case 'polygon': {
      const el: PolygonElement = {
        ...(base('polygon', 200, 200, 100, 100) as any),
        type: 'polygon',
        sides: 6
      }
      return el
    }
    case 'star': {
      const el: StarElement = {
        ...(base('star', 200, 200, 100, 100) as any),
        type: 'star',
        starPoints: 5,
        innerRadius: 0.4
      }
      return el
    }
    case 'text': {
      const el: TextElement = {
        ...(base('text', 200, 200, 200, 40) as any),
        type: 'text',
        fills: [defaultFill('1a1a2e')],
        text: 'Text',
        fontSize: 24,
        fontFamily: 'DM Sans',
        fontWeight: 400,
        textAlign: 'left',
        verticalAlign: 'top',
        lineHeight: 1.4,
        letterSpacing: 0,
        textTransform: 'none',
        textDecoration: 'none'
      }
      return el
    }
    case 'path': {
      const el: PathElement = {
        ...(base('path', 200, 200, 100, 100) as any),
        type: 'path',
        points: [],
        closed: false,
        d: '',
        fillRule: 'nonzero'
      }
      return el
    }
    case 'group': {
      const el: GroupElement = {
        ...(base('group', 200, 200, 100, 100) as any),
        type: 'group',
        fills: [],
        childIds: []
      }
      return el
    }
  }
}

export function createGroup(childIds: string[], allElements: Element[]): GroupElement {
  const childEls = childIds
    .map(id => allElements.find(e => e.id === id))
    .filter(Boolean) as Element[]
  const bounds = getMultiBounds(childEls)
  return {
    id: generateId('el'),
    type: 'group',
    name: nextName('group'),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    blendMode: 'normal',
    fills: [],
    strokes: [defaultStroke()],
    shadows: [defaultShadow()],
    blur: 0,
    visible: true,
    locked: false,
    flipX: false,
    flipY: false,
    childIds,
  }
}

export function resetCounters(): void {
  Object.keys(counters).forEach(k => delete counters[k])
}
