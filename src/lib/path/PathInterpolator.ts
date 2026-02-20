import type { PathPoint } from '@/types/elements'
import { generateId } from '@/lib/utils/id'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpHandle(
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null,
  t: number,
  fallbackX: number,
  fallbackY: number
): { x: number; y: number } | null {
  if (!a && !b) return null
  const ax = a ? a.x : fallbackX
  const ay = a ? a.y : fallbackY
  const bx = b ? b.x : fallbackX
  const by = b ? b.y : fallbackY
  return { x: lerp(ax, bx, t), y: lerp(ay, by, t) }
}

/**
 * Interpolate between two PathPoint arrays at t ∈ [0,1].
 * If the arrays differ in length, the shorter one is padded with midpoints.
 */
export function interpolatePathPoints(
  a: PathPoint[],
  b: PathPoint[],
  t: number
): PathPoint[] {
  if (a.length === 0) return b.map(p => ({ ...p }))
  if (b.length === 0) return a.map(p => ({ ...p }))

  const target = Math.max(a.length, b.length)
  const pa = padPoints(a, target)
  const pb = padPoints(b, target)

  return pa.map((ptA, i) => {
    const ptB = pb[i]
    return {
      id: ptA.id,
      x: lerp(ptA.x, ptB.x, t),
      y: lerp(ptA.y, ptB.y, t),
      type: t < 0.5 ? ptA.type : ptB.type,
      handleIn:  lerpHandle(ptA.handleIn,  ptB.handleIn,  t, ptA.x, ptA.y),
      handleOut: lerpHandle(ptA.handleOut, ptB.handleOut, t, ptA.x, ptA.y),
    }
  })
}

/**
 * Pad a PathPoint[] to `target` length by inserting midpoints between existing ones.
 */
function padPoints(points: PathPoint[], target: number): PathPoint[] {
  const result = points.map(p => ({ ...p }))
  while (result.length < target) {
    // Insert midpoint between the two most widely-spaced consecutive points
    let bestIdx = 0
    let bestDist = 0
    for (let i = 0; i < result.length - 1; i++) {
      const dx = result[i + 1].x - result[i].x
      const dy = result[i + 1].y - result[i].y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > bestDist) { bestDist = d; bestIdx = i }
    }
    const a = result[bestIdx]
    const b = result[bestIdx + 1]
    const mid: PathPoint = {
      id: generateId('pp'),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      handleIn: null,
      handleOut: null,
      type: 'corner'
    }
    result.splice(bestIdx + 1, 0, mid)
  }
  return result
}
