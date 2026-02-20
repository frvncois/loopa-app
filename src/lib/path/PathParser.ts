import type { PathPoint } from '@/types/elements'
import { generateId } from '@/lib/utils/id'

/**
 * Parse an SVG d attribute string into PathPoint[].
 * Handles M, L, C, Q, Z commands.
 * Relative commands (m, l, c, q, z) are normalised to absolute.
 */
export function parseSvgPath(d: string): { points: PathPoint[]; closed: boolean } {
  const points: PathPoint[] = []
  if (!d || !d.trim()) return { points, closed: false }

  let closed = false
  let cx = 0
  let cy = 0

  // Tokenise: split on command letters, keep the letter
  const tokens = d.trim().match(/([MLCQZmlcqz])[^MLCQZmlcqz]*/g) ?? []

  for (const token of tokens) {
    const cmd = token[0]
    const upper = cmd.toUpperCase()
    const isRelative = cmd !== upper
    const args = token
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)

    if (upper === 'M') {
      const x = isRelative ? cx + args[0] : args[0]
      const y = isRelative ? cy + args[1] : args[1]
      cx = x; cy = y
      points.push(makeCorner(x, y))
      // M can be followed by implicit L pairs
      for (let i = 2; i < args.length; i += 2) {
        const lx = isRelative ? cx + args[i] : args[i]
        const ly = isRelative ? cy + args[i + 1] : args[i + 1]
        cx = lx; cy = ly
        points.push(makeCorner(lx, ly))
      }
    } else if (upper === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRelative ? cx + args[i] : args[i]
        const y = isRelative ? cy + args[i + 1] : args[i + 1]
        cx = x; cy = y
        points.push(makeCorner(x, y))
      }
    } else if (upper === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = isRelative ? cx + args[i]     : args[i]
        const y1 = isRelative ? cy + args[i + 1] : args[i + 1]
        const x2 = isRelative ? cx + args[i + 2] : args[i + 2]
        const y2 = isRelative ? cy + args[i + 3] : args[i + 3]
        const x  = isRelative ? cx + args[i + 4] : args[i + 4]
        const y  = isRelative ? cy + args[i + 5] : args[i + 5]
        // Attach handleOut to the previous point
        if (points.length > 0) {
          points[points.length - 1].handleOut = { x: x1, y: y1 }
          if (points[points.length - 1].type === 'corner' && points[points.length - 1].handleOut) {
            points[points.length - 1].type = 'smooth'
          }
        }
        cx = x; cy = y
        points.push({
          id: generateId('pp'),
          x, y,
          handleIn: { x: x2, y: y2 },
          handleOut: null,
          type: 'smooth'
        })
      }
    } else if (upper === 'Q') {
      for (let i = 0; i < args.length; i += 4) {
        const qx = isRelative ? cx + args[i]     : args[i]
        const qy = isRelative ? cy + args[i + 1] : args[i + 1]
        const x  = isRelative ? cx + args[i + 2] : args[i + 2]
        const y  = isRelative ? cy + args[i + 3] : args[i + 3]
        // Convert quadratic to cubic approximation (2/3 rule)
        if (points.length > 0) {
          const prev = points[points.length - 1]
          prev.handleOut = {
            x: prev.x + (2 / 3) * (qx - prev.x),
            y: prev.y + (2 / 3) * (qy - prev.y)
          }
        }
        cx = x; cy = y
        points.push({
          id: generateId('pp'),
          x, y,
          handleIn: {
            x: x + (2 / 3) * (qx - x),
            y: y + (2 / 3) * (qy - y)
          },
          handleOut: null,
          type: 'smooth'
        })
      }
    } else if (upper === 'Z') {
      closed = true
    }
  }

  return { points, closed }
}

function makeCorner(x: number, y: number): PathPoint {
  return { id: generateId('pp'), x, y, handleIn: null, handleOut: null, type: 'corner' }
}
