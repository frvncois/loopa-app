import type { PathPoint } from '@/types/elements'

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

/**
 * Minimum distance from point (px,py) to a line segment (x0,y0)→(x1,y1).
 */
function distToLine(
  px: number, py: number,
  x0: number, y0: number, x1: number, y1: number
): number {
  const dx = x1 - x0
  const dy = y1 - y0
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return dist(px, py, x0, y0)
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq))
  return dist(px, py, x0 + t * dx, y0 + t * dy)
}

/**
 * Minimum distance from point (px,py) to a cubic bezier curve, using sampling.
 */
function distToCubic(
  px: number, py: number,
  x0: number, y0: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x1: number, y1: number,
  samples = 24
): number {
  let min = Infinity
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const mt = 1 - t
    const bx = mt ** 3 * x0 + 3 * mt ** 2 * t * cp1x + 3 * mt * t ** 2 * cp2x + t ** 3 * x1
    const by = mt ** 3 * y0 + 3 * mt ** 2 * t * cp1y + 3 * mt * t ** 2 * cp2y + t ** 3 * y1
    min = Math.min(min, dist(px, py, bx, by))
  }
  return min
}

/**
 * Returns true if (px, py) is within `threshold` units of the path stroke.
 */
export function pointOnPath(
  px: number, py: number,
  points: PathPoint[],
  closed: boolean,
  threshold = 8
): boolean {
  if (points.length < 2) return false

  const pairs: [PathPoint, PathPoint][] = []
  for (let i = 0; i < points.length - 1; i++) pairs.push([points[i], points[i + 1]])
  if (closed) pairs.push([points[points.length - 1], points[0]])

  for (const [a, b] of pairs) {
    const cp1 = a.handleOut ?? { x: a.x, y: a.y }
    const cp2 = b.handleIn  ?? { x: b.x, y: b.y }
    const d = (!a.handleOut && !b.handleIn)
      ? distToLine(px, py, a.x, a.y, b.x, b.y)
      : distToCubic(px, py, a.x, a.y, cp1.x, cp1.y, cp2.x, cp2.y, b.x, b.y)
    if (d <= threshold) return true
  }
  return false
}

/**
 * Returns the handle that is within `threshold` units of (px, py), or null.
 */
export function pointOnHandle(
  px: number, py: number,
  points: PathPoint[],
  threshold = 6
): { pointId: string; handle: 'in' | 'out' } | null {
  for (const pt of points) {
    if (pt.handleIn  && dist(px, py, pt.handleIn.x,  pt.handleIn.y)  <= threshold)
      return { pointId: pt.id, handle: 'in' }
    if (pt.handleOut && dist(px, py, pt.handleOut.x, pt.handleOut.y) <= threshold)
      return { pointId: pt.id, handle: 'out' }
  }
  return null
}

/**
 * Returns the PathPoint within `threshold` units of (px, py), or null.
 */
export function pointNearPoint(
  px: number, py: number,
  points: PathPoint[],
  threshold = 8
): PathPoint | null {
  for (const pt of points) {
    if (dist(px, py, pt.x, pt.y) <= threshold) return pt
  }
  return null
}
