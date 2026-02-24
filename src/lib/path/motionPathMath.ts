import type { MotionPathPoint, MotionPath } from '@/types/motionPath'
import { getEasingFn } from '@/lib/engine/Easing'

// ── 1. Control points → SVG d string ─────────────────────────────────────────

export function pointsToSvgPath(points: MotionPathPoint[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cp1x = prev.x + prev.handleOut.x
    const cp1y = prev.y + prev.handleOut.y
    const cp2x = curr.x + curr.handleIn.x
    const cp2y = curr.y + curr.handleIn.y
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`
  }
  return d
}

// ── 4. Get position at t along path (0-1) ────────────────────────────────────

export function getPointOnPath(
  points: MotionPathPoint[],
  t: number
): { x: number; y: number; angle: number } {
  if (points.length === 0) return { x: 0, y: 0, angle: 0 }
  if (points.length === 1) return { x: points[0].x, y: points[0].y, angle: 0 }

  t = Math.max(0, Math.min(1, t))
  const segmentCount = points.length - 1
  const rawSegment = t * segmentCount
  const segIdx = Math.min(Math.floor(rawSegment), segmentCount - 1)
  const localT = rawSegment - segIdx

  const p0 = points[segIdx]
  const p1 = points[segIdx + 1]
  const cp1 = { x: p0.x + p0.handleOut.x, y: p0.y + p0.handleOut.y }
  const cp2 = { x: p1.x + p1.handleIn.x, y: p1.y + p1.handleIn.y }

  const pos = cubicBezier(p0, cp1, cp2, p1, localT)
  const posNext = cubicBezier(p0, cp1, cp2, p1, Math.min(1, localT + 0.001))
  const angle = Math.atan2(posNext.y - pos.y, posNext.x - pos.x) * (180 / Math.PI)

  return { x: pos.x, y: pos.y, angle }
}

function cubicBezier(
  p0: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p1.y,
  }
}

// ── 5. Compute motion path offset at a given frame ───────────────────────────
// Points are stored relative to element center. Returns the (x, y) offset to
// ADD to el.x / el.y to get the rendered top-left position.
// Returns null only when the path has fewer than 2 points.

export function computeMotionPathPosition(
  mp: MotionPath,
  frame: number
): { x: number; y: number; rotation?: number } | null {
  const totalMpFrames = mp.endFrame - mp.startFrame
  if (totalMpFrames <= 0 || mp.points.length < 2) return null

  // Compute normalized t — clamp before/after range
  let t: number
  if (frame <= mp.startFrame) {
    t = 0
  } else if (frame >= mp.endFrame) {
    if (mp.loop) {
      const loopedFrame = mp.startFrame + ((frame - mp.startFrame) % totalMpFrames)
      t = (loopedFrame - mp.startFrame) / totalMpFrames
    } else {
      t = 1
    }
  } else {
    t = (frame - mp.startFrame) / totalMpFrames
  }

  try { t = getEasingFn(mp.easing)(t) } catch { /* fallback to linear */ }

  const pos = getPointOnPath(mp.points, t)
  // pos is relative offset from element center — to get rendered top-left:
  //   rendered_x = el.x + pos.x,  rendered_y = el.y + pos.y
  const result: { x: number; y: number; rotation?: number } = { x: pos.x, y: pos.y }
  if (mp.orientToPath) result.rotation = pos.angle

  return result
}

// ── 6. Bounding box of path points (for viewBox computation) ─────────────────

export function pathPointsBounds(points: MotionPathPoint[]): {
  x: number; y: number; width: number; height: number
} {
  if (points.length === 0) return { x: 0, y: 0, width: 100, height: 50 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pt of points) {
    minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y)
  }
  const pad = 10
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(maxX - minX + pad * 2, 1),
    height: Math.max(maxY - minY + pad * 2, 1),
  }
}
