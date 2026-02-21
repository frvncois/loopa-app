import type { Element } from '@/types/elements'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function getBounds(element: Element): Bounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height
  }
}

export function getMultiBounds(elements: Element[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  // Single element: return its own axis-aligned box.
  // The caller (SelectionOverlay) applies the rotation transform separately.
  if (elements.length === 1) return getBounds(elements[0])

  // Multi-element: compute the axis-aligned bounding box of every element's
  // rotated corners so the group box tightly encloses all rotated shapes.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of elements) {
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    const rad = (el.rotation ?? 0) * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const corners = [
      { x: el.x,            y: el.y            },
      { x: el.x + el.width, y: el.y            },
      { x: el.x + el.width, y: el.y + el.height },
      { x: el.x,            y: el.y + el.height },
    ]

    for (const p of corners) {
      const ox = p.x - cx
      const oy = p.y - cy
      const rx = cx + ox * cos - oy * sin
      const ry = cy + ox * sin + oy * cos
      if (rx < minX) minX = rx
      if (rx > maxX) maxX = rx
      if (ry < minY) minY = ry
      if (ry > maxY) maxY = ry
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
