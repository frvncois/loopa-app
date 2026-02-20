import type { PathPoint } from '@/types/elements'

/**
 * Convert a PathPoint[] into an SVG d attribute string.
 *
 * - Corner points with no handles → L (line)
 * - Any point with at least one handle → C (cubic bezier)
 *   cp1 = previous.handleOut ?? previous position (degenerate handle)
 *   cp2 = current.handleIn  ?? current position  (degenerate handle)
 */
export function pathPointsToD(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${r(points[0].x)} ${r(points[0].y)}`

  let d = `M ${r(points[0].x)} ${r(points[0].y)}`

  for (let i = 1; i < points.length; i++) {
    d += segment(points[i - 1], points[i])
  }

  if (closed) {
    d += segment(points[points.length - 1], points[0])
    d += ' Z'
  }

  return d
}

function segment(from: PathPoint, to: PathPoint): string {
  const cp1 = from.handleOut ?? { x: from.x, y: from.y }
  const cp2 = to.handleIn   ?? { x: to.x,   y: to.y   }

  if (!from.handleOut && !to.handleIn) {
    return ` L ${r(to.x)} ${r(to.y)}`
  }
  return ` C ${r(cp1.x)} ${r(cp1.y)} ${r(cp2.x)} ${r(cp2.y)} ${r(to.x)} ${r(to.y)}`
}

/** Round to 3 decimal places for cleaner SVG output */
function r(n: number): string {
  return +n.toFixed(3) + ''
}
