import type { Element } from '@/types/elements'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function getBounds(element: Element): Bounds {
  // Circle/ellipse are center-based in SVG; our model stores x/y as top-left
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height
  }
}

export function getMultiBounds(elements: Element[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of elements) {
    const b = getBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
